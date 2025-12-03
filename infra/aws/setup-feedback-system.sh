#!/bin/bash

# AWS Feedback System Setup Script
# This script creates all necessary AWS resources for the feedback logging system

set -e  # Exit on error

# Parse command line arguments
PROFILE=""
REGION="${AWS_REGION:-us-west-2}"
TABLE_NAME="${FEEDBACK_TABLE_NAME:-Feedback}"
BUCKET_NAME="${FEEDBACK_BUCKET_NAME:-webyalaya-feedback-attachments}"
API_NAME="${FEEDBACK_API_NAME:-feedback-api}"
STAGE_NAME="${API_STAGE_NAME:-prod}"

while [[ $# -gt 0 ]]; do
    case $1 in
        --profile)
            PROFILE="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --table-name)
            TABLE_NAME="$2"
            shift 2
            ;;
        --bucket-name)
            BUCKET_NAME="$2"
            shift 2
            ;;
        --api-name)
            API_NAME="$2"
            shift 2
            ;;
        --stage-name)
            STAGE_NAME="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --profile PROFILE     AWS profile to use"
            echo "  --region REGION       AWS region (default: us-west-2)"
            echo "  --table-name NAME    DynamoDB table name (default: Feedback)"
            echo "  --bucket-name NAME    S3 bucket name (default: webyalaya-feedback-attachments)"
            echo "  --api-name NAME       API Gateway name (default: feedback-api)"
            echo "  --stage-name NAME     API Gateway stage (default: prod)"
            echo "  --help                Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Build AWS CLI profile argument
AWS_PROFILE_ARG=""
if [ -n "${PROFILE}" ]; then
    AWS_PROFILE_ARG="--profile ${PROFILE}"
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting AWS Feedback System Setup...${NC}"
if [ -n "${PROFILE}" ]; then
    echo -e "${YELLOW}AWS Profile: ${PROFILE}${NC}"
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity ${AWS_PROFILE_ARG} &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured. Please run 'aws configure'${NC}"
    exit 1
fi

echo -e "${YELLOW}Region: ${REGION}${NC}"
echo -e "${YELLOW}Table Name: ${TABLE_NAME}${NC}"
echo -e "${YELLOW}Bucket Name: ${BUCKET_NAME}${NC}"
echo ""

# Step 1: Create DynamoDB Table
echo -e "${GREEN}Step 1: Creating DynamoDB Table...${NC}"
if aws dynamodb describe-table ${AWS_PROFILE_ARG} --table-name "${TABLE_NAME}" --region "${REGION}" &>/dev/null; then
    echo -e "${YELLOW}Table ${TABLE_NAME} already exists, skipping creation${NC}"
else
    aws dynamodb create-table \
        ${AWS_PROFILE_ARG} \
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
                    \"Projection\": {
                        \"ProjectionType\": \"ALL\"
                    }
                },
                {
                    \"IndexName\": \"status-index\",
                    \"KeySchema\": [
                        {\"AttributeName\": \"status\", \"KeyType\": \"HASH\"},
                        {\"AttributeName\": \"submittedAt\", \"KeyType\": \"RANGE\"}
                    ],
                    \"Projection\": {
                        \"ProjectionType\": \"ALL\"
                    }
                }
            ]" \
        --region "${REGION}"

    echo -e "${GREEN}Waiting for table to be active...${NC}"
    aws dynamodb wait table-exists ${AWS_PROFILE_ARG} --table-name "${TABLE_NAME}" --region "${REGION}"
fi

# Step 2: Create S3 Bucket
echo -e "${GREEN}Step 2: Creating S3 Bucket...${NC}"
if aws s3api head-bucket ${AWS_PROFILE_ARG} --bucket "${BUCKET_NAME}" --region "${REGION}" 2>/dev/null; then
    echo -e "${YELLOW}Bucket ${BUCKET_NAME} already exists, skipping creation${NC}"
else
    if [ "${REGION}" = "us-east-1" ]; then
        aws s3api create-bucket ${AWS_PROFILE_ARG} --bucket "${BUCKET_NAME}" --region "${REGION}"
    else
        aws s3api create-bucket \
            ${AWS_PROFILE_ARG} \
            --bucket "${BUCKET_NAME}" \
            --region "${REGION}" \
            --create-bucket-configuration LocationConstraint="${REGION}"
    fi
    echo -e "${GREEN}Bucket created${NC}"
fi

# Enable versioning
echo -e "${GREEN}Enabling versioning on bucket...${NC}"
aws s3api put-bucket-versioning \
    ${AWS_PROFILE_ARG} \
    --bucket "${BUCKET_NAME}" \
    --versioning-configuration Status=Enabled \
    --region "${REGION}"

# Enable encryption
echo -e "${GREEN}Enabling encryption on bucket...${NC}"
aws s3api put-bucket-encryption \
    ${AWS_PROFILE_ARG} \
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
aws s3api put-bucket-cors \
    ${AWS_PROFILE_ARG} \
    --bucket "${BUCKET_NAME}" \
    --cors-configuration '{"CORSRules":[{"AllowedOrigins":["*"],"AllowedMethods":["GET","PUT","POST","HEAD"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":3000}]}' \
    --region "${REGION}"

