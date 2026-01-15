#!/bin/bash

################################################################################
# Fix RDS Security Group Script
# 
# This script adds an inbound rule to the RDS security group to allow
# PostgreSQL connections (port 5432) from the ECS security group.
#
# Usage:
#   ./fix-rds-security-group.sh --rds-instance-id INSTANCE_ID --ecs-sg-id SG_ID [OPTIONS]
#
# Examples:
#   ./fix-rds-security-group.sh --rds-instance-id webyalaya-dev --ecs-sg-id sg-1234567890abcdef0
#   ./fix-rds-security-group.sh --rds-instance-id webyalaya-dev --ecs-sg-id sg-1234567890abcdef0 --profile namaste --region us-west-2
################################################################################

set -euo pipefail

# Default values
PROFILE="namaste"
REGION="us-west-2"
RDS_INSTANCE_ID=""
ECS_SG_ID=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --rds-instance-id)
            RDS_INSTANCE_ID="$2"
            shift 2
            ;;
        --ecs-sg-id)
            ECS_SG_ID="$2"
            shift 2
            ;;
        --profile)
            PROFILE="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 --rds-instance-id INSTANCE_ID --ecs-sg-id SG_ID [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --rds-instance-id ID    RDS instance identifier (required)"
            echo "  --ecs-sg-id ID          ECS security group ID (required)"
            echo "  --profile PROFILE       AWS profile to use (default: namaste)"
            echo "  --region REGION         AWS region (default: us-west-2)"
            echo "  --help                  Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate required parameters
if [ -z "$RDS_INSTANCE_ID" ]; then
    echo "Error: --rds-instance-id is required"
    exit 1
fi

if [ -z "$ECS_SG_ID" ]; then
    echo "Error: --ecs-sg-id is required"
    exit 1
fi

# AWS CLI base command
AWS_CMD="aws --profile $PROFILE --region $REGION"

echo "=========================================="
echo "Fixing RDS Security Group Configuration"
echo "=========================================="
echo "RDS Instance: $RDS_INSTANCE_ID"
echo "ECS Security Group: $ECS_SG_ID"
echo "Region: $REGION"
echo "Profile: $PROFILE"
echo "=========================================="
echo ""

# Get RDS instance details
echo "Fetching RDS instance information..."
RDS_INFO=$($AWS_CMD rds describe-db-instances \
    --db-instance-identifier "$RDS_INSTANCE_ID" \
    --query 'DBInstances[0].{VpcId:DBSubnetGroup.VpcId,SecurityGroups:VpcSecurityGroups[*].VpcSecurityGroupId}' \
    --output json)

if [ "$RDS_INFO" = "null" ] || [ -z "$RDS_INFO" ]; then
    echo "Error: RDS instance '$RDS_INSTANCE_ID' not found"
    exit 1
fi

# Extract VPC ID and security groups
RDS_VPC_ID=$(echo "$RDS_INFO" | grep -o '"VpcId": "[^"]*"' | cut -d'"' -f4)
RDS_SG_IDS=$(echo "$RDS_INFO" | grep -o '"VpcSecurityGroupId": "[^"]*"' | cut -d'"' -f4)

if [ -z "$RDS_VPC_ID" ]; then
    echo "Error: Could not determine VPC ID for RDS instance"
    exit 1
fi

if [ -z "$RDS_SG_IDS" ]; then
    echo "Error: RDS instance has no security groups"
    exit 1
fi

echo "✓ Found RDS instance in VPC: $RDS_VPC_ID"
echo "✓ RDS Security Groups: $RDS_SG_IDS"
echo ""

# Verify ECS security group exists and is in the same VPC
echo "Verifying ECS security group..."
ECS_SG_INFO=$($AWS_CMD ec2 describe-security-groups \
    --group-ids "$ECS_SG_ID" \
    --query 'SecurityGroups[0].{GroupId:GroupId,VpcId:VpcId,GroupName:GroupName}' \
    --output json)

if [ "$ECS_SG_INFO" = "null" ] || [ -z "$ECS_SG_INFO" ]; then
    echo "Error: ECS security group '$ECS_SG_ID' not found"
    exit 1
fi

ECS_VPC_ID=$(echo "$ECS_SG_INFO" | grep -o '"VpcId": "[^"]*"' | cut -d'"' -f4)
ECS_SG_NAME=$(echo "$ECS_SG_INFO" | grep -o '"GroupName": "[^"]*"' | cut -d'"' -f4)

if [ "$ECS_VPC_ID" != "$RDS_VPC_ID" ]; then
    echo "Warning: ECS security group is in VPC $ECS_VPC_ID, but RDS is in VPC $RDS_VPC_ID"
    echo "They must be in the same VPC for this to work."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "✓ ECS Security Group: $ECS_SG_NAME ($ECS_SG_ID)"
echo ""

# Add PostgreSQL port 5432 rule to each RDS security group
for RDS_SG_ID in $RDS_SG_IDS; do
    echo "Processing RDS Security Group: $RDS_SG_ID"
    
    # Check if rule already exists
    EXISTING_RULE=$($AWS_CMD ec2 describe-security-groups \
        --group-ids "$RDS_SG_ID" \
        --filters "Name=ip-permission.from-port,Values=5432" "Name=ip-permission.to-port,Values=5432" "Name=ip-permission.user-id-group-pair.group-id,Values=$ECS_SG_ID" \
        --query 'SecurityGroups[0].IpPermissions[?FromPort==`5432` && ToPort==`5432` && length(UserIdGroupPairs[?GroupId==`'$ECS_SG_ID'`]) > `0`]' \
        --output json 2>/dev/null || echo "[]")
    
    if [ "$EXISTING_RULE" != "[]" ] && [ -n "$EXISTING_RULE" ] && [ "$EXISTING_RULE" != "null" ]; then
        echo "  ⚠️  Rule already exists allowing port 5432 from ECS security group"
    else
        echo "  Adding inbound rule: PostgreSQL (5432) from ECS security group..."
        $AWS_CMD ec2 authorize-security-group-ingress \
            --group-id "$RDS_SG_ID" \
            --protocol tcp \
            --port 5432 \
            --source-group "$ECS_SG_ID" \
            --output text
        
        if [ $? -eq 0 ]; then
            echo "  ✓ Successfully added rule to $RDS_SG_ID"
        else
            echo "  ✗ Failed to add rule to $RDS_SG_ID"
            exit 1
        fi
    fi
    echo ""
done

echo "=========================================="
echo "✓ RDS Security Group Configuration Complete"
echo "=========================================="
echo ""
echo "The RDS security group(s) now allow PostgreSQL connections (port 5432)"
echo "from your ECS tasks. Your application should be able to connect to the database."
echo ""
echo "If you're still experiencing connection issues, verify:"
echo "1. ECS tasks are running in the same VPC as RDS"
echo "2. DATABASE_URL environment variable is correctly set in your ECS task definition"
echo "3. RDS instance is accessible (not paused or in maintenance mode)"
