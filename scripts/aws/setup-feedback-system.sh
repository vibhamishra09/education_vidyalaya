#!/bin/bash

# AWS Feedback System Setup Script
# This script creates all necessary AWS resources for the feedback logging system

set -e  # Exit on error

# Configuration variables (modify as needed)
REGION="${AWS_REGION:-us-east-1}"
TABLE_NAME="${FEEDBACK_TABLE_NAME:-Feedback}"
BUCKET_NAME="${FEEDBACK_BUCKET_NAME:-webyalaya-feedback-attachments}"
API_NAME="${FEEDBACK_API_NAME:-feedback-api}"
STAGE_NAME="${API_STAGE_NAME:-prod}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting AWS Feedback System Setup...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured. Please run 'aws configure'${NC}"
    exit 1
fi

echo -e "${YELLOW}Region: ${REGION}${NC}"
echo -e "${YELLOW}Table Name: ${TABLE_NAME}${NC}"
echo -e "${YELLOW}Bucket Name: ${BUCKET_NAME}${NC}"
echo ""

# Step 1: Create DynamoDB Table
echo -e "${GREEN}Step 1: Creating DynamoDB Table...${NC}"
aws dynamodb create-table \
    --table-name "${TABLE_NAME}" \
    --attribute-definitions \
        AttributeName=feedbackId,AttributeType=S \
        AttributeName=userId,AttributeType=S \
        AttributeName=featureArea,AttributeType=S \
        AttributeName=status,AttributeType=S \
        AttributeName=submittedAt,AttributeType=S \
    --key-schema \
        AttributeName=feedbackId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes \
        "[
            {
                \"IndexName\": \"userId-index\",
                \"KeySchema\": [
                    {\"AttributeName\": \"userId\", \"KeyType\": \"HASH\"},
                    {\"AttributeName\": \"submittedAt\", \"KeyType\": \"RANGE\"}
                ],
                \"Projection\": {
                    \"ProjectionType\": \"ALL\"
                }
            },
            {
                \"IndexName\": \"featureArea-index\",
                \"KeySchema\": [
                    {\"AttributeName\": \"featureArea\", \"KeyType\": \"HASH\"},
                    {\"AttributeName\": \"submittedAt\", \"KeyType\": \"RANGE\"}
                ],
                \"ProjectionType\": \"ALL\"
            },
            {
                \"IndexName\": \"status-index\",
                \"KeySchema\": [
                    {\"AttributeName\": \"status\", \"KeyType\": \"HASH\"},
                    {\"AttributeName\": \"submittedAt\", \"KeyType\": \"RANGE\"}
                ],
                \"ProjectionType\": \"ALL\"
            }
        ]" \
    --region "${REGION}" \
    --no-cli-pager

echo -e "${GREEN}Waiting for table to be active...${NC}"
aws dynamodb wait table-exists --table-name "${TABLE_NAME}" --region "${REGION}"

# Step 2: Create S3 Bucket
echo -e "${GREEN}Step 2: Creating S3 Bucket...${NC}"
if aws s3api head-bucket --bucket "${BUCKET_NAME}" --region "${REGION}" 2>/dev/null; then
    echo -e "${YELLOW}Bucket ${BUCKET_NAME} already exists, skipping creation${NC}"
else
    if [ "${REGION}" = "us-east-1" ]; then
        aws s3api create-bucket --bucket "${BUCKET_NAME}" --region "${REGION}"
    else
        aws s3api create-bucket \
            --bucket "${BUCKET_NAME}" \
            --region "${REGION}" \
            --create-bucket-configuration LocationConstraint="${REGION}"
    fi
    echo -e "${GREEN}Bucket created${NC}"
fi

# Enable versioning
echo -e "${GREEN}Enabling versioning on bucket...${NC}"
aws s3api put-bucket-versioning \
    --bucket "${BUCKET_NAME}" \
    --versioning-configuration Status=Enabled \
    --region "${REGION}"

# Enable encryption
echo -e "${GREEN}Enabling encryption on bucket...${NC}"
aws s3api put-bucket-encryption \
    --bucket "${BUCKET_NAME}" \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            }
        }]
    }' \
    --region "${REGION}"

