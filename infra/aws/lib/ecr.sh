#!/bin/bash
# ECR repository setup module

setup_ecr() {
    log "Setting up ECR repository..."
    
    if $AWS_CMD ecr describe-repositories --repository-names $REPO_NAME &> /dev/null; then
        log_warning "ECR repository '$REPO_NAME' already exists"
    else
        if [ "$DRY_RUN" = false ]; then
            $AWS_CMD ecr create-repository \
                --repository-name $REPO_NAME \
                --image-scanning-configuration scanOnPush=true \
                --encryption-configuration encryptionType=AES256 \
                >> "$SETUP_LOG" 2>&1
            
            log_success "Created ECR repository: $REPO_NAME"
        else
            log "DRY RUN: Would create ECR repository: $REPO_NAME"
        fi
    fi
    
    AWS_ACCOUNT_ID=$(get_account_id)
    ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}"
    
    echo "ECR_REPOSITORY=$REPO_NAME" >> "$VARS_FILE"
    echo "ECR_URI=$ECR_URI" >> "$VARS_FILE"
    
    log "ECR Repository URI: $ECR_URI"
    export ECR_URI
}

