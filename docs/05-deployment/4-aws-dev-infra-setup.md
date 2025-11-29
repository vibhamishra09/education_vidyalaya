# AWS Dev Infrastructure Setup (Dev Environment)

This guide explains how to use the AWS dev environment setup script in `infra/aws/setup-dev-environment.sh`.

It is the **primary reference** for AWS dev infra; the old `infra/aws/SETUP-DEV-README.md` is now considered secondary and may be removed later.

## Overview

The script automates creation of all dev AWS resources:

- **IAM Roles**: ECS task execution and application roles
- **VPC & Networking**: Default VPC and subnets
- **Security Groups**: ALB and ECS task security groups
- **ECR Repository**: Docker image registry
- **CloudWatch Logs**: Application logs
- **S3 Bucket**: File uploads storage
- **Application Load Balancer**: Public entrypoint
- **ECS Cluster**: Fargate cluster
- **ECS Task Definition**: Backend container configuration
- **ECS Service**: Running backend service

Script location:

```bash
cd infra/aws
./setup-dev-environment.sh
```

## Prerequisites

1. **AWS CLI installed and configured**

```bash
aws configure
# Or use a profile:
aws configure --profile namaste
```

2. **Permissions**

You need either:

- Administrator access, or
- Permission to manage:
  - IAM (roles and policies)
  - EC2 (VPC, Security Groups, Load Balancers)
  - ECS (clusters, services, task definitions)
  - ECR
  - CloudWatch Logs
  - S3

3. **`jq` installed** (strongly recommended)

- Linux: `sudo apt-get install jq`
- Mac: `brew install jq`
- Windows: Git Bash typically includes `jq` separately if installed

## Script Usage

From repo root:

```bash
cd infra/aws
./setup-dev-environment.sh
```

### Options

```bash
./setup-dev-environment.sh [--profile PROFILE] [--region REGION] [--skip-common] [--dry-run] [--cors-origins URL1,URL2,...] [--env-file FILE] [--create-s3-user]
```

- **`--profile PROFILE`**: AWS profile (default: `namaste`)
- **`--region REGION`**: AWS region (default: `us-west-2`)
- **`--skip-common`**: Skip IAM/VPC/SG creation and reuse existing infra
- **`--dry-run`**: Log actions without creating resources
- **`--cors-origins`**: Comma-separated CORS origins for the S3 bucket
- **`--env-file`**: File containing environment variables for the ECS task definition (supports JSON array, JSON object, or `.env` style)
- **`--create-s3-user`**: Create an S3 IAM user and generate access keys for uploads

### Common Examples

```bash
# Basic run with defaults
./setup-dev-environment.sh

# Use a different profile and region
./setup-dev-environment.sh --profile myprofile --region us-east-1

# Reuse existing IAM/VPC/SG
./setup-dev-environment.sh --skip-common

# Dry run
./setup-dev-environment.sh --dry-run
```

## Output

Each run creates a timestamped directory:

```text
infra/aws/output/setup-YYYYMMDD-HHMMSS/
  setup.log
  created-resources.txt
  dev-task-definition.json
  ...
```

- **`setup.log`**: Full log of actions and AWS CLI output
- **`created-resources.txt`**: Key IDs/ARNs (cluster, ALB, S3 bucket, etc.)
- **`dev-task-definition.json`**: Generated ECS task definition JSON

## Resources Created (Dev)

**IAM**

- `ecsTaskExecutionRole`
- `ecsTaskRole` (includes S3 access to `webyalaya-dev-media-namaste`)

**Networking**

- Uses default VPC and discovers at least 2 subnets

**Security Groups**

- `webyalaya-alb-sg`: ALB security group (80, 443)
- `webyalaya-ecs-task-sg`: ECS tasks (port 3000 from ALB SG)

**ECR**

- Repository: `webyalaya-dev-backend-app`

**CloudWatch Logs**

- Log group: `/ecs/webyalaya-dev-backend-task`

**S3**

- Bucket: `webyalaya-dev-media-namaste`
- ACLs enabled
- Public access unblocked (for presigned/public files)
- Versioning + SSE-S3 encryption
- CORS configured from `--cors-origins`
- Public-read bucket policy
- `avatars/` prefix created

**ALB & Target Group**

- ALB: `webyalaya-dev-alb` (internet-facing, HTTP 80)
- Target group: `webyalaya-dev-tg` (HTTP 3000, health check `/`, sticky sessions)
- Listener on port 80 forwarding to target group

> You must still configure HTTPS (443) and ACM certificate manually. See the existing notes in this doc set for HTTPS setup.

**ECS**

- Service-linked role: `AWSServiceRoleForECS` (created if missing)
- Cluster: `webyalaya-dev-backend-cluster` (Fargate)
- Task definition: `webyalaya-dev-backend-task` (CPU 256, memory 512)
- Service: `webyalaya-dev-backend-task-service` (desired count 1)

## Environment Variables for the Backend

The task definition initially contains only:

- `PORT=3000`
- `NODE_ENV=development`

You must add real environment variables. See:

- [`docs/05-deployment/2-environment-variables.md`](./2-environment-variables.md)

You can:

- Pass an env file via `--env-file` when running the script, or
- Edit the task definition in AWS Console / via CLI as described in the original infra README.

## S3 User and Credentials

If you pass `--create-s3-user`, the script:

- Creates IAM user `webyalaya-dev-s3-user`
- Attaches an S3 access policy for `webyalaya-dev-media-namaste`
- Generates access keys, saves them to:

```text
infra/aws/output/setup-YYYYMMDD-HHMMSS/s3-user-credentials.json
```

It also exports credentials into the task definition environment variables (when used with `--env-file`).

## Next Steps After Running the Script

After a successful run:

1. **Push Docker image to ECR** (see `docs/05-deployment/3-deployment-commands.md`)
2. **Ensure environment variables are correct** for the task definition
3. **Add/verify HTTPS (443) listener** on the ALB and ACM certificate
4. **Configure frontend** to point `NEXT_PUBLIC_API_URL` at the ALB DNS name
5. **Verify ECS service health** from the AWS Console