# Set CORS configuration
echo -e "${GREEN}Setting CORS configuration...${NC}"
cat > /tmp/cors-config.json <<EOF
{
    "CORSRules": [
        {
            "AllowedOrigins": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
            "AllowedHeaders": ["*"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3000
        }
    ]
}
EOF

aws s3api put-bucket-cors \
    --bucket "${BUCKET_NAME}" \
    --cors-configuration file:///tmp/cors-config.json \
    --region "${REGION}"

# Set lifecycle policy (move to Glacier after 90 days, delete after 1 year)
echo -e "${GREEN}Setting lifecycle policy...${NC}"
cat > /tmp/lifecycle-config.json <<EOF
{
    "Rules": [
        {
            "Id": "Move to Glacier after 90 days",
            "Status": "Enabled",
            "Transitions": [
                {
                    "Days": 90,
                    "StorageClass": "GLACIER"
                }
            ],
            "Expiration": {
                "Days": 365
            }
        }
    ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
    --bucket "${BUCKET_NAME}" \
    --lifecycle-configuration file:///tmp/lifecycle-config.json \
    --region "${REGION}"

# Step 3: Create IAM Role for Lambda
echo -e "${GREEN}Step 3: Creating IAM Role for Lambda functions...${NC}"
ROLE_NAME="FeedbackSystemLambdaRole"

# Check if role exists
if aws iam get-role --role-name "${ROLE_NAME}" --region "${REGION}" &>/dev/null; then
    echo -e "${YELLOW}Role ${ROLE_NAME} already exists${NC}"
    ROLE_ARN=$(aws iam get-role --role-name "${ROLE_NAME}" --query 'Role.Arn' --output text)
else
    # Create trust policy
    cat > /tmp/trust-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "lambda.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

    aws iam create-role \
        --role-name "${ROLE_NAME}" \
        --assume-role-policy-document file:///tmp/trust-policy.json \
        --region "${REGION}"

    ROLE_ARN=$(aws iam get-role --role-name "${ROLE_NAME}" --query 'Role.Arn' --output text)

    # Attach basic Lambda execution policy
    aws iam attach-role-policy \
        --role-name "${ROLE_NAME}" \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
        --region "${REGION}"

    # Create and attach custom policy for DynamoDB and S3 access
    cat > /tmp/lambda-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem",
                "dynamodb:GetItem",
                "dynamodb:UpdateItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            "Resource": "arn:aws:dynamodb:${REGION}:*:table/${TABLE_NAME}",
            "Condition": {
                "StringEquals": {
                    "dynamodb:LeadingKeys": ["\${dynamodb:LeadingKeys}"]
                }
            }
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            "Resource": "arn:aws:dynamodb:${REGION}:*:table/${TABLE_NAME}/index/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::${BUCKET_NAME}"
        }
    ]
}
EOF

    POLICY_ARN=$(aws iam create-policy \
        --policy-name "FeedbackSystemLambdaPolicy" \
        --policy-document file:///tmp/lambda-policy.json \
        --region "${REGION}" \
        --query 'Policy.Arn' \
        --output text)

    aws iam attach-role-policy \
        --role-name "${ROLE_NAME}" \
        --policy-arn "${POLICY_ARN}" \
        --region "${REGION}"

    echo -e "${GREEN}Role created: ${ROLE_ARN}${NC}"
fi

# Step 4: Package and deploy Lambda functions
echo -e "${GREEN}Step 4: Deploying Lambda functions...${NC}"
echo -e "${YELLOW}Note: Lambda functions need to be packaged first. Run deploy-lambdas.sh after this script.${NC}"

# Step 5: Create API Gateway REST API
echo -e "${GREEN}Step 5: Creating API Gateway REST API...${NC}"
API_ID=$(aws apigateway create-rest-api \
    --name "${API_NAME}" \
    --description "Feedback System API" \
    --endpoint-configuration types=REGIONAL \
    --region "${REGION}" \
    --query 'id' \
    --output text)

echo -e "${GREEN}API Gateway created with ID: ${API_ID}${NC}"

# Get root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id "${API_ID}" \
    --region "${REGION}" \
    --query 'items[?path==`/`].id' \
    --output text)

# Create /feedback resource
FEEDBACK_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id "${API_ID}" \
    --parent-id "${ROOT_RESOURCE_ID}" \
    --path-part "feedback" \
    --region "${REGION}" \
    --query 'id' \
    --output text)

# Create /feedback/{feedbackId} resource
FEEDBACK_ID_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id "${API_ID}" \
    --parent-id "${FEEDBACK_RESOURCE_ID}" \
    --path-part "{feedbackId}" \
    --region "${REGION}" \
    --query 'id' \
    --output text)

# Create /feedback/stats resource
STATS_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id "${API_ID}" \
    --parent-id "${FEEDBACK_RESOURCE_ID}" \
    --path-part "stats" \
    --region "${REGION}" \
    --query 'id' \
    --output text)

# Create /feedback/{feedbackId}/attachments resource
ATTACHMENTS_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id "${API_ID}" \
    --parent-id "${FEEDBACK_ID_RESOURCE_ID}" \
    --path-part "attachments" \
    --region "${REGION}" \
    --query 'id' \
    --output text)

echo -e "${YELLOW}API Gateway resources created. Lambda integrations need to be configured after Lambda deployment.${NC}"

# Save configuration to file
cat > /tmp/feedback-system-config.json <<EOF
{
    "region": "${REGION}",
    "tableName": "${TABLE_NAME}",
    "bucketName": "${BUCKET_NAME}",
    "apiId": "${API_ID}",
    "apiName": "${API_NAME}",
    "roleArn": "${ROLE_ARN}",
    "resources": {
        "root": "${ROOT_RESOURCE_ID}",
        "feedback": "${FEEDBACK_RESOURCE_ID}",
        "feedbackId": "${FEEDBACK_ID_RESOURCE_ID}",
        "stats": "${STATS_RESOURCE_ID}",
        "attachments": "${ATTACHMENTS_RESOURCE_ID}"
    }
}
EOF

echo -e "${GREEN}Configuration saved to /tmp/feedback-system-config.json${NC}"
echo ""
echo -e "${GREEN}Setup completed!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Run deploy-lambdas.sh to deploy Lambda functions"
echo -e "2. Run update-api-gateway.sh to configure API Gateway integrations"
echo -e "3. Deploy API Gateway stage"

