# Deployment Commands and Manual Deployment Guide

This document provides template commands for managing environment variables and step-by-step instructions for manual deployments across different environments.

## Table of Contents

- [Template Commands for Environment Variables](#template-commands-for-environment-variables)
- [Manual Deployment Steps](#manual-deployment-steps)
- [Deployment Scripts](#deployment-scripts)

---

## Template Commands for Environment Variables

### Backend Environment Variables (AWS ECS)

#### Development Environment

**Update Task Definition with Environment Variables:**

```bash
# Set variables
export AWS_REGION=us-west-2
export ECR_REPOSITORY=webyalaya-dev-backend-app
export TASK_FAMILY=webyalaya-dev-backend-task
export CLUSTER=webyalaya-dev-backend-cluster
export SERVICE=webyalaya-dev-backend-task-service
export CONTAINER_NAME="webyalaya-dev-backend-container"

# Get current task definition
aws ecs describe-task-definition \
  --task-definition $TASK_FAMILY \
  --region $AWS_REGION \
  --query 'taskDefinition' > task-definition-dev.json

# Update task definition with environment variables
aws ecs register-task-definition \
  --family $TASK_FAMILY \
  --region $AWS_REGION \
  --container-definitions "[{
    \"name\": \"$CONTAINER_NAME\",
    \"image\": \"<account-id>.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest\",
    \"portMappings\": [{\"containerPort\": 3000, \"protocol\": \"tcp\"}],
    \"environment\": [
      {\"name\": \"DATABASE_URL\", \"value\": \"postgresql://user:password@dev-db-host:5432/webyalaya_dev\"},
      {\"name\": \"CLERK_SECRET_KEY\", \"value\": \"sk_test_...\"},
      {\"name\": \"CLERK_PUBLISHABLE_KEY\", \"value\": \"pk_test_...\"},
      {\"name\": \"CLERK_JWT_KEY\", \"value\": \"-----BEGIN PUBLIC KEY-----...\"},
      {\"name\": \"AWS_REGION\", \"value\": \"$AWS_REGION\"},
      {\"name\": \"AWS_ACCESS_KEY_ID\", \"value\": \"AKIA...\"},
      {\"name\": \"AWS_SECRET_ACCESS_KEY\", \"value\": \"...\"},
      {\"name\": \"AWS_S3_BUCKET_NAME\", \"value\": \"webyalaya-dev-uploads\"},
      {\"name\": \"LIVEKIT_API_KEY\", \"value\": \"API...\"},
      {\"name\": \"LIVEKIT_API_SECRET\", \"value\": \"secret...\"},
      {\"name\": \"FRONTEND_URLS\", \"value\": \"https://webyalaya-dev.vercel.app,http://localhost:3000\"},
      {\"name\": \"PORT\", \"value\": \"3000\"},
      {\"name\": \"NODE_ENV\", \"value\": \"development\"}
    ],
    \"logConfiguration\": {
      \"logDriver\": \"awslogs\",
      \"options\": {
        \"awslogs-group\": \"/ecs/$TASK_FAMILY\",
        \"awslogs-region\": \"$AWS_REGION\",
        \"awslogs-stream-prefix\": \"ecs\"
      }
    }
  }]" \
  --requires-compatibilities FARGATE \
  --cpu "256" \
  --memory "512" \
  --network-mode awsvpc \
  --execution-role-arn arn:aws:iam::<account-id>:role/ecsTaskExecutionRole \
  --task-role-arn arn:aws:iam::<account-id>:role/ecsTaskRole

# Update service to use new task definition
aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE \
  --task-definition $TASK_FAMILY \
  --region $AWS_REGION \
  --force-new-deployment
```

#### Test Environment

```bash
# Set variables
export AWS_REGION=us-west-2
export ECR_REPOSITORY=webyalaya-test-backend-app
export TASK_FAMILY=webyalaya-test-backend-task
export CLUSTER=webyalaya-test-backend-app
export SERVICE=webyalaya-test-backend-task-service
export CONTAINER_NAME="webyalaya-test-backend-container"

# Register task definition
aws ecs register-task-definition \
  --family $TASK_FAMILY \
  --region $AWS_REGION \
  --container-definitions "[{
    \"name\": \"$CONTAINER_NAME\",
    \"image\": \"<account-id>.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest\",
    \"portMappings\": [{\"containerPort\": 3000, \"protocol\": \"tcp\"}],
    \"environment\": [
      {\"name\": \"DATABASE_URL\", \"value\": \"postgresql://user:password@test-db-host:5432/webyalaya_test\"},
      {\"name\": \"CLERK_SECRET_KEY\", \"value\": \"sk_test_...\"},
      {\"name\": \"CLERK_PUBLISHABLE_KEY\", \"value\": \"pk_test_...\"},
      {\"name\": \"CLERK_JWT_KEY\", \"value\": \"-----BEGIN PUBLIC KEY-----...\"},
      {\"name\": \"AWS_REGION\", \"value\": \"$AWS_REGION\"},
      {\"name\": \"AWS_ACCESS_KEY_ID\", \"value\": \"AKIA...\"},
      {\"name\": \"AWS_SECRET_ACCESS_KEY\", \"value\": \"...\"},
      {\"name\": \"AWS_S3_BUCKET_NAME\", \"value\": \"webyalaya-test-uploads\"},
      {\"name\": \"LIVEKIT_API_KEY\", \"value\": \"API...\"},
      {\"name\": \"LIVEKIT_API_SECRET\", \"value\": \"secret...\"},
      {\"name\": \"FRONTEND_URLS\", \"value\": \"https://webyalaya-test.vercel.app,https://test.webyalaya.com\"},
      {\"name\": \"PORT\", \"value\": \"3000\"},
      {\"name\": \"NODE_ENV\", \"value\": \"production\"}
    ],
    \"logConfiguration\": {
      \"logDriver\": \"awslogs\",
      \"options\": {
        \"awslogs-group\": \"/ecs/$TASK_FAMILY\",
        \"awslogs-region\": \"$AWS_REGION\",
        \"awslogs-stream-prefix\": \"ecs\"
      }
    }
  }]" \
  --requires-compatibilities FARGATE \
  --cpu "256" \
  --memory "512" \
  --network-mode awsvpc \
  --execution-role-arn arn:aws:iam::<account-id>:role/ecsTaskExecutionRole \
  --task-role-arn arn:aws:iam::<account-id>:role/ecsTaskRole

# Update service
aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE \
  --task-definition $TASK_FAMILY \
  --region $AWS_REGION \
  --force-new-deployment
```

#### Production Environment

```bash
# Set variables
export AWS_REGION=us-west-2
export ECR_REPOSITORY=webyalaya-backend-app
export TASK_FAMILY=webyalaya-backend-task
export CLUSTER=webyalaya-backend-cluster
export SERVICE=webyalaya-backend-task-service
export CONTAINER_NAME="webyalaya-backend-container"

# Register task definition
aws ecs register-task-definition \
  --family $TASK_FAMILY \
  --region $AWS_REGION \
  --container-definitions "[{
    \"name\": \"$CONTAINER_NAME\",
    \"image\": \"<account-id>.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest\",
    \"portMappings\": [{\"containerPort\": 3000, \"protocol\": \"tcp\"}],
    \"environment\": [
      {\"name\": \"DATABASE_URL\", \"value\": \"postgresql://user:password@prod-db-host:5432/webyalaya_prod\"},
      {\"name\": \"CLERK_SECRET_KEY\", \"value\": \"sk_live_...\"},
      {\"name\": \"CLERK_PUBLISHABLE_KEY\", \"value\": \"pk_live_...\"},
      {\"name\": \"CLERK_JWT_KEY\", \"value\": \"-----BEGIN PUBLIC KEY-----...\"},
      {\"name\": \"AWS_REGION\", \"value\": \"$AWS_REGION\"},
      {\"name\": \"AWS_ACCESS_KEY_ID\", \"value\": \"AKIA...\"},
      {\"name\": \"AWS_SECRET_ACCESS_KEY\", \"value\": \"...\"},
      {\"name\": \"AWS_S3_BUCKET_NAME\", \"value\": \"webyalaya-prod-uploads\"},
      {\"name\": \"LIVEKIT_API_KEY\", \"value\": \"API...\"},
      {\"name\": \"LIVEKIT_API_SECRET\", \"value\": \"secret...\"},
      {\"name\": \"FRONTEND_URLS\", \"value\": \"https://webyalaya.com,https://www.webyalaya.com\"},
      {\"name\": \"PORT\", \"value\": \"3000\"},
      {\"name\": \"NODE_ENV\", \"value\": \"production\"}
    ],
    \"logConfiguration\": {
      \"logDriver\": \"awslogs\",
      \"options\": {
        \"awslogs-group\": \"/ecs/$TASK_FAMILY\",
        \"awslogs-region\": \"$AWS_REGION\",
        \"awslogs-stream-prefix\": \"ecs\"
      }
    }
  }]" \
  --requires-compatibilities FARGATE \
  --cpu "512" \
  --memory "1024" \
  --network-mode awsvpc \
  --execution-role-arn arn:aws:iam::<account-id>:role/ecsTaskExecutionRole \
  --task-role-arn arn:aws:iam::<account-id>:role/ecsTaskRole

# Update service
aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE \
  --task-definition $TASK_FAMILY \
  --region $AWS_REGION \
  --force-new-deployment
```

**Note:** For production, consider using AWS Secrets Manager for sensitive values:

```bash
# Using Secrets Manager
aws ecs register-task-definition \
  --family $TASK_FAMILY \
  --container-definitions "[{
    \"name\": \"$CONTAINER_NAME\",
    \"secrets\": [
      {\"name\": \"DATABASE_URL\", \"valueFrom\": \"arn:aws:secretsmanager:$AWS_REGION:<account-id>:secret:webyalaya/db-url\"},
      {\"name\": \"CLERK_SECRET_KEY\", \"valueFrom\": \"arn:aws:secretsmanager:$AWS_REGION:<account-id>:secret:webyalaya/clerk-secret\"}
    ],
    \"environment\": [
      {\"name\": \"AWS_REGION\", \"value\": \"$AWS_REGION\"},
      {\"name\": \"PORT\", \"value\": \"3000\"}
    ]
  }]"
```

---

### Frontend Environment Variables (Vercel)

#### Development Environment

```bash
# Set variables
export VERCEL_PROJECT_ID=<dev-project-id>
export VERCEL_ORG_ID=<org-id>

# Set environment variables
vercel env add NEXT_PUBLIC_API_URL preview <<< "https://dev-alb-dns.us-west-2.elb.amazonaws.com"
vercel env add NEXT_PUBLIC_CHAT_WS_URL preview <<< "wss://dev-alb-dns.us-west-2.elb.amazonaws.com"
vercel env add NEXT_PUBLIC_LIVEKIT_WS_URL preview <<< "wss://dev-livekit-server.com"
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY preview <<< "pk_test_..."
vercel env add CLERK_SECRET_KEY preview <<< "sk_test_..."
vercel env add CLERK_WEBHOOK_SECRET preview <<< "whsec_..."
vercel env add BACKEND_URL preview <<< "https://dev-alb-dns.us-west-2.elb.amazonaws.com"

# Or set all at once using a script
cat <<EOF | while read var value; do
  echo "$value" | vercel env add "$var" preview
done <<ENV
NEXT_PUBLIC_API_URL https://dev-alb-dns.us-west-2.elb.amazonaws.com
NEXT_PUBLIC_CHAT_WS_URL wss://dev-alb-dns.us-west-2.elb.amazonaws.com
NEXT_PUBLIC_LIVEKIT_WS_URL wss://dev-livekit-server.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY pk_test_...
CLERK_SECRET_KEY sk_test_...
CLERK_WEBHOOK_SECRET whsec_...
BACKEND_URL https://dev-alb-dns.us-west-2.elb.amazonaws.com
ENV
EOF
```

#### Test Environment

```bash
# Set environment variables for test/preview
vercel env add NEXT_PUBLIC_API_URL preview <<< "https://test-alb-dns.us-west-2.elb.amazonaws.com"
vercel env add NEXT_PUBLIC_CHAT_WS_URL preview <<< "wss://test-alb-dns.us-west-2.elb.amazonaws.com"
vercel env add NEXT_PUBLIC_LIVEKIT_WS_URL preview <<< "wss://test-livekit-server.com"
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY preview <<< "pk_test_..."
vercel env add CLERK_SECRET_KEY preview <<< "sk_test_..."
vercel env add CLERK_WEBHOOK_SECRET preview <<< "whsec_..."
vercel env add BACKEND_URL preview <<< "https://test-alb-dns.us-west-2.elb.amazonaws.com"
```

#### Production Environment

```bash
# Set environment variables for production
vercel env add NEXT_PUBLIC_API_URL production <<< "https://be.webyalaya.com"
vercel env add NEXT_PUBLIC_CHAT_WS_URL production <<< "wss://be.webyalaya.com"
vercel env add NEXT_PUBLIC_LIVEKIT_WS_URL production <<< "wss://livekit.webyalaya.com"
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production <<< "pk_live_..."
vercel env add CLERK_SECRET_KEY production <<< "sk_live_..."
vercel env add CLERK_WEBHOOK_SECRET production <<< "whsec_..."
vercel env add BACKEND_URL production <<< "https://be.webyalaya.com"
```

**View current environment variables:**

```bash
# List all environment variables
vercel env ls

# View specific variable
vercel env pull .env.local
```

**Remove environment variable:**

```bash
vercel env rm NEXT_PUBLIC_API_URL production
```

---

## Manual Deployment Steps

### Backend Manual Deployment (AWS ECS)

#### Prerequisites
- AWS CLI installed and configured
- Docker installed
- Access to AWS account with ECS permissions
- ECR repository created
- ECS cluster and service created

#### Step 1: Build Docker Image Locally

```bash
# Navigate to backend directory
cd backend

# Build Docker image
docker build -t webyalaya-backend:local .

# Test locally (optional)
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  -e CLERK_SECRET_KEY="sk_test_..." \
  webyalaya-backend:local
```

#### Step 2: Authenticate Docker to ECR

```bash
# Set variables
export AWS_REGION=us-west-2
export AWS_ACCOUNT_ID=<your-account-id>
export ECR_REPOSITORY=webyalaya-backend-app  # Change for dev/test/prod

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

#### Step 3: Tag and Push Image to ECR

**For Development:**
```bash
export ECR_REPOSITORY=webyalaya-dev-backend-app
export IMAGE_TAG=dev-$(git rev-parse --short HEAD)

# Tag image
docker tag webyalaya-backend:local \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG

docker tag webyalaya-backend:local \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest

# Push images
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest
```

**For Test:**
```bash
export ECR_REPOSITORY=webyalaya-test-backend-app
export IMAGE_TAG=test-$(git rev-parse --short HEAD)

docker tag webyalaya-backend:local \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG

docker tag webyalaya-backend:local \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest

docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest
```

**For Production:**
```bash
export ECR_REPOSITORY=webyalaya-backend-app
export IMAGE_TAG=$(git rev-parse --short HEAD)

docker tag webyalaya-backend:local \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG

docker tag webyalaya-backend:local \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest

docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest
```

#### Step 4: Update ECS Task Definition

**Option A: Update via AWS Console**
1. Go to ECS → Task Definitions
2. Select your task definition
3. Click "Create new revision"
4. Update the image URI to the new image tag
5. Update environment variables if needed
6. Click "Create"

**Option B: Update via AWS CLI**

```bash
# Set variables
export CLUSTER=webyalaya-backend-cluster  # Change for dev/test
export SERVICE=webyalaya-backend-task-service  # Change for dev/test
export TASK_FAMILY=webyalaya-backend-task  # Change for dev/test
export IMAGE_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG

# Get current task definition
aws ecs describe-task-definition \
  --task-definition $TASK_FAMILY \
  --region $AWS_REGION \
  --query 'taskDefinition' > current-task-def.json

# Update image in task definition (using jq)
cat current-task-def.json | \
  jq --arg IMAGE "$IMAGE_URI" '.containerDefinitions[0].image = $IMAGE' | \
  jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)' > new-task-def.json

# Register new task definition
aws ecs register-task-definition \
  --cli-input-json file://new-task-def.json \
  --region $AWS_REGION

# Update service to use new task definition
aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE \
  --task-definition $TASK_FAMILY \
  --region $AWS_REGION \
  --force-new-deployment
```

#### Step 5: Monitor Deployment

```bash
# Check service status
aws ecs describe-services \
  --cluster $CLUSTER \
  --services $SERVICE \
  --region $AWS_REGION

# View running tasks
aws ecs list-tasks \
  --cluster $CLUSTER \
  --service-name $SERVICE \
  --region $AWS_REGION

# View task logs
aws logs tail /ecs/$TASK_FAMILY \
  --follow \
  --region $AWS_REGION
```

---

### Frontend Manual Deployment (Vercel)

#### Prerequisites
- Vercel CLI installed (`npm i -g vercel`)
- Vercel account and project created
- Environment variables configured in Vercel

#### Step 1: Install Vercel CLI (if not installed)

```bash
npm install -g vercel
```

#### Step 2: Login to Vercel

```bash
vercel login
```

#### Step 3: Link Project (if not already linked)

```bash
cd my-app
vercel link
# Follow prompts to select organization and project
```

#### Step 4: Deploy

**Development/Preview Deployment:**
```bash
cd my-app

# Deploy to preview (creates preview URL)
vercel

# Deploy to specific branch
vercel --prod=false

# Deploy with specific environment
vercel --env=preview
```

**Production Deployment:**
```bash
cd my-app

# Deploy to production
vercel --prod

# Or explicitly
vercel --prod --yes
```

#### Step 5: Verify Deployment

```bash
# List deployments
vercel ls

# View deployment details
vercel inspect <deployment-url>

# View logs
vercel logs <deployment-url>
```

#### Step 6: Rollback (if needed)

```bash
# List previous deployments
vercel ls

# Promote a previous deployment to production
vercel promote <deployment-url>
```

---

## Deployment Scripts

### Backend Deployment Script

Create a file `deploy-backend.sh`:

```bash
#!/bin/bash
# deploy-backend.sh

set -e

ENVIRONMENT=${1:-dev}  # dev, test, or prod
AWS_REGION=us-west-2
AWS_ACCOUNT_ID=<your-account-id>

# Set environment-specific variables
case $ENVIRONMENT in
  dev)
    ECR_REPOSITORY=webyalaya-dev-backend-app
    CLUSTER=webyalaya-dev-backend-cluster
    SERVICE=webyalaya-dev-backend-task-service
    TASK_FAMILY=webyalaya-dev-backend-task
    IMAGE_TAG=dev-$(git rev-parse --short HEAD)
    ;;
  test)
    ECR_REPOSITORY=webyalaya-test-backend-app
    CLUSTER=webyalaya-test-backend-app
    SERVICE=webyalaya-test-backend-task-service
    TASK_FAMILY=webyalaya-test-backend-task
    IMAGE_TAG=test-$(git rev-parse --short HEAD)
    ;;
  prod)
    ECR_REPOSITORY=webyalaya-backend-app
    CLUSTER=webyalaya-backend-cluster
    SERVICE=webyalaya-backend-task-service
    TASK_FAMILY=webyalaya-backend-task
    IMAGE_TAG=$(git rev-parse --short HEAD)
    ;;
  *)
    echo "Invalid environment. Use: dev, test, or prod"
    exit 1
    ;;
