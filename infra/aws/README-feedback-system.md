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
3. AWS profile configured (if using multiple AWS accounts)

## Scripts

### 1. setup-feedback-system.sh

Creates all AWS infrastructure resources:
- DynamoDB table with Global Secondary Indexes
- S3 bucket with CORS, encryption, and lifecycle policies
- IAM roles and policies for Lambda functions
- API Gateway HTTP API (cheaper than REST API)

**Usage:**
```bash
./setup-feedback-system.sh [OPTIONS]
```

**Options:**
- `--profile PROFILE`: AWS profile to use
- `--region REGION`: AWS region (default: us-west-2)
- `--table-name NAME`: DynamoDB table name (default: Feedback)
- `--bucket-name NAME`: S3 bucket name (default: webyalaya-feedback-attachments)
- `--api-name NAME`: API Gateway name (default: feedback-api)
- `--stage-name NAME`: API Gateway stage (default: prod)
- `--help`: Show help message

**Environment Variables (alternative to command-line options):**
- `AWS_REGION`: AWS region
- `FEEDBACK_TABLE_NAME`: DynamoDB table name
- `FEEDBACK_BUCKET_NAME`: S3 bucket name
- `FEEDBACK_API_NAME`: API Gateway name
- `API_STAGE_NAME`: API Gateway stage

**Output:**
Saves configuration to `/tmp/feedback-system-config.json` with resource IDs and ARNs.

### 2. deploy-lambdas.sh

Packages and deploys all Lambda functions.

**Usage:**
```bash
./deploy-lambdas.sh [OPTIONS]
```

**Options:**
- `--profile PROFILE`: AWS profile to use
- `--region REGION`: AWS region (default: us-west-2)
- `--role-name NAME`: IAM role name (default: FeedbackSystemLambdaRole)
- `--help`: Show help message

**Environment Variables:**
- `AWS_REGION`: AWS region
- `LAMBDA_ROLE_NAME`: IAM role name
- `FEEDBACK_TABLE_NAME`: DynamoDB table name
- `FEEDBACK_BUCKET_NAME`: S3 bucket name

**Requirements:**
- Must run `setup-feedback-system.sh` first
- Lambda functions must be built (run `npm run build` in `lambdas/feedback-system/`)

### 3. update-api-gateway.sh

Configures API Gateway to integrate with Lambda functions and enables CORS.

**Usage:**
```bash
./update-api-gateway.sh [OPTIONS]
```

**Options:**
- `--profile PROFILE`: AWS profile to use
- `--region REGION`: AWS region (default: us-west-2)
- `--api-id ID`: API Gateway ID (or set FEEDBACK_API_ID env var)
- `--stage-name NAME`: API Gateway stage (default: prod)
- `--help`: Show help message

**Environment Variables:**
- `AWS_REGION`: AWS region
- `FEEDBACK_API_ID`: API Gateway ID (required if not provided via --api-id)
- `API_STAGE_NAME`: API Gateway stage

### 4. setup-monitoring.sh

Sets up CloudWatch alarms and dashboards for monitoring.

**Usage:**
```bash
./setup-monitoring.sh [OPTIONS]
```

**Options:**
- `--profile PROFILE`: AWS profile to use
- `--region REGION`: AWS region (default: us-west-2)
- `--table-name NAME`: DynamoDB table name (default: Feedback)
- `--bucket-name NAME`: S3 bucket name (default: webyalaya-feedback-attachments)
- `--help`: Show help message

## Complete Setup Workflow

1. **Set environment variables** (optional):
```bash
export AWS_REGION=us-west-2
export FEEDBACK_TABLE_NAME=Feedback
export FEEDBACK_BUCKET_NAME=webyalaya-feedback-attachments
export FEEDBACK_API_NAME=feedback-api
```

2. **Create infrastructure**:
```bash
./setup-feedback-system.sh --profile <your-profile> --region us-west-2
```

3. **Build Lambda functions**:
```bash
cd ../../lambdas/feedback-system
npm install
npm run build
cd ../../infra/aws
```

4. **Deploy Lambda functions**:
```bash
./deploy-lambdas.sh --profile <your-profile>
```

