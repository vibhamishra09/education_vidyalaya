#!/bin/bash

# API Gateway Integration Script
# This script configures HTTP API Gateway to integrate with Lambda functions

set -e

# Parse command line arguments
PROFILE=""
REGION="${AWS_REGION:-us-west-2}"
API_ID="${FEEDBACK_API_ID}"
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
        --api-id)
            API_ID="$2"
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
            echo "  --api-id ID           API Gateway ID (or set FEEDBACK_API_ID env var)"
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

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ -z "${API_ID}" ]; then
    echo -e "${RED}Error: FEEDBACK_API_ID environment variable not set and --api-id not provided${NC}"
    echo -e "${YELLOW}Please set it or provide API ID from setup-feedback-system.sh output${NC}"
    read -p "Enter API Gateway ID: " API_ID
fi

echo -e "${GREEN}Configuring HTTP API Gateway integrations...${NC}"
if [ -n "${PROFILE}" ]; then
    echo -e "${YELLOW}AWS Profile: ${PROFILE}${NC}"
fi

# Function to create integration and route
setup_route() {
    local ROUTE_PATH=$1
    local METHOD=$2
    local LAMBDA_FUNCTION=$3

    echo -e "${GREEN}Setting up ${METHOD} ${ROUTE_PATH} route...${NC}"

    # Get Lambda function ARN
    LAMBDA_ARN=$(aws lambda get-function \
        ${AWS_PROFILE_ARG} \
        --function-name "${LAMBDA_FUNCTION}" \
        --region "${REGION}" \
        --query 'Configuration.FunctionArn' \
        --output text)

    # Create or get existing integration
    INTEGRATION_ID=$(aws apigatewayv2 get-integrations \
        ${AWS_PROFILE_ARG} \
        --api-id "${API_ID}" \
        --region "${REGION}" \
        --query "Items[?IntegrationUri==\`arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations\`].IntegrationId" \
        --output text 2>/dev/null)

    if [ -z "${INTEGRATION_ID}" ]; then
        INTEGRATION_ID=$(aws apigatewayv2 create-integration \
            ${AWS_PROFILE_ARG} \
            --api-id "${API_ID}" \
            --integration-type AWS_PROXY \
            --integration-method POST \
            --integration-uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" \
            --payload-format-version "2.0" \
            --region "${REGION}" \
            --query 'IntegrationId' \
            --output text)
        echo -e "${YELLOW}Created integration: ${INTEGRATION_ID}${NC}"
    else
        echo -e "${YELLOW}Using existing integration: ${INTEGRATION_ID}${NC}"
    fi

    # Create or update route
    ROUTE_KEY="${METHOD} ${ROUTE_PATH}"
    EXISTING_ROUTE=$(aws apigatewayv2 get-routes \
        ${AWS_PROFILE_ARG} \
        --api-id "${API_ID}" \
        --region "${REGION}" \
        --query "Items[?RouteKey==\`${ROUTE_KEY}\`].RouteId" \
        --output text 2>/dev/null)

    if [ -z "${EXISTING_ROUTE}" ]; then
        aws apigatewayv2 create-route \
            ${AWS_PROFILE_ARG} \
            --api-id "${API_ID}" \
            --route-key "${ROUTE_KEY}" \
            --target "integrations/${INTEGRATION_ID}" \
            --region "${REGION}"
        echo -e "${YELLOW}Created route: ${ROUTE_KEY}${NC}"
    else
        aws apigatewayv2 update-route \
            ${AWS_PROFILE_ARG} \
            --api-id "${API_ID}" \
            --route-id "${EXISTING_ROUTE}" \
            --target "integrations/${INTEGRATION_ID}" \
            --region "${REGION}"
        echo -e "${YELLOW}Updated route: ${ROUTE_KEY}${NC}"
    fi

    # Grant API Gateway permission to invoke Lambda
    # For HTTP API, use wildcard source ARN
    STATEMENT_ID="api-gateway-invoke-${LAMBDA_FUNCTION}-$(echo ${ROUTE_PATH} | tr '/' '-' | tr '{' '-' | tr '}' '-' | tr ' ' '-')"
    aws lambda add-permission \
        ${AWS_PROFILE_ARG} \
        --function-name "${LAMBDA_FUNCTION}" \
        --statement-id "${STATEMENT_ID}" \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:${REGION}:*:${API_ID}/*/*" \
        --region "${REGION}" 2>/dev/null || echo "Permission may already exist"
}

# Setup routes
setup_route "/feedback" "POST" "SubmitFeedbackLambda"
setup_route "/feedback" "GET" "GetFeedbackLambda"
setup_route "/feedback/{feedbackId}" "GET" "GetFeedbackLambda"
setup_route "/feedback/stats" "GET" "FeedbackStatsLambda"
setup_route "/feedback/{feedbackId}/attachments" "POST" "UploadAttachmentLambda"

# Create or update stage
echo -e "${GREEN}Creating/updating ${STAGE_NAME} stage...${NC}"
aws apigatewayv2 create-stage \
    ${AWS_PROFILE_ARG} \
    --api-id "${API_ID}" \
    --stage-name "${STAGE_NAME}" \
    --auto-deploy \
    --region "${REGION}" 2>/dev/null || \
aws apigatewayv2 update-stage \
    ${AWS_PROFILE_ARG} \
    --api-id "${API_ID}" \
    --stage-name "${STAGE_NAME}" \
    --auto-deploy \
    --region "${REGION}"

# Get API endpoint
API_ENDPOINT=$(aws apigatewayv2 get-api \
    ${AWS_PROFILE_ARG} \
    --api-id "${API_ID}" \
    --region "${REGION}" \
    --query 'ApiEndpoint' \
    --output text)

API_URL="${API_ENDPOINT}/${STAGE_NAME}"

echo ""
echo -e "${GREEN}HTTP API Gateway configured successfully!${NC}"
echo -e "${GREEN}API URL: ${API_URL}${NC}"
echo ""
echo -e "${YELLOW}Available endpoints:${NC}"
echo -e "  POST   ${API_URL}/feedback"
echo -e "  GET    ${API_URL}/feedback"
echo -e "  GET    ${API_URL}/feedback/{feedbackId}"
echo -e "  GET    ${API_URL}/feedback/stats"
echo -e "  POST   ${API_URL}/feedback/{feedbackId}/attachments"
echo ""
echo -e "${YELLOW}Note: HTTP API Gateway is cheaper than REST API Gateway${NC}"

