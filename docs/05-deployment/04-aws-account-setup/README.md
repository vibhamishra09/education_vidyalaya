# AWS Account Setup Guide

This guide provides step-by-step instructions for setting up Development, Test, and Production environments in a new AWS account for the WebYalaya application.

## Overview

This setup guide is organized by environment. Complete the **Common Setup** steps first, then follow the environment-specific guides:

- **[Common Setup](#common-setup)** - Shared infrastructure (IAM roles, VPC, Security Groups)
- **[Development Environment](./1-dev.md)** - Dev environment setup
- **[Test Environment](./2-test.md)** - Test/staging environment setup
- **[Production Environment](./3-prod.md)** - Production environment setup

## Prerequisites

Before starting, ensure you have:

- ✅ AWS Account created
- ✅ AWS CLI installed and configured (`aws configure`)
- ✅ Administrator access or permissions for:
  - ECS (Elastic Container Service)
  - ECR (Elastic Container Registry)
  - EC2 (for VPC, Security Groups, Load Balancers)
  - IAM (for roles and policies)
  - CloudWatch (for logs)
  - S3 (for file storage)
  - Route 53 (optional, for custom domains)
  - Certificate Manager (optional, for SSL)

---

## Common Setup

These steps need to be completed **once** and are shared across all environments.

### Step 1: AWS Account Initial Setup

#### 1.1 Configure AWS CLI

```bash
# Configure AWS CLI with your credentials
aws configure

# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region: us-west-2
# - Default output format: json

# Verify configuration
aws sts get-caller-identity
```

#### 1.2 Set Common Variables

```bash
# Set your AWS account ID (replace with your actual account ID)
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-west-2

# Verify
echo "Account ID: $AWS_ACCOUNT_ID"
echo "Region: $AWS_REGION"
```

---

### Step 2: IAM Roles and Policies

#### 2.1 Create ECS Task Execution Role

This role allows ECS tasks to pull images from ECR and write logs to CloudWatch.

**Via AWS Console:**
1. Go to IAM → Roles → Create role
2. Select "AWS service" → "ECS" → "ECS Task"
3. Click "Next"
4. Attach policies:
   - `AmazonECSTaskExecutionRolePolicy`
   - `AmazonEC2ContainerRegistryReadOnly`
5. Role name: `ecsTaskExecutionRole`
6. Create role

**Via AWS CLI:**

```bash
# Create trust policy
cat > ecs-task-execution-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file://ecs-task-execution-trust-policy.json

# Attach policies
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly

# Clean up
rm ecs-task-execution-trust-policy.json

echo "✅ Created ECS Task Execution Role"
```

#### 2.2 Create ECS Task Role

This role allows your application to access AWS services (S3, etc.).

**Via AWS CLI:**

```bash
# Create trust policy
cat > ecs-task-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name ecsTaskRole \
  --assume-role-policy-document file://ecs-task-trust-policy.json

# Create and attach S3 access policy
cat > s3-access-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::webyalaya-*-uploads",
        "arn:aws:s3:::webyalaya-*-uploads/*"
      ]
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name ecsTaskRole \
  --policy-name S3AccessPolicy \
  --policy-document file://s3-access-policy.json

# Clean up
rm ecs-task-trust-policy.json s3-access-policy.json

echo "✅ Created ECS Task Role"
```

---

### Step 3: VPC and Networking

#### 3.1 Get Default VPC (Recommended for initial setup)

```bash
# Get default VPC ID
DEFAULT_VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' \
  --output text \
  --region $AWS_REGION)

# Get default subnets
SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$DEFAULT_VPC_ID" \
  --query 'Subnets[*].SubnetId' \
  --output text \
  --region $AWS_REGION)

# Get first two subnets for ALB
SUBNET_1=$(echo $SUBNET_IDS | cut -d' ' -f1)
SUBNET_2=$(echo $SUBNET_IDS | cut -d' ' -f2)

echo "Default VPC ID: $DEFAULT_VPC_ID"
echo "Subnet IDs: $SUBNET_IDS"
echo "Subnet 1: $SUBNET_1"
echo "Subnet 2: $SUBNET_2"
```

**Note:** For production, consider creating a custom VPC. See [AWS VPC Documentation](https://docs.aws.amazon.com/vpc/).

---

### Step 4: Security Groups

#### 4.1 Create ALB Security Group

**Via AWS CLI:**

```bash
# Create ALB security group
ALB_SG_ID=$(aws ec2 create-security-group \
  --group-name webyalaya-alb-sg \
  --description "Security group for WebYalaya ALB" \
  --vpc-id $DEFAULT_VPC_ID \
  --region $AWS_REGION \
  --query 'GroupId' \
  --output text)

# Allow HTTP and HTTPS from internet
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION

aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION

echo "✅ Created ALB Security Group: $ALB_SG_ID"
```

#### 4.2 Create ECS Task Security Group

**Via AWS CLI:**

```bash
# Create ECS task security group
ECS_SG_ID=$(aws ec2 create-security-group \
  --group-name webyalaya-ecs-task-sg \
  --description "Security group for WebYalaya ECS tasks" \
  --vpc-id $DEFAULT_VPC_ID \
  --region $AWS_REGION \
  --query 'GroupId' \
  --output text)

# Allow traffic from ALB security group
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 3000 \
  --source-group $ALB_SG_ID \
  --region $AWS_REGION

echo "✅ Created ECS Task Security Group: $ECS_SG_ID"
```

---

## Step 5: Third-Party Services Setup

Before deploying the application, you need to set up third-party services that the application depends on.

### Quick Checklist

- [ ] Create Neon database accounts (one for each environment: dev, test, prod)
- [ ] Create Clerk accounts/applications (one for each environment: dev, test, prod)
- [ ] Configure Clerk sessions with `{"metadata": "{{user.public_metadata}}"}` for each application
- [ ] Get all API keys and connection strings
- [ ] Set up LiveKit accounts for video conferencing

### 5.1 Neon Database Setup

Neon is a serverless PostgreSQL database service used for the application database.

#### Create Neon Account and Database

1. **Sign up for Neon:**
   - Go to [https://neon.tech](https://neon.tech)
   - Sign up for a free account

2. **Create a Database:**
   - After logging in, click "Create Project"
   - Choose a project name (e.g., `webyalaya-dev`, `webyalaya-test`, `webyalaya-prod`)
   - Select a region (preferably `us-west-2` to match AWS region)
   - Click "Create Project"

3. **Get Database Connection String:**
   - After project creation, you'll see the connection string
   - Format: `postgresql://user:password@host.neon.tech:5432/dbname?sslmode=require`
   - **Save this connection string** - you'll need it for the `DATABASE_URL` environment variable

4. **Create Separate Databases for Each Environment:**
   - **Development**: Create a project/database for dev environment
   - **Test**: Create a project/database for test environment
   - **Production**: Create a project/database for production environment

**Note:** Each environment should have its own database to prevent data conflicts.

---

### 5.2 Clerk Account Setup

Clerk is used for authentication and user management.

#### Create Clerk Account

1. **Sign up for Clerk:**
   - Go to [https://clerk.com](https://clerk.com)
   - Sign up for a free account

2. **Create Applications:**
   - Create separate Clerk applications for each environment:
     - **Development**: Create a new application (e.g., `webyalaya-dev`)
     - **Test**: Create a new application (e.g., `webyalaya-test`)
     - **Production**: Create a new application (e.g., `webyalaya-prod`)

3. **Get Clerk Keys:**
   - For each application, go to **API Keys** section
   - Copy the following:
     - **Publishable Key** (starts with `pk_test_...` or `pk_live_...`)
     - **Secret Key** (starts with `sk_test_...` or `sk_live_...`)
   - **Save these keys** - you'll need them for environment variables

4. **Get JWT Signing Key:**
   - Go to **JWT Templates** → **Default** (or create a new template)
   - Copy the **Signing Key** (public key format)
   - **Save this key** - you'll need it for the `CLERK_JWT_KEY` environment variable

#### Configure Clerk Sessions

> **⚠️ CRITICAL:** You **MUST** configure Clerk sessions to include user metadata. Without this configuration, the application's onboarding flow will not work correctly.

**Step-by-Step Instructions:**

1. **Navigate to Sessions Settings:**
   - In your Clerk dashboard, go to **Configure** → **Sessions**
   - Or navigate to **Sessions** → **Settings**

2. **Configure Session Token Claims:**
   - Scroll down to the **Session Token** section
   - Find **Token Claims** or **Custom Claims** settings
   - Click **Add Claim** or **Edit** (if claims already exist)

3. **Add Metadata Claim:**
   - **Key**: `metadata`
   - **Value**: `{{user.public_metadata}}`
   - Click **Save** or **Apply**

4. **Repeat for Each Environment:**
   - Configure this setting for **each Clerk application** (dev, test, prod)
   - Each environment needs its own Clerk application with this configuration

**Example Configuration:**

```json
{
  "metadata": "{{user.public_metadata}}"
}
```

**Visual Guide:**
- In Clerk Dashboard: **Configure** → **Sessions** → **Session Token** → **Token Claims**
- Click **Add Claim**
- Enter Key: `metadata`
- Enter Value: `{{user.public_metadata}}`
- Save changes

**Verify Configuration:**
- After saving, create a test user in Clerk
- Sign in with that user in your application
- Check the session token (you can inspect it in browser DevTools or backend logs)
- Verify that `sessionClaims.metadata` is present
- The application middleware checks for `sessionClaims?.metadata?.onboardingComplete` (see `my-app/src/middleware.ts`)

**Why this is critical:**
- The application uses `sessionClaims?.metadata?.onboardingComplete` to determine if users have completed onboarding
- Without this configuration, `sessionClaims.metadata` will be `undefined`
- Users will be stuck in an onboarding redirect loop
- The onboarding flow will not function correctly

---

### 5.3 LiveKit Setup

LiveKit is used for video conferencing features.

1. **Sign up for LiveKit Cloud:**
   - Go to [https://livekit.io/cloud](https://livekit.io/cloud)
   - Sign up for an account

2. **Create Projects:**
   - Create separate projects for each environment:
     - Development project
     - Test project
     - Production project

3. **Get API Credentials:**
   - For each project, go to **Settings** → **API Keys**
   - Create a new API key
   - Copy:
     - **API Key**
     - **API Secret**
   - **Save these credentials** - you'll need them for `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`

4. **Get WebSocket URL:**
   - In project settings, find the **WebSocket URL**
   - Format: `wss://your-project.livekit.cloud`
   - **Save this URL** - you'll need it for `NEXT_PUBLIC_LIVEKIT_WS_URL`

---

## Next Steps

After completing the common setup and third-party services setup, proceed to environment-specific setup:

1. **[Development Environment Setup](./1-dev.md)** - Set up dev environment
2. **[Test Environment Setup](./2-test.md)** - Set up test/staging environment
3. **[Production Environment Setup](./3-prod.md)** - Set up production environment

---

## Cost Estimates

### Monthly Costs (Approximate)

**Development Environment:**
- ECS Fargate (1 task, 0.25 vCPU, 512 MB): ~$7-15/month
- ALB: ~$16-20/month
- ECR storage: ~$0.10/month
- CloudWatch logs: ~$0.50/month
- S3 storage: ~$0.023/GB/month
- **Total: ~$24-36/month**

**Test Environment:**
- Same as Dev: **~$24-36/month**

**Production Environment:**
- ECS Fargate (1 task, 0.5 vCPU, 1024 MB): ~$15-30/month
- ALB: ~$16-20/month
- ECR storage: ~$0.10/month
- CloudWatch logs: ~$1-2/month
- S3 storage: Variable
- **Total: ~$32-52/month**

**Total for All Environments: ~$80-124/month**

**Note:** Costs vary based on:
- Traffic volume
- Data transfer
- Storage usage
- Log retention period

---

## Related Documentation

- [GitHub Actions Workflows](../1-github-workflows.md)
- [Environment Variables Configuration](../2-environment-variables.md)
- [Deployment Commands Guide](../3-deployment-commands.md)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS ECR Documentation](https://docs.aws.amazon.com/ecr/)
- [AWS ALB Documentation](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)

