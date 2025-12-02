# AWS Feedback System Setup Scripts

This directory contains bash scripts for setting up and deploying the feedback logging system on AWS.

## Prerequisites

1. AWS CLI installed and configured
2. Appropriate AWS credentials with permissions for:
   - DynamoDB (create tables, manage indexes)
   - S3 (create buckets, manage policies)
   - Lambda (create/update functions)
   - API Gateway (create/configure APIs)
   - IAM (create roles and policies)

## Scripts

### 1. setup-feedback-system.sh

Creates all AWS infrastructure resources:
- DynamoDB table with Global Secondary Indexes
- S3 bucket with CORS, encryption, and lifecycle policies
- IAM roles and policies for Lambda functions
- API Gateway REST API structure

**Usage:**
```bash
./setup-feedback-system.sh
```

**Environment Variables:**
- `AWS_REGION`: AWS region (default: us-east-1)
- `FEEDBACK_TABLE_NAME`: DynamoDB table name (default: Feedback)
- `FEEDBACK_BUCKET_NAME`: S3 bucket name (default: webyalaya-feedback-attachments)
- `FEEDBACK_API_NAME`: API Gateway name (default: feedback-api)
- `API_STAGE_NAME`: API Gateway stage (default: prod)

**Output:**
Saves configuration to `/tmp/feedback-system-config.json` with resource IDs and ARNs.

### 2. deploy-lambdas.sh

Packages and deploys all Lambda functions.

**Usage:**
```bash
./deploy-lambdas.sh
```

**Environment Variables:**
- `AWS_REGION`: AWS region
- `LAMBDA_ROLE_NAME`: IAM role name (default: FeedbackSystemLambdaRole)
- `FEEDBACK_TABLE_NAME`: DynamoDB table name
- `FEEDBACK_BUCKET_NAME`: S3 bucket name

**Requirements:**
- Must run `setup-feedback-system.sh` first
- Lambda functions must be built (run `npm run build` in `lambdas/feedback-system/`)

### 3. update-api-gateway.sh

Configures API Gateway to integrate with Lambda functions and enables CORS.

**Usage:**
```bash
export FEEDBACK_API_ID=<api-id-from-setup>
./update-api-gateway.sh
```

Or provide API ID interactively when prompted.

**Environment Variables:**
- `AWS_REGION`: AWS region
- `FEEDBACK_API_ID`: API Gateway ID (required)
- `API_STAGE_NAME`: API Gateway stage (default: prod)

## Complete Setup Workflow

1. **Set environment variables** (optional):
```bash
export AWS_REGION=us-east-1
export FEEDBACK_TABLE_NAME=Feedback
export FEEDBACK_BUCKET_NAME=webyalaya-feedback-attachments
export FEEDBACK_API_NAME=feedback-api
```

2. **Create infrastructure**:
```bash
./setup-feedback-system.sh
```

3. **Build Lambda functions**:
```bash
cd ../../lambdas/feedback-system
npm install
npm run build
cd ../../scripts/aws
```

4. **Deploy Lambda functions**:
```bash
./deploy-lambdas.sh
```

5. **Configure API Gateway**:
```bash
# Get API ID from setup output or config file
export FEEDBACK_API_ID=<api-id>
./update-api-gateway.sh
```

6. **Get API endpoint**:
The script will output the API Gateway URL. Set this in your frontend:
```bash
export NEXT_PUBLIC_FEEDBACK_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/<stage>
```

## Troubleshooting

### Lambda deployment fails
- Ensure Lambda functions are built (`npm run build` in `lambdas/feedback-system/`)
- Check IAM role exists and has correct permissions
- Verify environment variables are set correctly

### API Gateway integration fails
- Ensure Lambda functions are deployed first
- Check API Gateway resource IDs match setup output
- Verify Lambda function names match exactly

### S3 bucket creation fails
- Bucket names must be globally unique
- Check if bucket already exists in another region
- Verify IAM permissions for S3

## Cleanup

To remove all resources:

1. Delete API Gateway:
```bash
aws apigateway delete-rest-api --rest-api-id <api-id>
```

2. Delete Lambda functions:
```bash
aws lambda delete-function --function-name SubmitFeedbackLambda
aws lambda delete-function --function-name UploadAttachmentLambda
aws lambda delete-function --function-name GetFeedbackLambda
aws lambda delete-function --function-name FeedbackStatsLambda
aws lambda delete-function --function-name ScheduledFeedbackLambda
```

3. Delete DynamoDB table:
```bash
aws dynamodb delete-table --table-name <table-name>
```

4. Delete S3 bucket (empty first):
```bash
aws s3 rm s3://<bucket-name> --recursive
aws s3api delete-bucket --bucket <bucket-name>
```

5. Delete IAM role and policies:
```bash
aws iam detach-role-policy --role-name FeedbackSystemLambdaRole --policy-arn <policy-arn>
aws iam delete-role --role-name FeedbackSystemLambdaRole
aws iam delete-policy --policy-arn <policy-arn>
```

