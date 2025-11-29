#!/bin/bash
# IAM roles setup module

setup_iam_roles() {
    log "Setting up IAM roles..."
    
    AWS_ACCOUNT_ID=$(get_account_id)
    
    # ECS Task Execution Role
    if $AWS_CMD iam get-role --role-name ecsTaskExecutionRole &> /dev/null; then
        log_warning "Role 'ecsTaskExecutionRole' already exists, skipping..."
    else
        if [ "$DRY_RUN" = false ]; then
            cat > "$OUTPUT_DIR/ecs-task-execution-trust-policy.json" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
            
            # Ensure file is written and exists
            sync 2>/dev/null || true
            if [ ! -f "$OUTPUT_DIR/ecs-task-execution-trust-policy.json" ]; then
                log_error "Policy file was not created: $OUTPUT_DIR/ecs-task-execution-trust-policy.json"
                exit 1
            fi
            
            POLICY_FILE=$(convert_path_for_aws "$OUTPUT_DIR/ecs-task-execution-trust-policy.json")
            $AWS_CMD iam create-role \
                --role-name ecsTaskExecutionRole \
                --assume-role-policy-document "file://$POLICY_FILE" \
                >> "$SETUP_LOG" 2>&1
            
            $AWS_CMD iam attach-role-policy \
                --role-name ecsTaskExecutionRole \
                --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
                >> "$SETUP_LOG" 2>&1
            
            $AWS_CMD iam attach-role-policy \
                --role-name ecsTaskExecutionRole \
                --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly \
                >> "$SETUP_LOG" 2>&1
            
            log_success "Created ECS Task Execution Role"
            echo "ECS_TASK_EXECUTION_ROLE_ARN=arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole" >> "$VARS_FILE"
        else
            log "DRY RUN: Would create ECS Task Execution Role"
        fi
    fi
    
    # ECS Task Role
    if $AWS_CMD iam get-role --role-name ecsTaskRole &> /dev/null; then
        log_warning "Role 'ecsTaskRole' already exists, skipping..."
    else
        if [ "$DRY_RUN" = false ]; then
            cat > "$OUTPUT_DIR/ecs-task-trust-policy.json" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
            
            cat > "$OUTPUT_DIR/s3-access-policy.json" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::${PROJECT_NAME}-*-uploads",
        "arn:aws:s3:::${PROJECT_NAME}-*-uploads/*",
        "arn:aws:s3:::${BUCKET_NAME}",
        "arn:aws:s3:::${BUCKET_NAME}/*"
      ]
    }
  ]
}
EOF
            
            # Ensure files are written and exist
            sync 2>/dev/null || true
            if [ ! -f "$OUTPUT_DIR/ecs-task-trust-policy.json" ]; then
                log_error "Task policy file was not created: $OUTPUT_DIR/ecs-task-trust-policy.json"
                exit 1
            fi
            if [ ! -f "$OUTPUT_DIR/s3-access-policy.json" ]; then
                log_error "S3 policy file was not created: $OUTPUT_DIR/s3-access-policy.json"
                exit 1
            fi
            
            TASK_POLICY_FILE=$(convert_path_for_aws "$OUTPUT_DIR/ecs-task-trust-policy.json")
            $AWS_CMD iam create-role \
                --role-name ecsTaskRole \
                --assume-role-policy-document "file://$TASK_POLICY_FILE" \
                >> "$SETUP_LOG" 2>&1
            
            S3_POLICY_FILE=$(convert_path_for_aws "$OUTPUT_DIR/s3-access-policy.json")
            $AWS_CMD iam put-role-policy \
                --role-name ecsTaskRole \
                --policy-name S3AccessPolicy \
                --policy-document "file://$S3_POLICY_FILE" \
                >> "$SETUP_LOG" 2>&1
            
            log_success "Created ECS Task Role"
            echo "ECS_TASK_ROLE_ARN=arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskRole" >> "$VARS_FILE"
        else
            log "DRY RUN: Would create ECS Task Role"
        fi
    fi
}

