# Test Environment Setup

This guide provides step-by-step instructions for setting up the **Test/Staging** environment in AWS.

> **Prerequisites:** Complete the [Common Setup](./README.md#common-setup) steps before proceeding.

## Environment Configuration

- **Cluster**: `webyalaya-test-backend-app`
- **Service**: `webyalaya-test-backend-task-service`
- **ECR Repository**: `webyalaya-test-backend-app`
- **S3 Bucket**: `webyalaya-test-uploads`
- **CloudWatch Log Group**: `/ecs/webyalaya-test-backend-task`
- **Region**: `us-west-2`
- **Task CPU**: 256 (0.25 vCPU)
- **Task Memory**: 512 MB

---

## Step 1: ECR Repository

Create ECR repository for test environment.

```bash
# Set variables (if not already set)
export AWS_REGION=us-west-2

# Create ECR repository
aws ecr create-repository \
  --repository-name webyalaya-test-backend-app \
  --region $AWS_REGION \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256

echo "✅ Created ECR repository: webyalaya-test-backend-app"

# Get repository URI
TEST_ECR_URI=$(aws ecr describe-repositories \
  --repository-names webyalaya-test-backend-app \
  --region $AWS_REGION \
  --query 'repositories[0].repositoryUri' \
  --output text)

echo "ECR Repository URI: $TEST_ECR_URI"
```

---

## Step 2: CloudWatch Log Group

Create CloudWatch log group for test environment.

```bash
aws logs create-log-group \
  --log-group-name /ecs/webyalaya-test-backend-task \
  --region $AWS_REGION

echo "✅ Created CloudWatch log group: /ecs/webyalaya-test-backend-task"
```

---

## Step 3: S3 Bucket

Create S3 bucket for file uploads in test environment.

```bash
# Create bucket
aws s3 mb s3://webyalaya-test-uploads \
  --region $AWS_REGION

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket webyalaya-test-uploads \
  --versioning-configuration Status=Enabled \
  --region $AWS_REGION

# Block public access (recommended)
aws s3api put-public-access-block \
  --bucket webyalaya-test-uploads \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --region $AWS_REGION

echo "✅ Created S3 bucket: webyalaya-test-uploads"
```

---

## Step 4: Application Load Balancer

Create ALB and target group for test environment.

```bash
# Set variables (from common setup)
# DEFAULT_VPC_ID, SUBNET_1, SUBNET_2, ALB_SG_ID should be set

# Create ALB
TEST_ALB_ARN=$(aws elbv2 create-load-balancer \
  --name webyalaya-test-alb \
  --subnets $SUBNET_1 $SUBNET_2 \
  --security-groups $ALB_SG_ID \
  --scheme internet-facing \
  --ip-address-type ipv4 \
  --type application \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Get ALB DNS name
TEST_ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $TEST_ALB_ARN \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

# Create target group
TEST_TG_ARN=$(aws elbv2 create-target-group \
  --name webyalaya-test-tg \
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

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn $TEST_ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TEST_TG_ARN \
  --region $AWS_REGION

# Enable stickiness
aws elbv2 modify-target-group-attributes \
  --target-group-arn $TEST_TG_ARN \
  --attributes Key=stickiness.enabled,Value=true Key=stickiness.type,Value=lb_cookie Key=stickiness.lb_cookie.duration_seconds,Value=3600 \
  --region $AWS_REGION

echo "✅ Created Test ALB: $TEST_ALB_ARN"
echo "✅ Created Test Target Group: $TEST_TG_ARN"
echo "✅ ALB DNS Name: $TEST_ALB_DNS"
```

**Save the ALB DNS name** - you'll need it for:
- Frontend environment variable: `NEXT_PUBLIC_API_URL`
- Backend CORS configuration: `FRONTEND_URLS`

---

## Step 5: ECS Cluster

Create ECS cluster for test environment.

```bash
aws ecs create-cluster \
  --cluster-name webyalaya-test-backend-app \
  --capacity-providers FARGATE \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
  --region $AWS_REGION

echo "✅ Created Test cluster: webyalaya-test-backend-app"
```

---

## Step 6: Task Definition

Create initial task definition for test environment.

```bash
# Set variables
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-west-2

# Create task definition
cat > test-task-definition.json <<EOF
{
  "family": "webyalaya-test-backend-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "nestjs-container",
      "image": "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/webyalaya-test-backend-app:latest",
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
          "awslogs-group": "/ecs/webyalaya-test-backend-task",
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
  --cli-input-json file://test-task-definition.json \
  --region $AWS_REGION

rm test-task-definition.json

echo "✅ Created Test task definition"
```

**Note:** You'll need to update this task definition with:
- Actual environment variables (see [Environment Variables Guide](../2-environment-variables.md))
- Real image URI after pushing Docker images

---

## Step 7: ECS Service

Create ECS service for test environment.

```bash
# Set variables (from previous steps)
# SUBNET_1, SUBNET_2, ECS_SG_ID, TEST_TG_ARN should be set

aws ecs create-service \
  --cluster webyalaya-test-backend-app \
  --service-name webyalaya-test-backend-task-service \
  --task-definition webyalaya-test-backend-task \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=$TEST_TG_ARN,containerName=nestjs-container,containerPort=3000 \
  --region $AWS_REGION

echo "✅ Created Test service: webyalaya-test-backend-task-service"
```

**Note:** The service will fail initially until you:
1. Push Docker images to ECR
2. Update task definition with environment variables

---

## Step 8: Verify Setup

Verify all resources are created correctly.

```bash
# Verify ECR repository
aws ecr describe-repositories \
  --repository-names webyalaya-test-backend-app \
  --region $AWS_REGION \
  --query 'repositories[0].[repositoryName,repositoryUri]' \
  --output table

# Verify ECS cluster
aws ecs describe-clusters \
  --clusters webyalaya-test-backend-app \
  --region $AWS_REGION \
  --query 'clusters[0].[clusterName,status]' \
  --output table

# Verify ALB
aws elbv2 describe-load-balancers \
  --load-balancer-arns $TEST_ALB_ARN \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].[LoadBalancerName,DNSName,State.Code]' \
  --output table

# Verify S3 bucket
aws s3 ls | grep webyalaya-test-uploads

# Verify CloudWatch log group
aws logs describe-log-groups \
  --log-group-name-prefix /ecs/webyalaya-test \
  --region $AWS_REGION \
  --query 'logGroups[0].logGroupName' \
  --output text
```

---

## Next Steps

After completing this setup:

1. **Push Docker Images:**
   - Build and push images to ECR (see [Deployment Commands Guide](../3-deployment-commands.md))

2. **Configure Environment Variables:**
   - Update task definition with environment variables (see [Environment Variables Guide](../2-environment-variables.md))

3. **Update Frontend:**
   - Set `NEXT_PUBLIC_API_URL` in Vercel to the ALB DNS name (`$TEST_ALB_DNS`)

4. **Test Deployment:**
   - Verify service is running: `aws ecs describe-services --cluster webyalaya-test-backend-app --services webyalaya-test-backend-task-service --region $AWS_REGION`
   - Check logs: `aws logs tail /ecs/webyalaya-test-backend-task --follow --region $AWS_REGION`

---

## Troubleshooting

### Service fails to start
- Check task definition has correct image URI
- Verify IAM roles have correct permissions
- Check CloudWatch logs for errors

### ALB health checks failing
- Verify security groups allow traffic
- Check application is listening on port 3000
- Verify health check path is correct (`/health`)

### Cannot push to ECR
- Verify ECR repository exists
- Authenticate Docker: `aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com`

---

## Related Documentation

- [Common Setup](./README.md)
- [Development Environment Setup](./1-dev.md)
- [Production Environment Setup](./3-prod.md)
- [Environment Variables Configuration](../2-environment-variables.md)
- [Deployment Commands Guide](../3-deployment-commands.md)

