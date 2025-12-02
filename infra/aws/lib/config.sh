#!/bin/bash
# Configuration module for AWS infrastructure setup
# This module sets up project and environment-specific naming conventions

# Initialize configuration with defaults
init_config() {
    # PROJECT_NAME and ENVIRONMENT should be set before calling this function
    # They can be passed as environment variables or command-line arguments
    
    # Validate required parameters
    if [ -z "${PROJECT_NAME:-}" ]; then
        log_error "PROJECT_NAME is required. Set it as an environment variable or pass --project-name"
        exit 1
    fi
    
    if [ -z "${ENVIRONMENT:-}" ]; then
        log_error "ENVIRONMENT is required. Set it as an environment variable or pass --environment"
        exit 1
    fi
    
    # Validate PROJECT_NAME (alphanumeric and hyphens only, lowercase)
    if ! echo "$PROJECT_NAME" | grep -qE '^[a-z0-9-]+$'; then
        log_error "PROJECT_NAME must contain only lowercase letters, numbers, and hyphens"
        exit 1
    fi
    
    # Validate ENVIRONMENT (alphanumeric and hyphens only, lowercase)
    if ! echo "$ENVIRONMENT" | grep -qE '^[a-z0-9-]+$'; then
        log_error "ENVIRONMENT must contain only lowercase letters, numbers, and hyphens"
        exit 1
    fi
    
    # Export configuration variables for use in all modules
    export PROJECT_NAME
    export ENVIRONMENT
    
    # Generate resource names based on project and environment
    # These follow AWS naming conventions and are used throughout the setup
    
    # ECS Resources
    export CLUSTER_NAME="${PROJECT_NAME}-${ENVIRONMENT}-backend-cluster"
    export REPO_NAME="${PROJECT_NAME}-${ENVIRONMENT}-backend-app"
    export TASK_FAMILY="${PROJECT_NAME}-${ENVIRONMENT}-backend-task"
    export SERVICE_NAME="${PROJECT_NAME}-${ENVIRONMENT}-backend-task-service"
    export LOG_GROUP="/ecs/${PROJECT_NAME}-${ENVIRONMENT}-backend-task"
    
    # ALB Resources
    export ALB_NAME="${PROJECT_NAME}-${ENVIRONMENT}-alb"
    export TG_NAME="${PROJECT_NAME}-${ENVIRONMENT}-tg"
    
    # S3 Resources
    # Use profile name in bucket name if provided, otherwise just project-env
    if [ -n "${PROFILE:-}" ] && [ "$PROFILE" != "default" ]; then
        export BUCKET_NAME="${PROJECT_NAME}-${ENVIRONMENT}-media-${PROFILE}"
    else
        export BUCKET_NAME="${PROJECT_NAME}-${ENVIRONMENT}-media"
    fi
    export S3_USER_NAME="${PROJECT_NAME}-${ENVIRONMENT}-s3-user"
    
    # Security Groups
    export ALB_SG_NAME="${PROJECT_NAME}-alb-sg"
    export ECS_SG_NAME="${PROJECT_NAME}-ecs-task-sg"
    
    log "Configuration initialized:"
    log "  Project: $PROJECT_NAME"
    log "  Environment: $ENVIRONMENT"
    log "  Cluster: $CLUSTER_NAME"
    log "  ECR Repo: $REPO_NAME"
    log "  Task Family: $TASK_FAMILY"
    log "  Service: $SERVICE_NAME"
    log "  ALB: $ALB_NAME"
    log "  S3 Bucket: $BUCKET_NAME"
}

