#!/bin/bash

# AWS Cost Investigation Commands
# Profile and region from your example
PROFILE="namaste"
REGION="us-west-2"

# Get current date and dates for last 30 days
END_DATE=$(date +%Y-%m-%d)
START_DATE=$(date -d "30 days ago" +%Y-%m-%d)

# Get script directory and create output directory with timestamp
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_BASE_DIR="$SCRIPT_DIR/output"
OUTPUT_DIR="$OUTPUT_BASE_DIR/aws-cost-investigation-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTPUT_DIR"
echo "📁 Output directory: $OUTPUT_DIR"
echo ""

# Function to save output to file and display to console
save_and_display() {
    local section_num=$1
    local section_name=$2
    local output_file="$OUTPUT_DIR/$(printf "%02d" $section_num)-${section_name// /-}.txt"
    local json_file="$OUTPUT_DIR/$(printf "%02d" $section_num)-${section_name// /-}.json"
    
    echo "=== $section_num. $section_name ===" | tee "$output_file"
    shift 2
    
    # Run command and capture output
    local cmd_output
    cmd_output=$("$@" 2>&1)
    local exit_code=$?
    
    # Display and save to text file
    echo "$cmd_output" | tee -a "$output_file"
    
    # Try to save as JSON if it's valid JSON
    if command -v jq &> /dev/null && [ $exit_code -eq 0 ]; then
        echo "$cmd_output" | jq . > "$json_file" 2>/dev/null || rm -f "$json_file"
    fi
    echo ""
}

# Temporary files for summary
TEMP_SERVICES=$(mktemp)
TEMP_RESOURCES=$(mktemp)
TEMP_TOTAL=$(mktemp)
TEMP_USAGE=$(mktemp)

# Cleanup function
cleanup() {
    rm -f "$TEMP_SERVICES" "$TEMP_RESOURCES" "$TEMP_TOTAL" "$TEMP_USAGE"
}
trap cleanup EXIT

# 1. Cost by Service (Daily)
save_and_display 1 "Get Cost and Usage by Service (Last 30 Days)" \
aws ce get-cost-and-usage \
  --time-period Start=$START_DATE,End=$END_DATE \
  --granularity DAILY \
  --metrics BlendedCost UnblendedCost UsageQuantity \
  --group-by Key=SERVICE,Type=DIMENSION \
  --profile $PROFILE \
  --region us-east-1 > "$TEMP_SERVICES" 2>&1
cat "$TEMP_SERVICES" > "$OUTPUT_DIR/01-cost-by-service-daily.json" 2>/dev/null || true

# 2. Cost by Service (Monthly)
SERVICES_MONTHLY=$(aws ce get-cost-and-usage \
  --time-period Start=$START_DATE,End=$END_DATE \
  --granularity MONTHLY \
  --metrics BlendedCost UnblendedCost \
  --group-by Key=SERVICE,Type=DIMENSION \
  --profile $PROFILE \
  --region us-east-1 2>&1)
echo "$SERVICES_MONTHLY" | tee "$OUTPUT_DIR/02-cost-by-service-monthly.txt"
echo "$SERVICES_MONTHLY" | jq . > "$OUTPUT_DIR/02-cost-by-service-monthly.json" 2>/dev/null || true

# 3. Top 10 Most Expensive Services
echo "=== 3. Get Top 10 Most Expensive Services ===" | tee "$OUTPUT_DIR/03-top-services.txt"
if command -v jq &> /dev/null; then
    echo "$SERVICES_MONTHLY" | jq -r '.ResultsByTime[0].Groups | sort_by(.Metrics.BlendedCost.Amount | tonumber) | reverse | .[0:10] | .[] | "\(.Keys[0]): $\(.Metrics.BlendedCost.Amount)"' 2>/dev/null | tee -a "$OUTPUT_DIR/03-top-services.txt" || echo "No services found or error parsing" | tee -a "$OUTPUT_DIR/03-top-services.txt"
else
    echo "jq not installed" | tee -a "$OUTPUT_DIR/03-top-services.txt"
fi
echo ""

