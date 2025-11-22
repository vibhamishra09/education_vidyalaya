# Production Environment Setup

This guide provides step-by-step instructions for setting up the **Production** environment in AWS.

> **Prerequisites:** Complete the [Common Setup](./README.md#common-setup) steps before proceeding.

## Environment Configuration

- **Cluster**: `webyalaya-backend-cluster`
- **Service**: `webyalaya-backend-task-service`
- **ECR Repository**: `webyalaya-backend-app`
- **S3 Bucket**: `webyalaya-prod-uploads`
- **CloudWatch Log Group**: `/ecs/webyalaya-backend-task`
- **Region**: `us-west-2`
- **Task CPU**: 512 (0.5 vCPU)
- **Task Memory**: 1024 MB

---

## Step 1: ECR Repository

Create ECR repository for production environment.

```bash
# Set variables (if not already set)
export AWS_REGION=us-west-2

# Create ECR repository
aws ecr create-repository \
  --repository-name webyalaya-backend-app \
  --region $AWS_REGION \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256

echo "✅ Created ECR repository: webyalaya-backend-app"

# Get repository URI
PROD_ECR_URI=$(aws ecr describe-repositories \
  --repository-names webyalaya-backend-app \
  --region $AWS_REGION \
  --query 'repositories[0].repositoryUri' \
  --output text)

echo "ECR Repository URI: $PROD_ECR_URI"
```

---

## Step 2: CloudWatch Log Group

Create CloudWatch log group for production environment.

```bash
aws logs create-log-group \
  --log-group-name /ecs/webyalaya-backend-task \
  --region $AWS_REGION

# Set log retention to 30 days (optional, but recommended)
aws logs put-retention-policy \
  --log-group-name /ecs/webyalaya-backend-task \
  --retention-in-days 30 \
  --region $AWS_REGION

echo "✅ Created CloudWatch log group: /ecs/webyalaya-backend-task"
```

---

## Step 3: S3 Bucket

Create S3 bucket for file uploads in production environment.

```bash
# Create bucket
aws s3 mb s3://webyalaya-prod-uploads \
  --region $AWS_REGION

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket webyalaya-prod-uploads \
  --versioning-configuration Status=Enabled \
  --region $AWS_REGION

# Block public access (recommended)
aws s3api put-public-access-block \
  --bucket webyalaya-prod-uploads \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --region $AWS_REGION

# Enable lifecycle policy to transition old versions to cheaper storage (optional)
cat > lifecycle-policy.json <<EOF
{
  "Rules": [
    {
      "Id": "TransitionOldVersions",
      "Status": "Enabled",
      "Prefix": "",
      "NoncurrentVersionTransitions": [
        {
          "NoncurrentDays": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "NoncurrentDays": 90,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket webyalaya-prod-uploads \
  --lifecycle-configuration file://lifecycle-policy.json \
  --region $AWS_REGION

rm lifecycle-policy.json

echo "✅ Created S3 bucket: webyalaya-prod-uploads"
```

---

## Step 4: Application Load Balancer

Create ALB and target group for production environment.

```bash
# Set variables (from common setup)
# DEFAULT_VPC_ID, SUBNET_1, SUBNET_2, ALB_SG_ID should be set

# Create ALB
PROD_ALB_ARN=$(aws elbv2 create-load-balancer \
  --name webyalaya-prod-alb \
  --subnets $SUBNET_1 $SUBNET_2 \
  --security-groups $ALB_SG_ID \
  --scheme internet-facing \
  --ip-address-type ipv4 \
  --type application \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Get ALB DNS name
PROD_ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $PROD_ALB_ARN \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

# Create target group
PROD_TG_ARN=$(aws elbv2 create-target-group \
  --name webyalaya-prod-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $DEFAULT_VPC_ID \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region $AWS_REGION \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Create HTTP listener
aws elbv2 create-listener \
  --load-balancer-arn $PROD_ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$PROD_TG_ARN \
  --region $AWS_REGION

# Enable stickiness
aws elbv2 modify-target-group-attributes \
  --target-group-arn $PROD_TG_ARN \
  --attributes Key=stickiness.enabled,Value=true Key=stickiness.type,Value=lb_cookie Key=stickiness.lb_cookie.duration_seconds,Value=3600 \
  --region $AWS_REGION

echo "✅ Created Prod ALB: $PROD_ALB_ARN"
echo "✅ Created Prod Target Group: $PROD_TG_ARN"
echo "✅ ALB DNS Name: $PROD_ALB_DNS"
```

**Save the ALB DNS name** - you'll need it for:
- Frontend environment variable: `NEXT_PUBLIC_API_URL`
- Backend CORS configuration: `FRONTEND_URLS`
- Custom domain configuration (if using Route 53)

---

## Step 5: ECS Cluster

Create ECS cluster for production environment.

```bash
aws ecs create-cluster \
  --cluster-name webyalaya-backend-cluster \
  --capacity-providers FARGATE \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
  --region $AWS_REGION

echo "✅ Created Prod cluster: webyalaya-backend-cluster"
```

---

## Step 6: Task Definition

Create initial task definition for production environment.

```bash
# Set variables
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-west-2

# Create task definition
cat > prod-task-definition.json <<EOF
{
  "family": "webyalaya-backend-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "nestjs-container",
      "image": "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/webyalaya-backend-app:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/webyalaya-backend-task",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "environment": [
        {
          "name": "PORT",
          "value": "3000"
        },
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ]
    }
  ]
}
EOF

aws ecs register-task-definition \
  --cli-input-json file://prod-task-definition.json \
  --region $AWS_REGION

rm prod-task-definition.json

echo "✅ Created Prod task definition"
```

**Note:** For production, consider using AWS Secrets Manager for sensitive values:

```bash
# Example: Update task definition to use Secrets Manager
aws ecs register-task-definition \
  --family webyalaya-backend-task \
  --container-definitions "[{
    \"name\": \"nestjs-container\",
    \"secrets\": [
      {\"name\": \"DATABASE_URL\", \"valueFrom\": \"arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:webyalaya/db-url\"},
      {\"name\": \"CLERK_SECRET_KEY\", \"valueFrom\": \"arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:webyalaya/clerk-secret\"}
    ],
    \"environment\": [
      {\"name\": \"AWS_REGION\", \"value\": \"${AWS_REGION}\"},
      {\"name\": \"PORT\", \"value\": \"3000\"}
    ]
  }]"
```

You'll need to update this task definition with:
- Actual environment variables (see [Environment Variables Guide](../2-environment-variables.md))
- Real image URI after pushing Docker images
- Consider using Secrets Manager for sensitive values

---

## Step 7: ECS Service

Create ECS service for production environment.

```bash
# Set variables (from previous steps)
# SUBNET_1, SUBNET_2, ECS_SG_ID, PROD_TG_ARN should be set

aws ecs create-service \
  --cluster webyalaya-backend-cluster \
  --service-name webyalaya-backend-task-service \
  --task-definition webyalaya-backend-task \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=$PROD_TG_ARN,containerName=nestjs-container,containerPort=3000 \
  --region $AWS_REGION

echo "✅ Created Prod service: webyalaya-backend-task-service"
```

**Note:** The service will fail initially until you:
1. Push Docker images to ECR
2. Update task definition with environment variables

**For production, consider:**
- Setting `desired-count` to 2+ for high availability
- Configuring auto-scaling based on CPU/memory metrics
- Enabling deployment circuit breaker

---

## Step 8: (Optional) Route 53 and SSL

### 8.1 Request SSL Certificate

```bash
# Request certificate (replace with your domain)
aws acm request-certificate \
  --domain-name be.webyalaya.com \
  --subject-alternative-names "*.webyalaya.com" \
  --validation-method DNS \
  --region $AWS_REGION

# Note: You'll need to add DNS validation records to your domain
# Get validation records:
aws acm describe-certificate \
  --certificate-arn <certificate-arn> \
  --region $AWS_REGION \
  --query 'Certificate.DomainValidationOptions[*].[ResourceRecord.Name,ResourceRecord.Value]' \
  --output table
```

### 8.2 Create Route 53 Hosted Zone

```bash
# Create hosted zone
aws route53 create-hosted-zone \
  --name webyalaya.com \
  --caller-reference $(date +%s)

# Get hosted zone ID
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name webyalaya.com \
  --query 'HostedZones[0].Id' \
  --output text | cut -d'/' -f3)

echo "Hosted Zone ID: $HOSTED_ZONE_ID"
```

### 8.3 Create A Record for ALB

```bash
# Get certificate ARN (after validation)
CERT_ARN=$(aws acm list-certificates \
  --region $AWS_REGION \
  --query 'CertificateSummaryList[?DomainName==`be.webyalaya.com`].CertificateArn' \
  --output text)

# Create HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn $PROD_ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$PROD_TG_ARN \
  --region $AWS_REGION

# Create A record pointing to ALB
cat > route53-record.json <<EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "be.webyalaya.com",
        "Type": "A",
        "AliasTarget": {
          "DNSName": "$PROD_ALB_DNS",
          "EvaluateTargetHealth": true,
          "HostedZoneId": "Z1D633PJN98FT9"
        }
      }
    }
  ]
}
EOF

# Get ALB hosted zone ID (us-west-2 region)
ALB_HOSTED_ZONE_ID="Z1D633PJN98FT9"

cat > route53-record.json <<EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "be.webyalaya.com",
        "Type": "A",
        "AliasTarget": {
          "DNSName": "$PROD_ALB_DNS",
          "EvaluateTargetHealth": true,
          "HostedZoneId": "$ALB_HOSTED_ZONE_ID"
        }
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file://route53-record.json

rm route53-record.json

echo "✅ Created Route 53 A record for be.webyalaya.com"
```

---

## Step 9: Verify Setup

Verify all resources are created correctly.

```bash
# Verify ECR repository
aws ecr describe-repositories \
  --repository-names webyalaya-backend-app \
  --region $AWS_REGION \
  --query 'repositories[0].[repositoryName,repositoryUri]' \
  --output table

# Verify ECS cluster
aws ecs describe-clusters \
  --clusters webyalaya-backend-cluster \
  --region $AWS_REGION \
  --query 'clusters[0].[clusterName,status]' \
  --output table

# Verify ALB
aws elbv2 describe-load-balancers \
  --load-balancer-arns $PROD_ALB_ARN \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].[LoadBalancerName,DNSName,State.Code]' \
  --output table

# Verify S3 bucket
aws s3 ls | grep webyalaya-prod-uploads

# Verify CloudWatch log group
aws logs describe-log-groups \
  --log-group-name-prefix /ecs/webyalaya-backend \
  --region $AWS_REGION \
  --query 'logGroups[0].logGroupName' \
  --output text
```

---

## Step 10: Production Best Practices

### 10.1 Enable Auto Scaling (Recommended)

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/webyalaya-backend-cluster/webyalaya-backend-task-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 1 \
  --max-capacity 5 \
  --region $AWS_REGION

# Create scaling policy based on CPU
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/webyalaya-backend-cluster/webyalaya-backend-task-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling-policy \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }' \
  --region $AWS_REGION

