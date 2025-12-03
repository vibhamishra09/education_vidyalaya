#!/bin/bash

# Lambda Deployment Script
# This script packages and deploys all Lambda functions for the feedback system

set -e

# Parse command line arguments
PROFILE=""
REGION="${AWS_REGION:-us-west-2}"
ROLE_NAME="${LAMBDA_ROLE_NAME:-FeedbackSystemLambdaRole}"

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
        --role-name)
            ROLE_NAME="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --profile PROFILE     AWS profile to use"
            echo "  --region REGION       AWS region (default: us-west-2)"
            echo "  --role-name NAME      IAM role name (default: FeedbackSystemLambdaRole)"
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
LAMBDAS_DIR="$(cd "${SCRIPT_DIR}/../../lambdas/feedback-system" && pwd)"
DIST_DIR="${LAMBDAS_DIR}/dist"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Starting Lambda deployment...${NC}"
if [ -n "${PROFILE}" ]; then
    echo -e "${YELLOW}AWS Profile: ${PROFILE}${NC}"
fi

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
ROLE_ARN=$(aws iam get-role ${AWS_PROFILE_ARG} --role-name "${ROLE_NAME}" --query 'Role.Arn' --output text --region "${REGION}" 2>/dev/null || echo "")

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

# Function to create zip file (cross-platform)
create_zip() {
    local ZIP_FILE=$1
    local SOURCE_DIR=$2
    
    # Remove existing zip if present
    rm -f "${ZIP_FILE}"
    
    if command -v zip &> /dev/null; then
        # Use zip if available (Linux/Mac)
        cd "${SOURCE_DIR}"
        zip -r "${ZIP_FILE}" . > /dev/null
        cd "${LAMBDAS_DIR}"
        zip -r "${ZIP_FILE}" node_modules > /dev/null 2>&1 || true
    else
        # Use PowerShell on Windows/Git Bash
        echo -e "${YELLOW}Using PowerShell to create zip...${NC}"
        
        # Create a temp directory with all files
        local TEMP_PACKAGE="${DIST_DIR}/temp_package_$$"
        mkdir -p "${TEMP_PACKAGE}"
        cp -r "${SOURCE_DIR}"/* "${TEMP_PACKAGE}/"
        cp -r "${LAMBDAS_DIR}/node_modules" "${TEMP_PACKAGE}/" 2>/dev/null || true
        
        # Convert paths for PowerShell (Windows format)
        local PS_SOURCE=$(cygpath -w "${TEMP_PACKAGE}" 2>/dev/null || echo "${TEMP_PACKAGE}")
        local PS_ZIP=$(cygpath -w "${ZIP_FILE}" 2>/dev/null || echo "${ZIP_FILE}")
        
        # Create zip using PowerShell
        powershell.exe -NoProfile -Command "
            if (Test-Path '${PS_ZIP}') { Remove-Item '${PS_ZIP}' -Force }
            Compress-Archive -Path '${PS_SOURCE}\*' -DestinationPath '${PS_ZIP}' -Force
        "
        
        # Clean up temp directory
        rm -rf "${TEMP_PACKAGE}"
        
        # Verify zip was created
        if [ ! -f "${ZIP_FILE}" ]; then
            echo -e "${RED}Error: Failed to create zip file${NC}"
            return 1
        fi
    fi
}

# Convert path for AWS CLI fileb:// protocol on Windows
get_fileb_path() {
    local FILE_PATH=$1
    if command -v cygpath &> /dev/null; then
        # Git Bash - convert to Windows path format
        local WIN_PATH=$(cygpath -w "${FILE_PATH}")
        echo "fileb://${WIN_PATH}"
    else
        echo "fileb://${FILE_PATH}"
    fi
}

# Function to deploy a Lambda
# Args: FUNCTION_NAME SOURCE_FOLDER HANDLER DESCRIPTION
deploy_lambda() {
    local FUNCTION_NAME=$1
    local SOURCE_FOLDER=$2
    local HANDLER=$3
    local DESCRIPTION=$4

    echo -e "${GREEN}Deploying ${FUNCTION_NAME}...${NC}"

    # Create deployment package from the source folder
    local SOURCE_DIR="${DIST_DIR}/${SOURCE_FOLDER}"
    local ZIP_FILE="${DIST_DIR}/${FUNCTION_NAME}.zip"

    if [ ! -d "${SOURCE_DIR}" ]; then
        echo -e "${RED}Error: Source directory not found at ${SOURCE_DIR}${NC}"
        return 1
    fi

    # Create zip file
    create_zip "${ZIP_FILE}" "${SOURCE_DIR}"

    # Get the correct fileb:// path for the platform
    local FILEB_PATH=$(get_fileb_path "${ZIP_FILE}")

    # Check if function exists
    if aws lambda get-function ${AWS_PROFILE_ARG} --function-name "${FUNCTION_NAME}" --region "${REGION}" &>/dev/null 2>&1; then
        # Update existing function
        echo -e "${YELLOW}Updating existing function...${NC}"
        aws lambda update-function-code \
            ${AWS_PROFILE_ARG} \
            --function-name "${FUNCTION_NAME}" \
            --zip-file "${FILEB_PATH}" \
            --region "${REGION}"

        # Update environment variables
        aws lambda update-function-configuration \
            ${AWS_PROFILE_ARG} \
            --function-name "${FUNCTION_NAME}" \
            --environment "${ENV_VARS}" \
            --region "${REGION}"
    else
        # Create new function
        echo -e "${YELLOW}Creating new function...${NC}"
        aws lambda create-function \
            ${AWS_PROFILE_ARG} \
            --function-name "${FUNCTION_NAME}" \
            --runtime nodejs20.x \
            --role "${ROLE_ARN}" \
            --handler "${HANDLER}" \
            --zip-file "${FILEB_PATH}" \
            --description "${DESCRIPTION}" \
            --timeout 30 \
            --memory-size 256 \
            --environment "${ENV_VARS}" \
            --region "${REGION}"
    fi

    # Clean up zip file
    rm -f "${ZIP_FILE}"

    echo -e "${GREEN}${FUNCTION_NAME} deployed successfully${NC}"
}

# Deploy all Lambda functions
# Args: FUNCTION_NAME SOURCE_FOLDER HANDLER DESCRIPTION
deploy_lambda "SubmitFeedbackLambda" "submit-feedback" "index.handler" "Submit feedback to DynamoDB"
deploy_lambda "UploadAttachmentLambda" "upload-attachment" "index.handler" "Upload attachments to S3"
deploy_lambda "GetFeedbackLambda" "get-feedback" "index.handler" "Retrieve feedback from DynamoDB"
deploy_lambda "FeedbackStatsLambda" "feedback-stats" "index.handler" "Calculate feedback statistics"
deploy_lambda "ScheduledFeedbackLambda" "scheduled-feedback" "index.handler" "Scheduled feedback collection"

echo ""
echo -e "${GREEN}All Lambda functions deployed successfully!${NC}"
echo -e "${YELLOW}Next: Configure API Gateway integrations${NC}"