# 4. Cost by Resource (Last 7 Days) - Note: This API may require specific filters or may not be available
START_DATE_7=$(date -d "7 days ago" +%Y-%m-%d)
echo "=== 4. Get Cost by Resource (Last 7 Days) ===" | tee "$OUTPUT_DIR/04-cost-by-resource.txt"
# Try with filter first, fallback to regular cost-and-usage if it fails
FILTER_FILE=$(mktemp)
cat > "$FILTER_FILE" <<EOF
{
  "Dimensions": {
    "Key": "SERVICE",
    "Values": ["Amazon Elastic Compute Cloud - Compute", "Amazon Relational Database Service", "Amazon Simple Storage Service"]
  }
}
EOF
RESOURCES_COST=$(aws ce get-cost-and-usage-with-resources \
  --time-period Start=$START_DATE_7,End=$END_DATE \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Key=SERVICE,Type=DIMENSION \
  --filter file://"$FILTER_FILE" \
  --profile $PROFILE \
  --region us-east-1 2>&1)
rm -f "$FILTER_FILE"

# If the command failed, try without resource details
if echo "$RESOURCES_COST" | grep -q "error\|Error\|required"; then
    echo "Note: get-cost-and-usage-with-resources requires specific filters. Using regular cost-and-usage instead." | tee -a "$OUTPUT_DIR/04-cost-by-resource.txt"
    RESOURCES_COST=$(aws ce get-cost-and-usage \
      --time-period Start=$START_DATE_7,End=$END_DATE \
      --granularity DAILY \
      --metrics BlendedCost \
      --group-by Key=SERVICE,Type=DIMENSION \
      --profile $PROFILE \
      --region us-east-1 2>&1)
fi

echo "$RESOURCES_COST" | tee -a "$OUTPUT_DIR/04-cost-by-resource.txt"
echo "$RESOURCES_COST" | jq . > "$OUTPUT_DIR/04-cost-by-resource.json" 2>/dev/null || true
echo "$RESOURCES_COST" > "$TEMP_RESOURCES"
echo ""

# 5. Cost by Availability Zone
save_and_display 5 "Get Cost by Availability Zone" \
aws ce get-cost-and-usage \
  --time-period Start=$START_DATE,End=$END_DATE \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Key=AZ,Type=DIMENSION \
  --profile $PROFILE \
  --region us-east-1

# 6. Cost by Instance Type
save_and_display 6 "Get Cost by Instance Type" \
aws ce get-cost-and-usage \
  --time-period Start=$START_DATE,End=$END_DATE \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Key=INSTANCE_TYPE,Type=DIMENSION \
  --profile $PROFILE \
  --region us-east-1

# 7. Cost by Linked Account
save_and_display 7 "Get Cost by Linked Account" \
aws ce get-cost-and-usage \
  --time-period Start=$START_DATE,End=$END_DATE \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Key=LINKED_ACCOUNT,Type=DIMENSION \
  --profile $PROFILE \
  --region us-east-1

# 8. Cost by Tags
save_and_display 8 "Get Cost by Tags (Environment)" \
aws ce get-cost-and-usage \
  --time-period Start=$START_DATE,End=$END_DATE \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Key=Environment,Type=TAG \
  --profile $PROFILE \
  --region us-east-1

# 9. EC2 Instances
save_and_display 9 "List All Running EC2 Instances" \
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query 'Reservations[*].Instances[*].[InstanceId,InstanceType,LaunchTime,Tags[?Key==`Name`].Value|[0]]' \
  --output table \
  --profile $PROFILE \
  --region $REGION

# 10. RDS Instances
save_and_display 10 "List All RDS Instances" \
aws rds describe-db-instances \
  --query 'DBInstances[*].[DBInstanceIdentifier,DBInstanceClass,Engine,DBInstanceStatus]' \
  --output table \
  --profile $PROFILE \
  --region $REGION

# 11. S3 Buckets
save_and_display 11 "List All S3 Buckets" \
aws s3 ls --profile $PROFILE --region $REGION

# 12. EBS Volumes
save_and_display 12 "List All EBS Volumes" \
aws ec2 describe-volumes \
  --query 'Volumes[*].[VolumeId,Size,VolumeType,State,Attachments[0].InstanceId]' \
  --output table \
  --profile $PROFILE \
  --region $REGION

# 13. Elastic IPs
save_and_display 13 "List All Elastic IPs" \
aws ec2 describe-addresses \
  --query 'Addresses[*].[PublicIp,AllocationId,AssociationId,InstanceId]' \
  --output table \
  --profile $PROFILE \
  --region $REGION

# 14. Load Balancers
save_and_display 14 "List All Load Balancers" \
aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[*].[LoadBalancerName,Type,State.Code]' \
  --output table \
  --profile $PROFILE \
  --region $REGION

