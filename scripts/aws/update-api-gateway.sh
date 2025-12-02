#!/bin/bash

# API Gateway Integration Script
# This script configures API Gateway to integrate with Lambda functions

set -e

# Configuration
REGION="${AWS_REGION:-us-east-1}"
API_ID="${FEEDBACK_API_ID}"
STAGE_NAME="${API_STAGE_NAME:-prod}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ -z "${API_ID}" ]; then
    echo -e "${RED}Error: FEEDBACK_API_ID environment variable not set${NC}"
    echo -e "${YELLOW}Please set it or provide API ID from setup-feedback-system.sh output${NC}"
    read -p "Enter API Gateway ID: " API_ID
fi

echo -e "${GREEN}Configuring API Gateway integrations...${NC}"

# Get resource IDs
ROOT_RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id "${API_ID}" \
    --region "${REGION}" \
    --query 'items[?path==`/`].id' \
    --output text)

FEEDBACK_RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id "${API_ID}" \
    --region "${REGION}" \
    --query 'items[?path==`/feedback`].id' \
    --output text)

FEEDBACK_ID_RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id "${API_ID}" \
    --region "${REGION}" \
    --query 'items[?path==`/feedback/{feedbackId}`].id' \
    --output text)

STATS_RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id "${API_ID}" \
    --region "${REGION}" \
    --query 'items[?path==`/feedback/stats`].id' \
    --output text)

ATTACHMENTS_RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id "${API_ID}" \
    --region "${REGION}" \
    --query 'items[?path==`/feedback/{feedbackId}/attachments`].id' \
    --output text)

# Function to create method and integration
setup_method() {
    local RESOURCE_ID=$1
    local METHOD=$2
    local LAMBDA_FUNCTION=$3

    echo -e "${GREEN}Setting up ${METHOD} method for resource ${RESOURCE_ID}...${NC}"

    # Get Lambda function ARN
    LAMBDA_ARN=$(aws lambda get-function \
        --function-name "${LAMBDA_FUNCTION}" \
        --region "${REGION}" \
        --query 'Configuration.FunctionArn' \
        --output text)

    # Create method
    aws apigateway put-method \
        --rest-api-id "${API_ID}" \
        --resource-id "${RESOURCE_ID}" \
        --http-method "${METHOD}" \
        --authorization-type NONE \
        --region "${REGION}" \
        --no-cli-pager || echo "Method may already exist"

    # Create integration
    aws apigateway put-integration \
        --rest-api-id "${API_ID}" \
        --resource-id "${RESOURCE_ID}" \
        --http-method "${METHOD}" \
        --type AWS_PROXY \
        --integration-http-method POST \
        --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" \
        --region "${REGION}" \
        --no-cli-pager

    # Grant API Gateway permission to invoke Lambda
    STATEMENT_ID="api-gateway-invoke-${LAMBDA_FUNCTION}"
    aws lambda add-permission \
        --function-name "${LAMBDA_FUNCTION}" \
        --statement-id "${STATEMENT_ID}" \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:${REGION}:*:${API_ID}/*/*" \
        --region "${REGION}" \
        --no-cli-pager 2>/dev/null || echo "Permission may already exist"
}

# Setup methods
setup_method "${FEEDBACK_RESOURCE_ID}" "POST" "SubmitFeedbackLambda"
setup_method "${FEEDBACK_RESOURCE_ID}" "GET" "GetFeedbackLambda"
setup_method "${FEEDBACK_ID_RESOURCE_ID}" "GET" "GetFeedbackLambda"
setup_method "${STATS_RESOURCE_ID}" "GET" "FeedbackStatsLambda"
setup_method "${ATTACHMENTS_RESOURCE_ID}" "POST" "UploadAttachmentLambda"

# Enable CORS for all resources
enable_cors() {
    local RESOURCE_ID=$1
    local METHODS=$2

    echo -e "${GREEN}Enabling CORS for resource ${RESOURCE_ID}...${NC}"

    for METHOD in ${METHODS}; do
        aws apigateway put-method-response \
            --rest-api-id "${API_ID}" \
            --resource-id "${RESOURCE_ID}" \
            --http-method "${METHOD}" \
            --status-code 200 \
            --response-parameters "method.response.header.Access-Control-Allow-Origin=false" \
            --region "${REGION}" \
            --no-cli-pager 2>/dev/null || true

        aws apigateway put-integration-response \
            --rest-api-id "${API_ID}" \
            --resource-id "${RESOURCE_ID}" \
            --http-method "${METHOD}" \
            --status-code 200 \
            --response-parameters '{"method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
            --region "${REGION}" \
            --no-cli-pager 2>/dev/null || true
    done
}

enable_cors "${FEEDBACK_RESOURCE_ID}" "GET POST"
enable_cors "${FEEDBACK_ID_RESOURCE_ID}" "GET"
enable_cors "${STATS_RESOURCE_ID}" "GET"
enable_cors "${ATTACHMENTS_RESOURCE_ID}" "POST"

# Deploy API
echo -e "${GREEN}Deploying API to ${STAGE_NAME} stage...${NC}"
aws apigateway create-deployment \
    --rest-api-id "${API_ID}" \
    --stage-name "${STAGE_NAME}" \
    --region "${REGION}" \
    --no-cli-pager

API_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE_NAME}"

echo ""
echo -e "${GREEN}API Gateway configured successfully!${NC}"
echo -e "${GREEN}API URL: ${API_URL}${NC}"
echo ""
echo -e "${YELLOW}Available endpoints:${NC}"
echo -e "  POST   ${API_URL}/feedback"
echo -e "  GET    ${API_URL}/feedback"
echo -e "  GET    ${API_URL}/feedback/{feedbackId}"
echo -e "  GET    ${API_URL}/feedback/stats"
echo -e "  POST   ${API_URL}/feedback/{feedbackId}/attachments"

