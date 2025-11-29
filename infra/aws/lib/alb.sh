#!/bin/bash
# Application Load Balancer setup module

setup_alb() {
    log "Setting up Application Load Balancer..."
    
    # Check if ALB already exists
    EXISTING_ALB=$($AWS_CMD elbv2 describe-load-balancers \
        --query "LoadBalancers[?LoadBalancerName=='$ALB_NAME'].LoadBalancerArn" \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$EXISTING_ALB" ] && [ "$EXISTING_ALB" != "None" ]; then
        log_warning "ALB '$ALB_NAME' already exists: $EXISTING_ALB"
        DEV_ALB_ARN=$EXISTING_ALB
    else
        if [ "$DRY_RUN" = false ]; then
            DEV_ALB_ARN=$($AWS_CMD elbv2 create-load-balancer \
                --name $ALB_NAME \
                --subnets $SUBNET_1 $SUBNET_2 \
                --security-groups $ALB_SG_ID \
                --scheme internet-facing \
                --ip-address-type ipv4 \
                --type application \
                --query 'LoadBalancers[0].LoadBalancerArn' \
                --output text)
            
            log_success "Created ALB: $DEV_ALB_ARN"
        else
            log "DRY RUN: Would create ALB: $ALB_NAME"
            DEV_ALB_ARN="arn:aws:elasticloadbalancing:dryrun"
        fi
    fi
    
    # Get ALB DNS name
    if [ "$DRY_RUN" = false ] && [ -n "$DEV_ALB_ARN" ] && [ "$DEV_ALB_ARN" != "arn:aws:elasticloadbalancing:dryrun" ]; then
        DEV_ALB_DNS=$($AWS_CMD elbv2 describe-load-balancers \
            --load-balancer-arns $DEV_ALB_ARN \
            --query 'LoadBalancers[0].DNSName' \
            --output text)
    else
        DEV_ALB_DNS="dryrun-alb-dns.us-west-2.elb.amazonaws.com"
    fi
    
    # Create Target Group
    EXISTING_TG=$($AWS_CMD elbv2 describe-target-groups \
        --query "TargetGroups[?TargetGroupName=='$TG_NAME'].TargetGroupArn" \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$EXISTING_TG" ] && [ "$EXISTING_TG" != "None" ]; then
        log_warning "Target Group '$TG_NAME' already exists: $EXISTING_TG"
        DEV_TG_ARN=$EXISTING_TG
    else
        if [ "$DRY_RUN" = false ]; then
            # Disable path conversion for Git Bash to prevent / from being converted to C:/Program Files/Git/
            disable_pathconv
            
            DEV_TG_ARN=$($AWS_CMD elbv2 create-target-group \
                --name $TG_NAME \
                --protocol HTTP \
                --port 3000 \
                --vpc-id $DEFAULT_VPC_ID \
                --target-type ip \
                --health-check-path / \
                --health-check-interval-seconds 30 \
                --health-check-timeout-seconds 5 \
                --healthy-threshold-count 2 \
                --unhealthy-threshold-count 3 \
                --query 'TargetGroups[0].TargetGroupArn' \
                --output text)
            
            # Re-enable path conversion
            enable_pathconv
            
            # Enable stickiness
            $AWS_CMD elbv2 modify-target-group-attributes \
                --target-group-arn $DEV_TG_ARN \
                --attributes Key=stickiness.enabled,Value=true Key=stickiness.type,Value=lb_cookie Key=stickiness.lb_cookie.duration_seconds,Value=3600 \
                >> "$SETUP_LOG" 2>&1
            
            log_success "Created Target Group: $DEV_TG_ARN"
        else
            log "DRY RUN: Would create Target Group: $TG_NAME"
            DEV_TG_ARN="arn:aws:elasticloadbalancing:dryrun"
        fi
    fi
    
    # Create Listener (associates target group with ALB)
    # This is critical - the target group must be associated with ALB via a listener
    # before it can be used by ECS service
    
    if [ "$DRY_RUN" = false ] && [ -n "$DEV_ALB_ARN" ] && [ "$DEV_ALB_ARN" != "arn:aws:elasticloadbalancing:dryrun" ]; then
        # Get all listeners for this ALB
        LISTENERS_JSON=$($AWS_CMD elbv2 describe-listeners \
            --load-balancer-arn $DEV_ALB_ARN \
            --output json 2>/dev/null || echo '{"Listeners":[]}')
        
        # Check if listener on port 80 exists
        LISTENER_80_EXISTS=$(echo "$LISTENERS_JSON" | jq -r '.Listeners[] | select(.Port == 80) | .ListenerArn' 2>/dev/null | head -1 || echo "")
        
        if [ -n "$LISTENER_80_EXISTS" ] && [ "$LISTENER_80_EXISTS" != "null" ]; then
            log "ALB listener on port 80 already exists: $LISTENER_80_EXISTS"
            # Verify target group is associated
            LISTENER_TG=$(echo "$LISTENERS_JSON" | jq -r '.Listeners[] | select(.Port == 80) | .DefaultActions[0].TargetGroupArn' 2>/dev/null | head -1 || echo "")
            
            if [ "$LISTENER_TG" = "$DEV_TG_ARN" ]; then
                log_success "Target group is already associated with ALB via existing listener"
            else
                log_warning "Existing listener uses different target group: $LISTENER_TG"
                log "Expected: $DEV_TG_ARN"
                log "Creating a new listener might conflict. Please verify manually."
            fi
        else
            log "Creating ALB listener on port 80 to associate target group with ALB..."
            LISTENER_OUTPUT=$($AWS_CMD elbv2 create-listener \
                --load-balancer-arn $DEV_ALB_ARN \
                --protocol HTTP \
                --port 80 \
                --default-actions Type=forward,TargetGroupArn=$DEV_TG_ARN \
                --output text 2>&1)
            
            if [ $? -eq 0 ]; then
                log_success "Created ALB Listener"
                # Wait for the association to propagate (AWS needs time to associate)
                log "Waiting for target group association to propagate (this may take a few seconds)..."
                sleep 5
                
                # Verify the association
                TG_ALB_CHECK=$($AWS_CMD elbv2 describe-target-groups \
                    --target-group-arns $DEV_TG_ARN \
                    --query 'TargetGroups[0].LoadBalancerArns[0]' \
                    --output text 2>/dev/null || echo "")
                
                if [ "$TG_ALB_CHECK" = "$DEV_ALB_ARN" ]; then
                    log_success "Target group is now associated with ALB"
                else
                    log_warning "Target group association verification failed, but continuing..."
                    log "Association might still be propagating. The ECS service creation will verify this."
                fi
            else
                log_error "Failed to create ALB listener"
                log "$LISTENER_OUTPUT"
                exit 1
            fi
        fi
    else
        log "DRY RUN: Would create ALB Listener"
    fi
    
    # Verify target group is associated with ALB before proceeding
    if [ "$DRY_RUN" = false ] && [ -n "$DEV_ALB_ARN" ] && [ "$DEV_ALB_ARN" != "arn:aws:elasticloadbalancing:dryrun" ]; then
        log "Verifying target group is associated with ALB..."
        TG_ALB=$($AWS_CMD elbv2 describe-target-groups \
            --target-group-arns $DEV_TG_ARN \
            --query "TargetGroups[0].LoadBalancerArns[0]" \
            --output text 2>/dev/null || echo "")
        
        if [ -z "$TG_ALB" ] || [ "$TG_ALB" = "None" ]; then
            log_error "Target group is not associated with any load balancer"
            log "This might be a timing issue. Please wait a moment and verify the listener was created."
            exit 1
        elif [ "$TG_ALB" != "$DEV_ALB_ARN" ]; then
            log_warning "Target group is associated with a different ALB: $TG_ALB"
        else
            log_success "Target group is properly associated with ALB"
        fi
    fi
    
    echo "DEV_ALB_ARN=$DEV_ALB_ARN" >> "$VARS_FILE"
    echo "DEV_ALB_DNS=$DEV_ALB_DNS" >> "$VARS_FILE"
    echo "DEV_TG_ARN=$DEV_TG_ARN" >> "$VARS_FILE"
    
    log "ALB DNS Name: $DEV_ALB_DNS"
    export DEV_ALB_ARN DEV_ALB_DNS DEV_TG_ARN
}

