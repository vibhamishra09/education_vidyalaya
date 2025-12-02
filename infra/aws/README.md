# AWS Infrastructure Setup Template

This directory contains a templated AWS infrastructure setup script that can be used to create infrastructure for any project and environment.

## Overview

The setup script automates the creation of:
- **ECS Cluster** - Container orchestration
- **ECR Repository** - Docker image storage
- **Application Load Balancer (ALB)** - Traffic distribution
- **S3 Buckets** - File storage
- **IAM Roles** - Security permissions
- **Security Groups** - Network security
- **CloudWatch Logs** - Logging
- **VPC Configuration** - Networking

## Usage

### Basic Usage

```bash
./setup-dev-environment.sh --project-name <PROJECT> --environment <ENV>
```

### Examples

```bash
# Create infrastructure for "myapp" in "prod" environment
./setup-dev-environment.sh --project-name myapp --environment prod

# Create infrastructure for "webyalaya" in "dev" environment with custom profile
./setup-dev-environment.sh --project-name webyalaya --environment dev --profile myprofile

# Dry run to see what would be created
./setup-dev-environment.sh --project-name myapp --environment staging --dry-run
```

### Command Line Options

- `--project-name NAME` - Project name (default: `webyalaya`)
  - Must contain only lowercase letters, numbers, and hyphens
  - Example: `myapp`, `web-service`, `api-v2`

- `--environment ENV` - Environment name (default: `dev`)
  - Must contain only lowercase letters, numbers, and hyphens
  - Examples: `dev`, `staging`, `prod`, `test`

- `--profile PROFILE` - AWS profile to use (default: `namaste`)
  - Must be configured in your AWS credentials file

- `--region REGION` - AWS region (default: `us-west-2`)

- `--skip-common` - Skip common setup (IAM roles, VPC, Security Groups)
  - Use this if these resources already exist

- `--dry-run` - Show what would be created without actually creating resources

- `--cors-origins URLS` - Comma-separated list of CORS allowed origins
  - Default: `http://localhost:3000,https://be.dev.webyalaya.com`

- `--env-file FILE` - Path to file with environment variables for task definition
  - Supports JSON format: `[{"name":"VAR","value":"val"},...]`
  - Or key-value format: `VAR=value` (one per line)

- `--create-s3-user` - Create IAM user with S3 permissions and generate access keys

- `--help` - Show help message

## Resource Naming Convention

All resources are named using the pattern: `<PROJECT_NAME>-<ENVIRONMENT>-<RESOURCE_TYPE>`

Examples:
- Cluster: `myapp-prod-backend-cluster`
- ECR Repo: `myapp-prod-backend-app`
- ALB: `myapp-prod-alb`
- S3 Bucket: `myapp-prod-media-<PROFILE>` (or `myapp-prod-media` if profile is default)

## Environment Variables

You can also set `PROJECT_NAME` and `ENVIRONMENT` as environment variables:

```bash
export PROJECT_NAME=myapp
export ENVIRONMENT=prod
./setup-dev-environment.sh
```

## Prerequisites

1. **AWS CLI** installed and configured
2. **Appropriate AWS permissions** (Administrator or equivalent)
3. **jq** installed (for JSON parsing)
   - Linux: `sudo apt-get install jq`
   - Mac: `brew install jq`

## Output

The script creates an output directory with:
- `setup.log` - Full execution log
- `created-resources.txt` - List of created resources with their IDs/names
- Various JSON files (task definitions, policies, etc.)

## Next Steps After Setup

1. **Push Docker image to ECR:**
   ```bash
   aws ecr get-login-password --region <REGION> --profile <PROFILE> | \
     docker login --username AWS --password-stdin <ECR_URI>
   docker build -t <REPO_NAME> .
   docker tag <REPO_NAME>:latest <ECR_URI>:latest
   docker push <ECR_URI>:latest
   ```

2. **Update task definition** with environment variables (see `docs/05-deployment/2-environment-variables.md`)

3. **Update frontend** `NEXT_PUBLIC_API_URL` to point to the ALB DNS name

4. **Check service status:**
   ```bash
   aws ecs describe-services \
     --cluster <CLUSTER_NAME> \
     --services <SERVICE_NAME> \
     --profile <PROFILE> \
     --region <REGION>
   ```

## Troubleshooting

- **"PROJECT_NAME is required"** - Make sure to pass `--project-name` or set `PROJECT_NAME` environment variable
- **"ENVIRONMENT is required"** - Make sure to pass `--environment` or set `ENVIRONMENT` environment variable
- **"Failed to authenticate with AWS"** - Check your AWS credentials and profile configuration
- **"Default VPC not found"** - Ensure your AWS account has a default VPC in the specified region

## Template Customization

The template is modular and organized in the `lib/` directory:
- `config.sh` - Configuration and naming conventions
- `utils.sh` - Utility functions
- `iam.sh` - IAM roles setup
- `vpc.sh` - VPC and networking
- `security-groups.sh` - Security groups
- `ecr.sh` - ECR repository
- `cloudwatch.sh` - CloudWatch logs
- `s3.sh` - S3 buckets
- `alb.sh` - Application Load Balancer
- `ecs.sh` - ECS cluster, tasks, and services
- `env-parser.sh` - Environment variable parsing

To customize resource configurations, edit the respective module files in `lib/`.

