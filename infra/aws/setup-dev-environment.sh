#!/bin/bash

################################################################################
# AWS Dev Environment Setup Script
# 
# This script automates the setup of AWS infrastructure for the Webyalaya
# development environment.
#
# Prerequisites:
# - AWS CLI installed and configured
# - Appropriate AWS permissions (Administrator or equivalent)
# - jq installed (for JSON parsing)
#
# Usage:
#   ./setup-dev-environment.sh [--profile PROFILE] [--region REGION] [--skip-common]
#
# Options:
#   --profile PROFILE    AWS profile to use (default: namaste)
#   --region REGION      AWS region (default: us-west-2)
#   --skip-common        Skip common setup (IAM roles, VPC, Security Groups)
#   --dry-run            Show what would be created without actually creating
################################################################################

set -euo pipefail

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$SCRIPT_DIR/lib"

# Source all modules
source "$LIB_DIR/utils.sh"
source "$LIB_DIR/env-parser.sh"
source "$LIB_DIR/iam.sh"
source "$LIB_DIR/vpc.sh"
source "$LIB_DIR/security-groups.sh"
source "$LIB_DIR/ecr.sh"
source "$LIB_DIR/cloudwatch.sh"
source "$LIB_DIR/s3.sh"
source "$LIB_DIR/alb.sh"
source "$LIB_DIR/ecs.sh"

# Default values
PROFILE="namaste"
REGION="us-west-2"
SKIP_COMMON=false
DRY_RUN=false
CORS_ORIGINS="http://localhost:3000,https://be.dev.webyalaya.com"
ENV_FILE=""
CREATE_S3_USER=false

# Parse command line arguments
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
        --skip-common)
            SKIP_COMMON=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --cors-origins)
            CORS_ORIGINS="$2"
            shift 2
            ;;
        --env-file)
            ENV_FILE="$2"
            shift 2
            ;;
        --create-s3-user)
            CREATE_S3_USER=true
            shift
            ;;
        --help)
            echo "Usage: $0 [--profile PROFILE] [--region REGION] [--skip-common] [--dry-run] [--cors-origins URL1,URL2,...] [--env-file FILE] [--create-s3-user]"
            echo ""
            echo "Options:"
            echo "  --profile PROFILE        AWS profile to use (default: namaste)"
            echo "  --region REGION          AWS region (default: us-west-2)"
            echo "  --skip-common           Skip common setup (IAM, VPC, Security Groups)"
            echo "  --dry-run                Show what would be created without creating"
            echo "  --cors-origins URLS      Comma-separated list of CORS allowed origins"
            echo "                          (default: http://localhost:3000,https://be.dev.webyalaya.com)"
            echo "  --env-file FILE          Path to file with environment variables for task definition"
            echo "                          Supports JSON format: [{\"name\":\"VAR\",\"value\":\"val\"},...]"
            echo "                          or key-value format: VAR=value (one per line)"
            echo "  --create-s3-user         Create IAM user with S3 permissions and generate access keys"
            echo "  --help                   Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# AWS CLI base command
AWS_CMD="aws --profile $PROFILE --region $REGION"

# Output directory
OUTPUT_DIR="$SCRIPT_DIR/output/setup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTPUT_DIR"
SETUP_LOG="$OUTPUT_DIR/setup.log"
VARS_FILE="$OUTPUT_DIR/created-resources.txt"

# Main execution
main() {
    log "=========================================="
    log "AWS Dev Environment Setup"
    log "=========================================="
    log "Profile: $PROFILE"
    log "Region: $REGION"
    log "Output Directory: $OUTPUT_DIR"
    log "=========================================="
    echo ""
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN MODE - No resources will be created"
        echo ""
    fi
    
    check_prerequisites
    
    if [ "$SKIP_COMMON" = false ]; then
        log "Starting Common Setup..."
        setup_iam_roles
        setup_vpc
        setup_security_groups
        log_success "Common setup completed"
        echo ""
    else
        log "Skipping common setup (using existing resources)"
        # Still need to get VPC and security groups
        setup_vpc
        # Try to get existing security groups
        ALB_SG_ID=$($AWS_CMD ec2 describe-security-groups \
            --filters "Name=group-name,Values=webyalaya-alb-sg" "Name=vpc-id,Values=$DEFAULT_VPC_ID" \
            --query 'SecurityGroups[0].GroupId' \
            --output text 2>/dev/null || echo "")
        ECS_SG_ID=$($AWS_CMD ec2 describe-security-groups \
            --filters "Name=group-name,Values=webyalaya-ecs-task-sg" "Name=vpc-id,Values=$DEFAULT_VPC_ID" \
            --query 'SecurityGroups[0].GroupId' \
            --output text 2>/dev/null || echo "")
        
        if [ -z "$ALB_SG_ID" ] || [ "$ALB_SG_ID" = "None" ]; then
            log_error "ALB Security Group not found. Run without --skip-common or create it manually."
            exit 1
        fi
        if [ -z "$ECS_SG_ID" ] || [ "$ECS_SG_ID" = "None" ]; then
            log_error "ECS Security Group not found. Run without --skip-common or create it manually."
            exit 1
        fi
        export ALB_SG_ID ECS_SG_ID
        echo "ALB_SG_ID=$ALB_SG_ID" >> "$VARS_FILE"
        echo "ECS_SG_ID=$ECS_SG_ID" >> "$VARS_FILE"
    fi
    
    log "Starting Dev Environment Setup..."
    setup_ecr
    setup_cloudwatch_logs
    setup_s3
    
    # Create S3 user if requested
    if [ "$CREATE_S3_USER" = true ]; then
        setup_s3_user
    fi
    
    setup_alb
    setup_ecs_cluster
    setup_task_definition
    setup_ecs_service
    
    if [ "$DRY_RUN" = false ]; then
        verify_setup
    fi
    
    echo ""
    log "=========================================="
    log_success "Setup completed!"
    log "=========================================="
    log "Created resources saved to: $VARS_FILE"
    log "Full log saved to: $SETUP_LOG"
    echo ""
    
    if [ "$DRY_RUN" = false ]; then
        log "Next Steps:"
        log "1. Push Docker image to ECR:"
        log "   aws ecr get-login-password --region $REGION --profile $PROFILE | docker login --username AWS --password-stdin $ECR_URI"
        log "   docker build -t webyalaya-dev-backend-app ."
        log "   docker tag webyalaya-dev-backend-app:latest $ECR_URI:latest"
        log "   docker push $ECR_URI:latest"
        echo ""
        log "2. Update task definition with environment variables (see docs/05-deployment/2-environment-variables.md)"
        echo ""
        log "3. Update frontend NEXT_PUBLIC_API_URL to: http://$DEV_ALB_DNS"
        echo ""
        log "4. Check service status:"
        log "   aws ecs describe-services --cluster $CLUSTER_NAME --services webyalaya-dev-backend-task-service --profile $PROFILE --region $REGION"
    fi
}

# Run main function
main
