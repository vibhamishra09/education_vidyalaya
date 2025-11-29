#!/bin/bash
# ECS setup module

setup_ecs_service_linked_role() {
    log "Checking ECS service linked role..."
    
    SERVICE_LINKED_ROLE="AWSServiceRoleForECS"
    
    # Check if the service linked role exists
    if $AWS_CMD iam get-role --role-name $SERVICE_LINKED_ROLE &> /dev/null; then
        log "ECS service linked role already exists"
    else
        log "ECS service linked role not found. Creating it..."
        if [ "$DRY_RUN" = false ]; then
            # Create the ECS service linked role
            $AWS_CMD iam create-service-linked-role \
                --aws-service-name ecs.amazonaws.com \
                >> "$SETUP_LOG" 2>&1
            
            if [ $? -eq 0 ]; then
                log_success "Created ECS service linked role"
                # Wait a moment for the role to be fully available
                sleep 2
            else
                # Check if it was created by another process (race condition)
                if $AWS_CMD iam get-role --role-name $SERVICE_LINKED_ROLE &> /dev/null; then
                    log "ECS service linked role now exists (may have been created concurrently)"
                else
                    log_error "Failed to create ECS service linked role"
                    log "You may need to create it manually via AWS Console: IAM → Roles → Create role → AWS service → ECS"
                    exit 1
                fi
            fi
        else
            log "DRY RUN: Would create ECS service linked role"
        fi
    fi
}

setup_ecs_cluster() {
    log "Setting up ECS cluster..."
    
    # Ensure ECS service linked role exists first
    setup_ecs_service_linked_role
    
    CLUSTER_NAME="webyalaya-dev-backend-cluster"
    
    if $AWS_CMD ecs describe-clusters --clusters $CLUSTER_NAME --query 'clusters[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
        log_warning "ECS cluster '$CLUSTER_NAME' already exists"
    else
        if [ "$DRY_RUN" = false ]; then
            $AWS_CMD ecs create-cluster \
                --cluster-name $CLUSTER_NAME \
                --capacity-providers FARGATE \
                --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
                >> "$SETUP_LOG" 2>&1
            
            if [ $? -eq 0 ]; then
                log_success "Created ECS cluster: $CLUSTER_NAME"
            else
                log_error "Failed to create ECS cluster"
                log "This might be due to missing ECS service linked role. Check the error above."
                exit 1
            fi
        else
            log "DRY RUN: Would create ECS cluster: $CLUSTER_NAME"
        fi
    fi
    
    echo "ECS_CLUSTER=$CLUSTER_NAME" >> "$VARS_FILE"
    export CLUSTER_NAME
}