echo "✅ Configured auto-scaling for production service"
```

### 10.2 Enable Deployment Circuit Breaker

```bash
# Update service with circuit breaker
aws ecs update-service \
  --cluster webyalaya-backend-cluster \
  --service webyalaya-backend-task-service \
  --deployment-configuration "{
    \"deploymentCircuitBreaker\": {
      \"enable\": true,
      \"rollback\": true
    }
  }" \
  --region $AWS_REGION

echo "✅ Enabled deployment circuit breaker"
```

### 10.3 Set Up CloudWatch Alarms

```bash
# Create alarm for high CPU
aws cloudwatch put-metric-alarm \
  --alarm-name webyalaya-prod-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --region $AWS_REGION

echo "✅ Created CloudWatch alarm for high CPU"
```

---

## Next Steps

After completing this setup:

1. **Push Docker Images:**
   - Build and push images to ECR (see [Deployment Commands Guide](../3-deployment-commands.md))

2. **Configure Environment Variables:**
   - Update task definition with environment variables (see [Environment Variables Guide](../2-environment-variables.md))
   - **Use AWS Secrets Manager for sensitive values in production**

3. **Update Frontend:**
   - Set `NEXT_PUBLIC_API_URL` in Vercel to the ALB DNS name or custom domain (`be.webyalaya.com`)

4. **Test Deployment:**
   - Verify service is running: `aws ecs describe-services --cluster webyalaya-backend-cluster --services webyalaya-backend-task-service --region $AWS_REGION`
   - Check logs: `aws logs tail /ecs/webyalaya-backend-task --follow --region $AWS_REGION`

5. **Monitor:**
   - Set up CloudWatch dashboards
   - Configure alerts for errors and high resource usage
   - Review logs regularly

---

## Troubleshooting

### Service fails to start
- Check task definition has correct image URI
- Verify IAM roles have correct permissions
- Check CloudWatch logs for errors
- Verify Secrets Manager secrets exist (if using)

### ALB health checks failing
- Verify security groups allow traffic
- Check application is listening on port 3000
- Verify health check path is correct (`/health`)

### Cannot push to ECR
- Verify ECR repository exists
- Authenticate Docker: `aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com`

### SSL Certificate issues
- Verify DNS validation records are added
- Check certificate is in `us-west-2` region (same as ALB)
- Ensure certificate is validated before creating HTTPS listener

---

## Related Documentation

- [Common Setup](./README.md)
- [Development Environment Setup](./1-dev.md)
- [Test Environment Setup](./2-test.md)
- [Environment Variables Configuration](../2-environment-variables.md)
- [Deployment Commands Guide](../3-deployment-commands.md)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)