esac

echo "🚀 Deploying backend to $ENVIRONMENT environment..."

# Build image
cd backend
echo "📦 Building Docker image..."
docker build -t webyalaya-backend:local .

# Login to ECR
echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Tag and push
echo "🏷️  Tagging and pushing image..."
docker tag webyalaya-backend:local \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG

if [ "$ENVIRONMENT" = "prod" ]; then
  docker tag webyalaya-backend:local \
    $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest
  docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest
else
  docker tag webyalaya-backend:local \
    $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:${ENVIRONMENT}-latest
  docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:${ENVIRONMENT}-latest
fi

docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG

# Update ECS service
echo "🔄 Updating ECS service..."
aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE \
  --task-definition $TASK_FAMILY \
  --region $AWS_REGION \
  --force-new-deployment \
  --query 'service.deployments[0].id' \
  --output text

echo "✅ Deployment initiated! Monitor progress in AWS Console."
echo "📊 View logs: aws logs tail /ecs/$TASK_FAMILY --follow --region $AWS_REGION"
```

### Frontend Deployment Script

Create a file `deploy-frontend.sh`:

```bash
#!/bin/bash
# deploy-frontend.sh

set -e

ENVIRONMENT=${1:-preview}  # preview or production

cd my-app

echo "🚀 Deploying frontend to $ENVIRONMENT..."

if [ "$ENVIRONMENT" = "production" ]; then
  vercel --prod --yes
else
  vercel --yes
fi

echo "✅ Frontend deployed successfully!"
vercel ls
```

### Usage

```bash
# Backend
chmod +x deploy-backend.sh
./deploy-backend.sh dev    # Deploy to dev
./deploy-backend.sh test   # Deploy to test
./deploy-backend.sh prod   # Deploy to production

# Frontend
chmod +x deploy-frontend.sh
./deploy-frontend.sh preview     # Deploy preview
./deploy-frontend.sh production  # Deploy production
```

---

## Related Documentation

- [AWS Account Setup Guide](./04-aws-account-setup/README.md)
- [Environment Variables Configuration](./2-environment-variables.md)
- [GitHub Actions Workflows](./1-github-workflows.md)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)