setup_task_definition() {
    log "Setting up ECS Task Definition..."
    
    AWS_ACCOUNT_ID=$(get_account_id)
    TASK_FAMILY="webyalaya-dev-backend-task"
    
    # Parse environment variables from file if provided
    ENV_VARS_JSON=""
    if [ -n "$ENV_FILE" ]; then
        log "Loading environment variables from file: $ENV_FILE"
        ENV_VARS_JSON=$(parse_env_file "$ENV_FILE")
        if [ $? -ne 0 ] || [ -z "$ENV_VARS_JSON" ]; then
            log_error "Failed to parse environment file: $ENV_FILE"
            exit 1
        fi
        log_success "Loaded environment variables from file"
    fi
    
    # Build environment variables array
    # Start with default environment variables
    DEFAULT_ENV_JSON='[{"name":"PORT","value":"3000"},{"name":"NODE_ENV","value":"development"}]'
    
    # Add S3 credentials if they were created
    S3_ENV_JSON=""
    if [ -n "${S3_ACCESS_KEY_ID:-}" ] && [ -n "${S3_SECRET_ACCESS_KEY:-}" ]; then
        log "Adding S3 credentials to task definition environment variables..."
        if command -v jq &> /dev/null; then
            S3_ENV_JSON=$(jq -n \
                --arg access_key "$S3_ACCESS_KEY_ID" \
                --arg secret_key "$S3_SECRET_ACCESS_KEY" \
                --arg region "$REGION" \
                --arg bucket "${S3_BUCKET_NAME:-webyalaya-dev-media-namaste}" \
                '[
                    {"name": "AWS_ACCESS_KEY_ID", "value": $access_key},
                    {"name": "AWS_SECRET_ACCESS_KEY", "value": $secret_key},
                    {"name": "AWS_REGION", "value": $region},
                    {"name": "AWS_S3_BUCKET_NAME", "value": $bucket}
                ]')
        else
            # Fallback: manual JSON construction
            S3_BUCKET="${S3_BUCKET_NAME:-webyalaya-dev-media-namaste}"
            S3_ENV_JSON="[{\"name\":\"AWS_ACCESS_KEY_ID\",\"value\":\"$S3_ACCESS_KEY_ID\"},{\"name\":\"AWS_SECRET_ACCESS_KEY\",\"value\":\"$S3_SECRET_ACCESS_KEY\"},{\"name\":\"AWS_REGION\",\"value\":\"$REGION\"},{\"name\":\"AWS_S3_BUCKET_NAME\",\"value\":\"$S3_BUCKET\"}]"
        fi
    fi
    
    # Merge all environment variables: defaults + S3 credentials + file vars
    # File vars take precedence, then S3 credentials, then defaults
    ALL_ENV_ARRAYS=()
    ALL_ENV_ARRAYS+=("$DEFAULT_ENV_JSON")
    
    if [ -n "$S3_ENV_JSON" ]; then
        ALL_ENV_ARRAYS+=("$S3_ENV_JSON")
    fi
    
    if [ -n "$ENV_VARS_JSON" ]; then
        ALL_ENV_ARRAYS+=("$ENV_VARS_JSON")
    fi
    
    # TODO: Fix jq issue
    # Merge all arrays
    # if command -v jq &> /dev/null && [ ${#ALL_ENV_ARRAYS[@]} -gt 0 ]; then
    #     # Merge arrays, with later arrays taking precedence over earlier ones
    #     ENV_VARS_JSON=$(printf '%s\n' "${ALL_ENV_ARRAYS[@]}" | jq -s 'add | group_by(.name) | map(.[-1])')
    #     if [ $? -ne 0 ]; then
    #         log_error "Failed to merge environment variables"
    #         exit 1
    #     fi
    if [ ${#ALL_ENV_ARRAYS[@]} -gt 1 ]; then
        # Fallback: if jq not available, manually merge
        ENV_VARS_JSON="${ALL_ENV_ARRAYS[0]}"
        for i in $(seq 1 $((${#ALL_ENV_ARRAYS[@]} - 1))); do
            CURRENT="${ALL_ENV_ARRAYS[$i]}"
            ENV_VARS_NO_BRACKET=$(echo "$ENV_VARS_JSON" | sed 's/\]$//')
            CURRENT_NO_BRACKET=$(echo "$CURRENT" | sed 's/^\[//' | sed 's/\]$//')
            ENV_VARS_JSON="${ENV_VARS_NO_BRACKET},${CURRENT_NO_BRACKET}]"
        done
        log_warning "jq not available, merging environment variables manually"
    else
        ENV_VARS_JSON="${ALL_ENV_ARRAYS[0]}"
    fi
    
    # Check if task definition already exists
    if $AWS_CMD ecs describe-task-definition --task-definition $TASK_FAMILY &> /dev/null; then
        log_warning "Task definition '$TASK_FAMILY' already exists"
        if [ -n "$ENV_FILE" ]; then
            log "Note: Environment variables from file were not applied to existing task definition"
            log "You may need to create a new revision with the environment variables"
        else
            log "You may need to update it with environment variables manually"
        fi
    else
        if [ "$DRY_RUN" = false ]; then
            # Create task definition JSON with environment variables
            if command -v jq &> /dev/null; then
                # Use jq to build the complete JSON
                jq -n \
                    --arg family "$TASK_FAMILY" \
                    --arg cpu "256" \
                    --arg memory "512" \
                    --arg execution_role "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole" \
                    --arg task_role "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskRole" \
                    --arg image "${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/webyalaya-dev-backend-app:latest" \
                    --arg region "$REGION" \
                    --argjson env_vars "$ENV_VARS_JSON" \
                    '{
                      "family": $family,
                      "networkMode": "awsvpc",
                      "requiresCompatibilities": ["FARGATE"],
                      "cpu": $cpu,
                      "memory": $memory,
                      "executionRoleArn": $execution_role,
                      "taskRoleArn": $task_role,
                      "containerDefinitions": [{
                        "name": "nestjs-container",
                        "image": $image,
                        "portMappings": [{
                          "containerPort": 3000,
                          "protocol": "tcp"
                        }],
                        "essential": true,
                        "logConfiguration": {
                          "logDriver": "awslogs",
                          "options": {
                            "awslogs-group": "/ecs/webyalaya-dev-backend-task",
                            "awslogs-region": $region,
                            "awslogs-stream-prefix": "ecs"
                          }
                        },
                        "environment": $env_vars
                      }]
                    }' > "$OUTPUT_DIR/dev-task-definition.json"
            else
                # Fallback: build JSON manually (simpler format, may not handle all edge cases)
                log_warning "jq not available, using basic JSON generation"
                cat > "$OUTPUT_DIR/dev-task-definition.json" <<EOF
{
  "family": "$TASK_FAMILY",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "nestjs-container",
      "image": "${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/webyalaya-dev-backend-app:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/webyalaya-dev-backend-task",
          "awslogs-region": "${REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "environment": $ENV_VARS_JSON
    }
  ]
}
EOF
            fi
            
            # Ensure file is written and exists
            sync 2>/dev/null || true
            if [ ! -f "$OUTPUT_DIR/dev-task-definition.json" ]; then
                log_error "Task definition file was not created: $OUTPUT_DIR/dev-task-definition.json"
                exit 1
            fi
            
            TASK_DEF_FILE=$(convert_path_for_aws "$OUTPUT_DIR/dev-task-definition.json")
            $AWS_CMD ecs register-task-definition \
                --cli-input-json "file://$TASK_DEF_FILE" \
                >> "$SETUP_LOG" 2>&1
            
            log_success "Created Task Definition: $TASK_FAMILY"
            if [ -n "$ENV_FILE" ]; then
                log "  ✅ Environment variables loaded from file: $ENV_FILE"
            else
                log_warning "⚠️  Task definition created with default environment variables only"
                log_warning "⚠️  Use --env-file to load additional environment variables"
            fi
        else
            log "DRY RUN: Would create Task Definition: $TASK_FAMILY"
        fi
    fi
    
    echo "TASK_DEFINITION=$TASK_FAMILY" >> "$VARS_FILE"
}

setup_ecs_service() {
    log "Setting up ECS Service..."
    
    SERVICE_NAME="webyalaya-dev-backend-task-service"
    
    # Verify target group is associated with ALB before creating service
    if [ "$DRY_RUN" = false ] && [ -n "$DEV_TG_ARN" ] && [ "$DEV_TG_ARN" != "arn:aws:elasticloadbalancing:dryrun" ]; then
        log "Verifying target group is ready for ECS service..."
        TG_ALB=$($AWS_CMD elbv2 describe-target-groups \
            --target-group-arns $DEV_TG_ARN \
            --query "TargetGroups[0].LoadBalancerArns[0]" \
            --output text 2>/dev/null || echo "")
        
        if [ -z "$TG_ALB" ] || [ "$TG_ALB" = "None" ]; then
            log_error "Target group is not associated with any load balancer"
            log "The target group must be associated with the ALB via a listener before creating the ECS service."
            log "Please ensure the ALB listener was created successfully."
            exit 1
        fi
        
        log_success "Target group is associated with ALB: $TG_ALB"
    fi
    
    if $AWS_CMD ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --query 'services[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
        log_warning "ECS service '$SERVICE_NAME' already exists"
    else
        if [ "$DRY_RUN" = false ]; then
            SERVICE_OUTPUT=$($AWS_CMD ecs create-service \
                --cluster $CLUSTER_NAME \
                --service-name $SERVICE_NAME \
                --task-definition webyalaya-dev-backend-task \
                --desired-count 1 \
                --launch-type FARGATE \
                --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
                --load-balancers targetGroupArn=$DEV_TG_ARN,containerName=nestjs-container,containerPort=3000 \
                --output text 2>&1)
            
            if [ $? -eq 0 ]; then
                log_success "Created ECS Service: $SERVICE_NAME"
                log_warning "⚠️  Service will fail until Docker image is pushed to ECR!"
            else
                log_error "Failed to create ECS service"
                log "$SERVICE_OUTPUT"
                if echo "$SERVICE_OUTPUT" | grep -q "does not have an associated load balancer"; then
                    log "The target group is not associated with the ALB."
                    log "Please ensure the ALB listener was created successfully and wait a few seconds for propagation."
                fi
                exit 1
            fi
        else
            log "DRY RUN: Would create ECS Service: $SERVICE_NAME"
        fi
    fi
    
    echo "ECS_SERVICE=$SERVICE_NAME" >> "$VARS_FILE"
}

# Verification function
verify_setup() {
    log "Verifying setup..."
    
    echo "" >> "$SETUP_LOG"
    echo "=== Verification Results ===" >> "$SETUP_LOG"
    
    # Verify ECR
    if $AWS_CMD ecr describe-repositories --repository-names webyalaya-dev-backend-app &> /dev/null; then
        log_success "ECR repository verified"
    else
        log_error "ECR repository verification failed"
    fi
    
    # Verify ECS cluster
    if $AWS_CMD ecs describe-clusters --clusters webyalaya-dev-backend-cluster --query 'clusters[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
        log_success "ECS cluster verified"
    else
        log_error "ECS cluster verification failed"
    fi
    
    # Verify ALB
    if [ -n "$DEV_ALB_ARN" ] && [ "$DEV_ALB_ARN" != "arn:aws:elasticloadbalancing:dryrun" ]; then
        if $AWS_CMD elbv2 describe-load-balancers --load-balancer-arns $DEV_ALB_ARN &> /dev/null; then
            log_success "ALB verified: $DEV_ALB_DNS"
        else
            log_error "ALB verification failed"
        fi
    fi
    
    # Verify S3
    if $AWS_CMD s3 ls "s3://webyalaya-dev-media-namaste" &> /dev/null; then
        log_success "S3 bucket verified"
    else
        log_error "S3 bucket verification failed"
    fi
    
    # Verify CloudWatch
    # Disable path conversion for Git Bash to prevent /ecs/ from being converted
    disable_pathconv
    
    if $AWS_CMD logs describe-log-groups --log-group-name-prefix "/ecs/webyalaya-dev" --query "logGroups[?logGroupName=='/ecs/webyalaya-dev-backend-task']" --output text | grep -q "/ecs/webyalaya-dev-backend-task"; then
        log_success "CloudWatch log group verified"
    else
        log_error "CloudWatch log group verification failed"
    fi
    
    # Re-enable path conversion
    enable_pathconv
}

