#!/bin/bash

# CloudWatch Monitoring Setup Script
# This script sets up CloudWatch alarms and dashboards for the feedback system

set -e

# Configuration
REGION="${AWS_REGION:-us-east-1}"
TABLE_NAME="${FEEDBACK_TABLE_NAME:-Feedback}"
BUCKET_NAME="${FEEDBACK_BUCKET_NAME:-webyalaya-feedback-attachments}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Setting up CloudWatch monitoring for feedback system...${NC}"

# Lambda function names
LAMBDA_FUNCTIONS=(
  "SubmitFeedbackLambda"
  "UploadAttachmentLambda"
  "GetFeedbackLambda"
  "FeedbackStatsLambda"
)

# Create CloudWatch alarms for each Lambda function
for FUNCTION_NAME in "${LAMBDA_FUNCTIONS[@]}"; do
  echo -e "${GREEN}Creating alarms for ${FUNCTION_NAME}...${NC}"
  
  # Error rate alarm
  aws cloudwatch put-metric-alarm \
    --alarm-name "${FUNCTION_NAME}-HighErrorRate" \
    --alarm-description "Alert when ${FUNCTION_NAME} error rate exceeds 5%" \
    --metric-name Errors \
    --namespace AWS/Lambda \
    --statistic Sum \
    --period 300 \
    --threshold 5 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 1 \
    --dimensions Name=FunctionName,Value="${FUNCTION_NAME}" \
    --region "${REGION}" \
    --no-cli-pager || echo "Alarm may already exist"

  # Duration alarm
  aws cloudwatch put-metric-alarm \
    --alarm-name "${FUNCTION_NAME}-HighDuration" \
    --alarm-description "Alert when ${FUNCTION_NAME} duration exceeds 5 seconds" \
    --metric-name Duration \
    --namespace AWS/Lambda \
    --statistic Average \
    --period 300 \
    --threshold 5000 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --dimensions Name=FunctionName,Value="${FUNCTION_NAME}" \
    --region "${REGION}" \
    --no-cli-pager || echo "Alarm may already exist"

  # Throttles alarm
  aws cloudwatch put-metric-alarm \
    --alarm-name "${FUNCTION_NAME}-Throttles" \
    --alarm-description "Alert when ${FUNCTION_NAME} is throttled" \
    --metric-name Throttles \
    --namespace AWS/Lambda \
    --statistic Sum \
    --period 300 \
    --threshold 1 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 1 \
    --dimensions Name=FunctionName,Value="${FUNCTION_NAME}" \
    --region "${REGION}" \
    --no-cli-pager || echo "Alarm may already exist"
done

# DynamoDB alarms
echo -e "${GREEN}Creating DynamoDB alarms...${NC}"

# Read throttles
aws cloudwatch put-metric-alarm \
  --alarm-name "${TABLE_NAME}-ReadThrottles" \
  --alarm-description "Alert when ${TABLE_NAME} read throttles occur" \
  --metric-name ReadThrottleEvents \
  --namespace AWS/DynamoDB \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=TableName,Value="${TABLE_NAME}" \
  --region "${REGION}" \
  --no-cli-pager || echo "Alarm may already exist"

# Write throttles
aws cloudwatch put-metric-alarm \
  --alarm-name "${TABLE_NAME}-WriteThrottles" \
  --alarm-description "Alert when ${TABLE_NAME} write throttles occur" \
  --metric-name WriteThrottleEvents \
  --namespace AWS/DynamoDB \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=TableName,Value="${TABLE_NAME}" \
  --region "${REGION}" \
  --no-cli-pager || echo "Alarm may already exist"

# S3 alarms (if needed)
echo -e "${GREEN}Creating S3 monitoring...${NC}"
echo -e "${YELLOW}Note: S3 metrics are available in CloudWatch automatically${NC}"

# Create CloudWatch Dashboard
echo -e "${GREEN}Creating CloudWatch Dashboard...${NC}"

DASHBOARD_BODY=$(cat <<EOF
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/Lambda", "Invocations", { "stat": "Sum", "label": "SubmitFeedbackLambda" }, { "FunctionName": "SubmitFeedbackLambda" } ],
          [ "...", "UploadAttachmentLambda", { "FunctionName": "UploadAttachmentLambda" } ],
          [ "...", "GetFeedbackLambda", { "FunctionName": "GetFeedbackLambda" } ],
          [ "...", "FeedbackStatsLambda", { "FunctionName": "FeedbackStatsLambda" } ]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "${REGION}",
        "title": "Lambda Invocations"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/Lambda", "Errors", { "stat": "Sum", "label": "SubmitFeedbackLambda" }, { "FunctionName": "SubmitFeedbackLambda" } ],
          [ "...", "UploadAttachmentLambda", { "FunctionName": "UploadAttachmentLambda" } ],
          [ "...", "GetFeedbackLambda", { "FunctionName": "GetFeedbackLambda" } ],
          [ "...", "FeedbackStatsLambda", { "FunctionName": "FeedbackStatsLambda" } ]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "${REGION}",
        "title": "Lambda Errors"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/Lambda", "Duration", { "stat": "Average", "label": "SubmitFeedbackLambda" }, { "FunctionName": "SubmitFeedbackLambda" } ],
          [ "...", "UploadAttachmentLambda", { "FunctionName": "UploadAttachmentLambda" } ],
          [ "...", "GetFeedbackLambda", { "FunctionName": "GetFeedbackLambda" } ],
          [ "...", "FeedbackStatsLambda", { "FunctionName": "FeedbackStatsLambda" } ]
        ],
        "period": 300,
        "stat": "Average",
        "region": "${REGION}",
        "title": "Lambda Duration (ms)"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/DynamoDB", "ConsumedReadCapacityUnits", { "stat": "Sum", "label": "Read Capacity" }, { "TableName": "${TABLE_NAME}" } ],
          [ "AWS/DynamoDB", "ConsumedWriteCapacityUnits", { "stat": "Sum", "label": "Write Capacity" }, { "TableName": "${TABLE_NAME}" } ]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "${REGION}",
        "title": "DynamoDB Capacity"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/DynamoDB", "ReadThrottleEvents", { "stat": "Sum" }, { "TableName": "${TABLE_NAME}" } ],
          [ "AWS/DynamoDB", "WriteThrottleEvents", { "stat": "Sum" }, { "TableName": "${TABLE_NAME}" } ]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "${REGION}",
        "title": "DynamoDB Throttles"
      }
    },
    {
      "type": "log",
      "properties": {
        "query": "SOURCE '/aws/lambda/SubmitFeedbackLambda' | fields @timestamp, @message\n| filter @message like /ERROR/\n| sort @timestamp desc\n| limit 20",
        "region": "${REGION}",
        "title": "Recent Lambda Errors",
        "view": "table"
      }
    }
  ]
}
EOF
)

aws cloudwatch put-dashboard \
  --dashboard-name "FeedbackSystem" \
  --dashboard-body "${DASHBOARD_BODY}" \
  --region "${REGION}" \
  --no-cli-pager

echo ""
echo -e "${GREEN}Monitoring setup completed!${NC}"
echo -e "${YELLOW}View dashboard at: https://console.aws.amazon.com/cloudwatch/home?region=${REGION}#dashboards:name=FeedbackSystem${NC}"