5. **Configure API Gateway**:
```bash
# Get API ID from setup output or config file
./update-api-gateway.sh --profile <your-profile> --api-id <api-id>
```

6. **Set up monitoring** (optional):
```bash
./setup-monitoring.sh --profile <your-profile>
```

7. **Get API endpoint**:
The script will output the API Gateway URL. Set this in your frontend:
```bash
export NEXT_PUBLIC_FEEDBACK_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/<stage>
```

## AWS Profile Support

All scripts support AWS profiles for managing multiple AWS accounts. You can:

1. **Use command-line option**:
   ```bash
   ./setup-feedback-system.sh --profile myprofile
   ```

2. **Set environment variable**:
   ```bash
   export AWS_PROFILE=myprofile
   ./setup-feedback-system.sh
   ```

3. **Configure default profile**:
   ```bash
   aws configure --profile myprofile
   ```

## Troubleshooting

### Lambda deployment fails
- Ensure Lambda functions are built (`npm run build` in `lambdas/feedback-system/`)
- Check IAM role exists and has correct permissions
- Verify environment variables are set correctly
- Ensure you're using the correct AWS profile

### API Gateway integration fails
- Ensure Lambda functions are deployed first
- Check API Gateway ID matches setup output
- Verify Lambda function names match exactly
- Ensure you're using the same AWS profile for all operations

### S3 bucket creation fails
- Bucket names must be globally unique
- Check if bucket already exists in another region
- Verify IAM permissions for S3
- Ensure you're using the correct AWS profile

### Profile-related errors
- Verify profile exists: `aws configure list-profiles`
- Test profile: `aws sts get-caller-identity --profile <profile>`
- Ensure profile has necessary permissions

## Cleanup

To remove all resources:

1. Delete API Gateway:
```bash
aws apigatewayv2 delete-api --api-id <api-id> --profile <profile> --region <region>
```

2. Delete Lambda functions:
```bash
aws lambda delete-function --function-name SubmitFeedbackLambda --profile <profile> --region <region>
aws lambda delete-function --function-name UploadAttachmentLambda --profile <profile> --region <region>
aws lambda delete-function --function-name GetFeedbackLambda --profile <profile> --region <region>
aws lambda delete-function --function-name FeedbackStatsLambda --profile <profile> --region <region>
aws lambda delete-function --function-name ScheduledFeedbackLambda --profile <profile> --region <region>
```

3. Delete DynamoDB table:
```bash
aws dynamodb delete-table --table-name <table-name> --profile <profile> --region <region>
```

4. Delete S3 bucket (empty first):
```bash
aws s3 rm s3://<bucket-name> --recursive --profile <profile>
aws s3api delete-bucket --bucket <bucket-name> --profile <profile> --region <region>
```

5. Delete IAM role and policies:
```bash
aws iam detach-role-policy --role-name FeedbackSystemLambdaRole --policy-arn <policy-arn> --profile <profile>
aws iam delete-role --role-name FeedbackSystemLambdaRole --profile <profile>
aws iam delete-policy --policy-arn <policy-arn> --profile <profile>
```

Manual commands to add permission to the API Gateway to invoke the Lambda functions:
```bash
# Add permission for SubmitFeedbackLambda
aws lambda add-permission \
  --function-name SubmitFeedbackLambda \
  --statement-id api-gateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-west-2:410974772890:vdgzyms0a8/*/*" \
  --profile namaste \
  --region us-west-2

# Add permission for GetFeedbackLambda
aws lambda add-permission \
  --function-name GetFeedbackLambda \
  --statement-id api-gateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-west-2:410974772890:vdgzyms0a8/*/*" \
  --profile namaste \
  --region us-west-2

# Add permission for FeedbackStatsLambda
aws lambda add-permission \
  --function-name FeedbackStatsLambda \
  --statement-id api-gateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-west-2:410974772890:vdgzyms0a8/*/*" \
  --profile namaste \
  --region us-west-2

# Add permission for UploadAttachmentLambda
aws lambda add-permission \
  --function-name UploadAttachmentLambda \
  --statement-id api-gateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-west-2:410974772890:vdgzyms0a8/*/*" \
  --profile namaste \
  --region us-west-2
```
