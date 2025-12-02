#!/bin/bash
# CloudWatch logs setup module

setup_cloudwatch_logs() {
    log "Setting up CloudWatch log group..."
    
    # Disable path conversion for Git Bash to prevent /ecs/ from being converted to C:/Program Files/Git/ecs/
    disable_pathconv
    
    if $AWS_CMD logs describe-log-groups --log-group-name-prefix "$LOG_GROUP" --query "logGroups[?logGroupName=='$LOG_GROUP']" --output text | grep -q "$LOG_GROUP"; then
        log_warning "CloudWatch log group '$LOG_GROUP' already exists"
    else
        if [ "$DRY_RUN" = false ]; then
            $AWS_CMD logs create-log-group --log-group-name "$LOG_GROUP" >> "$SETUP_LOG" 2>&1
            log_success "Created CloudWatch log group: $LOG_GROUP"
        else
            log "DRY RUN: Would create CloudWatch log group: $LOG_GROUP"
        fi
    fi
    
    # Re-enable path conversion
    enable_pathconv
    
    echo "CLOUDWATCH_LOG_GROUP=$LOG_GROUP" >> "$VARS_FILE"
}