# 15. CloudWatch Log Groups
save_and_display 15 "List All CloudWatch Log Groups" \
aws logs describe-log-groups \
  --query 'logGroups[*].[logGroupName,retentionInDays,storedBytes]' \
  --output table \
  --profile $PROFILE \
  --region $REGION

# 16. Current Month Cost Summary
MONTH_START=$(date +%Y-%m-01)
TOTAL_COST=$(aws ce get-cost-and-usage \
  --time-period Start=$MONTH_START,End=$END_DATE \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --profile $PROFILE \
  --region us-east-1 2>&1)
echo "=== 16. Get Current Month Cost Summary ===" | tee "$OUTPUT_DIR/16-current-month-cost.txt"
echo "$TOTAL_COST" | tee -a "$OUTPUT_DIR/16-current-month-cost.txt"
echo "$TOTAL_COST" | jq . > "$OUTPUT_DIR/16-current-month-cost.json" 2>/dev/null || true
echo "$TOTAL_COST" > "$TEMP_TOTAL"
echo ""

# 17. Cost Anomaly Detection - Fixed: use StartDate/EndDate instead of Start/End
echo "=== 17. Get Cost Anomaly Detection ===" | tee "$OUTPUT_DIR/17-anomalies.txt"
aws ce get-anomalies \
  --date-interval StartDate=$START_DATE,EndDate=$END_DATE \
  --profile $PROFILE \
  --region us-east-1 2>&1 | tee -a "$OUTPUT_DIR/17-anomalies.txt" || echo "No anomalies found or anomaly detection not enabled" | tee -a "$OUTPUT_DIR/17-anomalies.txt"
echo ""

# 18. Reserved Instance Utilization
save_and_display 18 "Get Reserved Instance Utilization" \
aws ce get-reservation-coverage \
  --time-period Start=$START_DATE,End=$END_DATE \
  --granularity MONTHLY \
  --metrics Cost \
  --profile $PROFILE \
  --region us-east-1

# 19. Savings Plans Coverage
save_and_display 19 "Get Savings Plans Coverage" \
aws ce get-savings-plans-coverage \
  --time-period Start=$START_DATE,End=$END_DATE \
  --granularity MONTHLY \
  --metrics SpendCoveredBySavingsPlans \
  --profile $PROFILE \
  --region us-east-1

# 20. Cost by Usage Type
USAGE_COST=$(aws ce get-cost-and-usage \
  --time-period Start=$START_DATE,End=$END_DATE \
  --granularity MONTHLY \
  --metrics BlendedCost UsageQuantity \
  --group-by Key=USAGE_TYPE,Type=DIMENSION \
  --profile $PROFILE \
  --region us-east-1 2>&1)
echo "=== 20. Get Cost by Usage Type (detailed) ===" | tee "$OUTPUT_DIR/20-cost-by-usage-type.txt"
echo "$USAGE_COST" | tee -a "$OUTPUT_DIR/20-cost-by-usage-type.txt"
echo "$USAGE_COST" | jq . > "$OUTPUT_DIR/20-cost-by-usage-type.json" 2>/dev/null || true
echo "$USAGE_COST" > "$TEMP_USAGE"
echo ""

# ============================================================================
# SUMMARY SECTION
# ============================================================================
SUMMARY_FILE="$OUTPUT_DIR/SUMMARY.txt"
{
echo "=================================================================================="
echo "                           COST INVESTIGATION SUMMARY"
echo "=================================================================================="
echo ""
echo "📊 PERIOD: $START_DATE to $END_DATE (Last 30 days)"
echo "📊 CURRENT MONTH: $MONTH_START to $END_DATE"
echo "📁 All detailed outputs saved to: $OUTPUT_DIR"
echo ""
} | tee "$SUMMARY_FILE"