# Set lifecycle policy (move to Glacier after 90 days, delete after 1 year)
echo -e "${GREEN}Setting lifecycle policy...${NC}"
aws s3api put-bucket-lifecycle-configuration \
    ${AWS_PROFILE_ARG} \
    --bucket "${BUCKET_NAME}" \
    --lifecycle-configuration '{"Rules":[{"ID":"MoveToGlacierAfter90Days","Status":"Enabled","Filter":{"Prefix":""},"Transitions":[{"Days":90,"StorageClass":"GLACIER"}],"Expiration":{"Days":365}}]}' \
    --region "${REGION}"

# Step 3: Create IAM Role for Lambda
echo -e "${GREEN}Step 3: Creating IAM Role for Lambda functions...${NC}"
ROLE_NAME="FeedbackSystemLambdaRole"

# Check if role exists
if aws iam get-role ${AWS_PROFILE_ARG} --role-name "${ROLE_NAME}" --region "${REGION}" &>/dev/null; then
    echo -e "${YELLOW}Role ${ROLE_NAME} already exists${NC}"
    ROLE_ARN=$(aws iam get-role ${AWS_PROFILE_ARG} --role-name "${ROLE_NAME}" --query 'Role.Arn' --output text)
else
    # Create trust policy - use inline JSON
    aws iam create-role \
        ${AWS_PROFILE_ARG} \
        --role-name "${ROLE_NAME}" \
        --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' \
        --region "${REGION}"

    ROLE_ARN=$(aws iam get-role ${AWS_PROFILE_ARG} --role-name "${ROLE_NAME}" --query 'Role.Arn' --output text)

    # Attach basic Lambda execution policy
    aws iam attach-role-policy \
        ${AWS_PROFILE_ARG} \
        --role-name "${ROLE_NAME}" \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
        --region "${REGION}"

    # Create and attach custom policy for DynamoDB and S3 access - use inline JSON
    LAMBDA_POLICY_JSON="{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:Query\",\"dynamodb:Scan\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:*:table/${TABLE_NAME}\"},{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:Query\",\"dynamodb:Scan\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:*:table/${TABLE_NAME}/index/*\"},{\"Effect\":\"Allow\",\"Action\":[\"s3:PutObject\",\"s3:GetObject\",\"s3:DeleteObject\"],\"Resource\":\"arn:aws:s3:::${BUCKET_NAME}/*\"},{\"Effect\":\"Allow\",\"Action\":[\"s3:ListBucket\"],\"Resource\":\"arn:aws:s3:::${BUCKET_NAME}\"}]}"

    POLICY_ARN=$(aws iam create-policy \
        ${AWS_PROFILE_ARG} \
        --policy-name "FeedbackSystemLambdaPolicy" \
        --policy-document "${LAMBDA_POLICY_JSON}" \
        --region "${REGION}" \
        --query 'Policy.Arn' \
        --output text)

    aws iam attach-role-policy \
        ${AWS_PROFILE_ARG} \
        --role-name "${ROLE_NAME}" \
        --policy-arn "${POLICY_ARN}" \
        --region "${REGION}"

    echo -e "${GREEN}Role created: ${ROLE_ARN}${NC}"
fi

# Step 4: Package and deploy Lambda functions
echo -e "${GREEN}Step 4: Deploying Lambda functions...${NC}"
echo -e "${YELLOW}Note: Lambda functions need to be packaged first. Run deploy-lambdas.sh after this script.${NC}"

# Step 5: Create API Gateway HTTP API
echo -e "${GREEN}Step 5: Creating API Gateway HTTP API...${NC}"
API_ID=$(aws apigatewayv2 create-api \
    ${AWS_PROFILE_ARG} \
    --name "${API_NAME}" \
    --description "Feedback System API" \
    --protocol-type HTTP \
    --cors-configuration AllowOrigins=["*"],AllowMethods=["GET","POST","PUT","DELETE","OPTIONS"],AllowHeaders=["*"],MaxAge=300 \
    --region "${REGION}" \
    --query 'ApiId' \
    --output text)

echo -e "${GREEN}API Gateway HTTP API created with ID: ${API_ID}${NC}"

echo -e "${YELLOW}API Gateway created. Lambda integrations need to be configured after Lambda deployment.${NC}"

# Save configuration to file
CONFIG_FILE="${SCRIPT_DIR}/feedback-system-config.json"
cat > "${CONFIG_FILE}" <<EOF
{
    "profile": "${PROFILE}",
    "region": "${REGION}",
    "tableName": "${TABLE_NAME}",
    "bucketName": "${BUCKET_NAME}",
    "apiId": "${API_ID}",
    "apiName": "${API_NAME}",
    "roleArn": "${ROLE_ARN}"
}
EOF

echo -e "${GREEN}Configuration saved to ${CONFIG_FILE}${NC}"
echo ""
echo -e "${GREEN}Setup completed!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Run deploy-lambdas.sh to deploy Lambda functions"
echo -e "2. Run update-api-gateway.sh to configure API Gateway integrations"
echo -e "3. Deploy API Gateway stage"

