#!/bin/bash
# Security groups setup module

setup_security_groups() {
    log "Setting up Security Groups..."
    
    # ALB Security Group
    ALB_SG_ID=$($AWS_CMD ec2 describe-security-groups \
        --filters "Name=group-name,Values=$ALB_SG_NAME" "Name=vpc-id,Values=$DEFAULT_VPC_ID" \
        --query 'SecurityGroups[0].GroupId' \
        --output text 2>/dev/null || echo "")
    
    if [ "$ALB_SG_ID" = "None" ] || [ -z "$ALB_SG_ID" ]; then
        if [ "$DRY_RUN" = false ]; then
            ALB_SG_ID=$($AWS_CMD ec2 create-security-group \
                --group-name "$ALB_SG_NAME" \
                --description "Security group for ${PROJECT_NAME} ALB" \
                --vpc-id $DEFAULT_VPC_ID \
                --query 'GroupId' \
                --output text)
            
            $AWS_CMD ec2 authorize-security-group-ingress \
                --group-id $ALB_SG_ID \
                --protocol tcp \
                --port 80 \
                --cidr 0.0.0.0/0 \
                >> "$SETUP_LOG" 2>&1
            
            $AWS_CMD ec2 authorize-security-group-ingress \
                --group-id $ALB_SG_ID \
                --protocol tcp \
                --port 443 \
                --cidr 0.0.0.0/0 \
                >> "$SETUP_LOG" 2>&1
            
            log_success "Created ALB Security Group: $ALB_SG_ID"
        else
            log "DRY RUN: Would create ALB Security Group"
            ALB_SG_ID="sg-dryrun"
        fi
    else
        log_warning "ALB Security Group already exists: $ALB_SG_ID"
    fi
    
    # ECS Task Security Group
    ECS_SG_ID=$($AWS_CMD ec2 describe-security-groups \
        --filters "Name=group-name,Values=$ECS_SG_NAME" "Name=vpc-id,Values=$DEFAULT_VPC_ID" \
        --query 'SecurityGroups[0].GroupId' \
        --output text 2>/dev/null || echo "")
    
    if [ "$ECS_SG_ID" = "None" ] || [ -z "$ECS_SG_ID" ]; then
        if [ "$DRY_RUN" = false ]; then
            ECS_SG_ID=$($AWS_CMD ec2 create-security-group \
                --group-name "$ECS_SG_NAME" \
                --description "Security group for ${PROJECT_NAME} ECS tasks" \
                --vpc-id $DEFAULT_VPC_ID \
                --query 'GroupId' \
                --output text)
            
            $AWS_CMD ec2 authorize-security-group-ingress \
                --group-id $ECS_SG_ID \
                --protocol tcp \
                --port 3000 \
                --source-group $ALB_SG_ID \
                >> "$SETUP_LOG" 2>&1
            
            log_success "Created ECS Task Security Group: $ECS_SG_ID"
        else
            log "DRY RUN: Would create ECS Task Security Group"
            ECS_SG_ID="sg-dryrun"
        fi
    else
        log_warning "ECS Task Security Group already exists: $ECS_SG_ID"
    fi
    
    echo "ALB_SG_ID=$ALB_SG_ID" >> "$VARS_FILE"
    echo "ECS_SG_ID=$ECS_SG_ID" >> "$VARS_FILE"
    
    export ALB_SG_ID ECS_SG_ID
}