# Extract total cost
if command -v jq &> /dev/null; then
    TOTAL_AMOUNT=$(echo "$TOTAL_COST" | jq -r '.ResultsByTime[0].Total.BlendedCost.Amount // "0"' 2>/dev/null)
    TOTAL_UNIT=$(echo "$TOTAL_COST" | jq -r '.ResultsByTime[0].Total.BlendedCost.Unit // "USD"' 2>/dev/null)
    
    {
    echo "💰 TOTAL COST (Current Month):"
    if [ "$TOTAL_AMOUNT" != "null" ] && [ "$TOTAL_AMOUNT" != "0" ] && [ "$TOTAL_AMOUNT" != "" ]; then
        printf "   $%s %s\n" "$TOTAL_AMOUNT" "$TOTAL_UNIT"
    else
        echo "   $0.00 USD (or too small to display)"
    fi
    
    echo ""
    echo "📦 SERVICES AND COSTS:"
    echo "$SERVICES_MONTHLY" | jq -r '.ResultsByTime[0].Groups[]? | select(.Metrics.BlendedCost.Amount != "0" and .Metrics.BlendedCost.Amount != "-0" and .Metrics.BlendedCost.Amount != null) | "   • \(.Keys[0]): $\(.Metrics.BlendedCost.Amount) \(.Metrics.BlendedCost.Unit)"' 2>/dev/null | head -20
    if [ $? -ne 0 ] || [ -z "$(echo "$SERVICES_MONTHLY" | jq -r '.ResultsByTime[0].Groups[]? | select(.Metrics.BlendedCost.Amount != "0" and .Metrics.BlendedCost.Amount != "-0" and .Metrics.BlendedCost.Amount != null)' 2>/dev/null)" ]; then
        echo "   No significant service costs found (all services showing $0.00)"
    fi
    
    echo ""
    echo "🔧 RESOURCES IN USE:"
    } | tee -a "$SUMMARY_FILE"
    
    # EC2 Instances
    EC2_COUNT=$(aws ec2 describe-instances \
      --filters "Name=instance-state-name,Values=running" \
      --query 'Reservations[*].Instances[*].InstanceId' \
      --output text \
      --profile $PROFILE \
      --region $REGION 2>/dev/null | wc -w)
    {
    if [ "$EC2_COUNT" -gt 0 ]; then
        echo "   • EC2 Instances (Running): $EC2_COUNT"
        aws ec2 describe-instances \
          --filters "Name=instance-state-name,Values=running" \
          --query 'Reservations[*].Instances[*].[InstanceId,InstanceType,Tags[?Key==`Name`].Value|[0]]' \
          --output text \
          --profile $PROFILE \
          --region $REGION 2>/dev/null | while read instance_id instance_type name; do
            echo "     - $instance_id ($instance_type) - ${name:-No Name}"
        done
    else
        echo "   • EC2 Instances: 0 (none running)"
    fi
    } | tee -a "$SUMMARY_FILE"
    
    # RDS Instances
    RDS_COUNT=$(aws rds describe-db-instances \
      --query 'DBInstances[*].DBInstanceIdentifier' \
      --output text \
      --profile $PROFILE \
      --region $REGION 2>/dev/null | wc -w)
    {
    if [ "$RDS_COUNT" -gt 0 ]; then
        echo "   • RDS Instances: $RDS_COUNT"
        aws rds describe-db-instances \
          --query 'DBInstances[*].[DBInstanceIdentifier,DBInstanceClass,Engine]' \
          --output text \
          --profile $PROFILE \
          --region $REGION 2>/dev/null | while read db_id db_class engine; do
            echo "     - $db_id ($db_class) - $engine"
        done
    else
        echo "   • RDS Instances: 0"
    fi
    } | tee -a "$SUMMARY_FILE"
    
    # S3 Buckets
    S3_COUNT=$(aws s3 ls --profile $PROFILE --region $REGION 2>/dev/null | wc -l)
    {
    if [ "$S3_COUNT" -gt 0 ]; then
        echo "   • S3 Buckets: $S3_COUNT"
        aws s3 ls --profile $PROFILE --region $REGION 2>/dev/null | while read date time size bucket; do
            echo "     - $bucket"
        done
    else
        echo "   • S3 Buckets: 0"
    fi
    } | tee -a "$SUMMARY_FILE"
    
    # EBS Volumes
    EBS_COUNT=$(aws ec2 describe-volumes \
      --query 'Volumes[*].VolumeId' \
      --output text \
      --profile $PROFILE \
      --region $REGION 2>/dev/null | wc -w)
    {
    if [ "$EBS_COUNT" -gt 0 ]; then
        echo "   • EBS Volumes: $EBS_COUNT"
        TOTAL_EBS_SIZE=$(aws ec2 describe-volumes \
          --query 'Volumes[*].Size' \
          --output text \
          --profile $PROFILE \
          --region $REGION 2>/dev/null | awk '{sum+=$1} END {print sum}')
        echo "     Total Size: ${TOTAL_EBS_SIZE:-0} GB"
    else
        echo "   • EBS Volumes: 0"
    fi
    } | tee -a "$SUMMARY_FILE"
    
    # Elastic IPs
    EIP_COUNT=$(aws ec2 describe-addresses \
      --query 'Addresses[*].AllocationId' \
      --output text \
      --profile $PROFILE \
      --region $REGION 2>/dev/null | wc -w)
    {
    if [ "$EIP_COUNT" -gt 0 ]; then
        UNATTACHED_EIP=$(aws ec2 describe-addresses \
          --query 'Addresses[?AssociationId==null].AllocationId' \
          --output text \
          --profile $PROFILE \
          --region $REGION 2>/dev/null | wc -w)
        echo "   • Elastic IPs: $EIP_COUNT (Unattached: $UNATTACHED_EIP ⚠️)"
        if [ "$UNATTACHED_EIP" -gt 0 ]; then
            echo "     WARNING: Unattached Elastic IPs cost money!"
        fi
    else
        echo "   • Elastic IPs: 0"
    fi
    } | tee -a "$SUMMARY_FILE"
    
    # Load Balancers
    LB_COUNT=$(aws elbv2 describe-load-balancers \
      --query 'LoadBalancers[*].LoadBalancerArn' \
      --output text \
      --profile $PROFILE \
      --region $REGION 2>/dev/null | wc -w)
    {
    if [ "$LB_COUNT" -gt 0 ]; then
        echo "   • Load Balancers: $LB_COUNT"
        aws elbv2 describe-load-balancers \
          --query 'LoadBalancers[*].[LoadBalancerName,Type]' \
          --output text \
          --profile $PROFILE \
          --region $REGION 2>/dev/null | while read lb_name lb_type; do
            echo "     - $lb_name ($lb_type)"
        done
    else
        echo "   • Load Balancers: 0"
    fi
    } | tee -a "$SUMMARY_FILE"
    
    # CloudWatch Log Groups
    LOG_GROUPS=$(aws logs describe-log-groups \
      --query 'logGroups[*].logGroupName' \
      --output text \
      --profile $PROFILE \
      --region $REGION 2>/dev/null | wc -w)
    {
    if [ "$LOG_GROUPS" -gt 0 ]; then
        echo "   • CloudWatch Log Groups: $LOG_GROUPS"
    else
        echo "   • CloudWatch Log Groups: 0"
    fi
    
    echo ""
    echo "📈 USAGE BREAKDOWN (Top Usage Types with Cost):"
    echo "$USAGE_COST" | jq -r '.ResultsByTime[0].Groups[]? | select(.Metrics.BlendedCost.Amount != "0" and .Metrics.BlendedCost.Amount != "-0" and .Metrics.BlendedCost.Amount != null) | "   • \(.Keys[0]): $\(.Metrics.BlendedCost.Amount) \(.Metrics.BlendedCost.Unit) (Usage: \(.Metrics.UsageQuantity.Amount // "N/A") \(.Metrics.UsageQuantity.Unit // ""))"' 2>/dev/null | head -10
    if [ $? -ne 0 ] || [ -z "$(echo "$USAGE_COST" | jq -r '.ResultsByTime[0].Groups[]? | select(.Metrics.BlendedCost.Amount != "0" and .Metrics.BlendedCost.Amount != "-0" and .Metrics.BlendedCost.Amount != null)' 2>/dev/null)" ]; then
        echo "   No significant usage costs found"
    fi
    } | tee -a "$SUMMARY_FILE"
    
else
    {
    echo "⚠️  jq not installed - install with: sudo apt-get install jq (Linux) or brew install jq (Mac)"
    echo "   Summary display requires jq for JSON parsing"
    echo ""
    echo "💰 TOTAL COST: See section 16 above"
    echo "📦 SERVICES: See section 2 above"
    echo "🔧 RESOURCES: See sections 9-15 above"
    } | tee -a "$SUMMARY_FILE"
fi

{
echo ""
echo "=================================================================================="
echo "💡 TIP: Review unattached Elastic IPs, unused EBS volumes, and CloudWatch log"
echo "   retention settings to optimize costs."
echo ""
echo "📁 All outputs saved to: $OUTPUT_DIR"
echo "📄 Summary file: $SUMMARY_FILE"
echo "=================================================================================="
} | tee -a "$SUMMARY_FILE"

echo ""
echo "✅ Investigation complete! All results saved to: $OUTPUT_DIR"
echo "📄 Quick summary: cat $SUMMARY_FILE"
