#!/bin/bash

# Lambda Deployment Script
# This script packages and deploys all Lambda functions for the feedback system

set -e

# Configuration
REGION="${AWS_REGION:-us-east-1}"
ROLE_NAME="${LAMBDA_ROLE_NAME:-FeedbackSystemLambdaRole}"
LAMBDAS_DIR="$(cd "$(dirname "$0")/../../lambdas/feedback-system" && pwd)"
DIST_DIR="${LAMBDAS_DIR}/dist"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Starting Lambda deployment...${NC}"

# Check if we're in the right directory
if [ ! -d "${LAMBDAS_DIR}" ]; then
    echo -e "${RED}Error: Lambda functions directory not found at ${LAMBDAS_DIR}${NC}"
    exit 1
fi

cd "${LAMBDAS_DIR}"

# Install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
npm install

# Build TypeScript
echo -e "${GREEN}Building TypeScript...${NC}"
npm run build

# Get IAM role ARN
ROLE_ARN=$(aws iam get-role --role-name "${ROLE_NAME}" --query 'Role.Arn' --output text --region "${REGION}" 2>/dev/null || echo "")

if [ -z "${ROLE_ARN}" ]; then
    echo -e "${RED}Error: IAM role ${ROLE_NAME} not found. Please run setup-feedback-system.sh first.${NC}"
    exit 1
fi

# Environment variables for Lambda
ENV_VARS="{
    \"Variables\": {
        \"FEEDBACK_TABLE_NAME\": \"${FEEDBACK_TABLE_NAME:-Feedback}\",
        \"ATTACHMENTS_BUCKET_NAME\": \"${FEEDBACK_BUCKET_NAME:-webyalaya-feedback-attachments}\",
        \"PRESIGNED_URL_EXPIRY\": \"3600\",
        \"ALLOWED_FILE_TYPES\": \"image/png,image/jpeg,image/jpg,image/gif,text/plain,application/pdf\",
        \"MAX_FILE_SIZE\": \"10485760\"
    }
}"

# Function to deploy a Lambda
deploy_lambda() {
    local FUNCTION_NAME=$1
    local HANDLER=$2
    local DESCRIPTION=$3

    echo -e "${GREEN}Deploying ${FUNCTION_NAME}...${NC}"

    # Create deployment package
    cd "${DIST_DIR}/${FUNCTION_NAME}"
    zip -r "${FUNCTION_NAME}.zip" . > /dev/null
    cd "${LAMBDAS_DIR}"

    # Check if function exists
    if aws lambda get-function --function-name "${FUNCTION_NAME}" --region "${REGION}" &>/dev/null 2>&1; then
        # Update existing function
        echo -e "${YELLOW}Updating existing function...${NC}"
        aws lambda update-function-code \
            --function-name "${FUNCTION_NAME}" \
            --zip-file "fileb://${DIST_DIR}/${FUNCTION_NAME}/${FUNCTION_NAME}.zip" \
            --region "${REGION}" \
            --no-cli-pager

        # Update environment variables
        aws lambda update-function-configuration \
            --function-name "${FUNCTION_NAME}" \
            --environment "${ENV_VARS}" \
            --region "${REGION}" \
            --no-cli-pager
    else
        # Create new function
        echo -e "${YELLOW}Creating new function...${NC}"
        aws lambda create-function \
            --function-name "${FUNCTION_NAME}" \
            --runtime nodejs20.x \
            --role "${ROLE_ARN}" \
            --handler "${HANDLER}" \
            --zip-file "fileb://${DIST_DIR}/${FUNCTION_NAME}/${FUNCTION_NAME}.zip" \
            --description "${DESCRIPTION}" \
            --timeout 30 \
            --memory-size 256 \
            --environment "${ENV_VARS}" \
            --region "${REGION}" \
            --no-cli-pager
    fi

    # Clean up zip file
    rm -f "${DIST_DIR}/${FUNCTION_NAME}/${FUNCTION_NAME}.zip"

    echo -e "${GREEN}${FUNCTION_NAME} deployed successfully${NC}"
}

# Deploy all Lambda functions
deploy_lambda "SubmitFeedbackLambda" "index.handler" "Submit feedback to DynamoDB"
deploy_lambda "UploadAttachmentLambda" "index.handler" "Upload attachments to S3"
deploy_lambda "GetFeedbackLambda" "index.handler" "Retrieve feedback from DynamoDB"
deploy_lambda "FeedbackStatsLambda" "index.handler" "Calculate feedback statistics"
deploy_lambda "ScheduledFeedbackLambda" "index.handler" "Scheduled feedback collection"

echo ""
echo -e "${GREEN}All Lambda functions deployed successfully!${NC}"
echo -e "${YELLOW}Next: Configure API Gateway integrations${NC}"

