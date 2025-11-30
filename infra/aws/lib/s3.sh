#!/bin/bash
# S3 bucket and user setup module

setup_s3() {
    log "Setting up S3 bucket..."
    
    BUCKET_EXISTS=false
    
    # Check if bucket exists
    if $AWS_CMD s3 ls "s3://$BUCKET_NAME" &> /dev/null; then
        BUCKET_EXISTS=true
        log_warning "S3 bucket '$BUCKET_NAME' already exists, will configure settings..."
    fi
    
    if [ "$DRY_RUN" = false ]; then
        # Create bucket if it doesn't exist
        if [ "$BUCKET_EXISTS" = false ]; then
            log "Creating S3 bucket: $BUCKET_NAME"
            CREATE_OUTPUT=$($AWS_CMD s3 mb "s3://$BUCKET_NAME" --region $REGION 2>&1)
            CREATE_EXIT_CODE=$?
            
            if [ $CREATE_EXIT_CODE -ne 0 ]; then
                log_error "Failed to create S3 bucket"
                log "$CREATE_OUTPUT"
                exit 1
            fi
            log_success "Created S3 bucket: $BUCKET_NAME"
        fi
        
        # Configure bucket settings (whether newly created or existing)
        log "Configuring S3 bucket settings..."
        
        # Enable ACLs (Object Ownership: ACLs enabled)
        log "  - Setting bucket ownership controls (ACLs enabled)..."
        $AWS_CMD s3api put-bucket-ownership-controls \
            --bucket $BUCKET_NAME \
            --ownership-controls Rules=[{ObjectOwnership=BucketOwnerPreferred}] \
            >> "$SETUP_LOG" 2>&1 || log_warning "    Failed to set ownership controls (may already be configured)"
        
        # Unblock public access (needed for presigned URLs and public access)
        log "  - Configuring public access block settings..."
        $AWS_CMD s3api put-public-access-block \
            --bucket $BUCKET_NAME \
            --public-access-block-configuration \
            "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" \
            >> "$SETUP_LOG" 2>&1 || log_warning "    Failed to configure public access block (may already be configured)"
        
        # Enable versioning
        log "  - Enabling versioning..."
        $AWS_CMD s3api put-bucket-versioning \
            --bucket $BUCKET_NAME \
            --versioning-configuration Status=Enabled \
            >> "$SETUP_LOG" 2>&1 || log_warning "    Failed to enable versioning (may already be enabled)"
        
        # Enable default encryption (SSE-S3)
        log "  - Enabling default encryption (SSE-S3)..."
        $AWS_CMD s3api put-bucket-encryption \
            --bucket $BUCKET_NAME \
            --server-side-encryption-configuration '{
                "Rules": [{
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }]
            }' \
            >> "$SETUP_LOG" 2>&1 || log_warning "    Failed to enable encryption (may already be enabled)"
        
        # Configure CORS
        log "  - Configuring CORS with allowed origins: $CORS_ORIGINS"
        
        # Convert comma-separated origins to JSON array
        IFS=',' read -ra ORIGIN_ARRAY <<< "$CORS_ORIGINS"
        ORIGINS_JSON="["
        FIRST=true
        for origin in "${ORIGIN_ARRAY[@]}"; do
            # Trim whitespace
            origin=$(echo "$origin" | xargs)
            if [ -n "$origin" ]; then
                if [ "$FIRST" = true ]; then
                    FIRST=false
                else
                    ORIGINS_JSON+=","
                fi
                ORIGINS_JSON+="\"$origin\""
            fi
        done
        ORIGINS_JSON+="]"
        
        cat > "$OUTPUT_DIR/s3-cors-config.json" <<EOF
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedOrigins": $ORIGINS_JSON,
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF
        
        CORS_FILE=$(convert_path_for_aws "$OUTPUT_DIR/s3-cors-config.json")
        $AWS_CMD s3api put-bucket-cors \
            --bucket $BUCKET_NAME \
            --cors-configuration "file://$CORS_FILE" \
            >> "$SETUP_LOG" 2>&1 || log_warning "    Failed to configure CORS (may already be configured)"
        
        # Configure bucket policy for public read access
        log "  - Configuring bucket policy (public read access)..."
        cat > "$OUTPUT_DIR/s3-bucket-policy.json" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
    }
  ]
}
EOF
        
        POLICY_FILE=$(convert_path_for_aws "$OUTPUT_DIR/s3-bucket-policy.json")
        $AWS_CMD s3api put-bucket-policy \
            --bucket $BUCKET_NAME \
            --policy "file://$POLICY_FILE" \
            >> "$SETUP_LOG" 2>&1 || log_warning "    Failed to configure bucket policy (may already be configured)"
        
        # Create avatars/ folder (if it doesn't exist)
        log "  - Creating/verifying avatars/ folder..."
        $AWS_CMD s3api head-object \
            --bucket $BUCKET_NAME \
            --key "avatars/" &> /dev/null || \
        $AWS_CMD s3api put-object \
            --bucket $BUCKET_NAME \
            --key "avatars/" \
            >> "$SETUP_LOG" 2>&1 || log_warning "    Failed to create avatars/ folder (may already exist)"
        
        if [ "$BUCKET_EXISTS" = false ]; then
            log_success "Configured S3 bucket: $BUCKET_NAME"
        else
            log_success "Updated S3 bucket configuration: $BUCKET_NAME"
        fi
        log "  ✅ ACLs enabled"
        log "  ✅ Public access unblocked"
        log "  ✅ Versioning enabled"
        log "  ✅ Default encryption enabled (SSE-S3)"
        log "  ✅ CORS configured"
        log "  ✅ Bucket policy configured (public read access)"
        log "  ✅ Created/verified avatars/ folder"
        log_warning "⚠️  Update CORS AllowedOrigins in bucket settings to include your actual domain!"
    else
        if [ "$BUCKET_EXISTS" = false ]; then
            log "DRY RUN: Would create S3 bucket: $BUCKET_NAME"
        else
            log "DRY RUN: Would configure existing S3 bucket: $BUCKET_NAME"
        fi
    fi
    
    echo "S3_BUCKET=$BUCKET_NAME" >> "$VARS_FILE"
}

setup_s3_user() {
    log "Setting up S3 IAM user..."
    
    # Check if user already exists
    if $AWS_CMD iam get-user --user-name "$S3_USER_NAME" &> /dev/null; then
        log_warning "IAM user '$S3_USER_NAME' already exists"
        
        # Check if user has access keys
        EXISTING_KEYS=$($AWS_CMD iam list-access-keys --user-name "$S3_USER_NAME" --query 'AccessKeyMetadata[*].AccessKeyId' --output text 2>/dev/null || echo "")
        
        if [ -n "$EXISTING_KEYS" ]; then
            log_warning "User already has access keys. Skipping key creation."
            log "To create new keys, delete existing ones first or use a different user name."
            echo "S3_USER_NAME=$S3_USER_NAME" >> "$VARS_FILE"
            return 0
        fi
    else
        if [ "$DRY_RUN" = false ]; then
            log "Creating IAM user: $S3_USER_NAME"
            $AWS_CMD iam create-user --user-name "$S3_USER_NAME" >> "$SETUP_LOG" 2>&1
            
            if [ $? -ne 0 ]; then
                log_error "Failed to create IAM user"
                exit 1
            fi
            
            log_success "Created IAM user: $S3_USER_NAME"
        else
            log "DRY RUN: Would create IAM user: $S3_USER_NAME"
        fi
    fi
    
    if [ "$DRY_RUN" = false ]; then
        # Create S3 policy for the user
        log "Creating S3 access policy for user..."
        cat > "$OUTPUT_DIR/s3-user-policy.json" <<EOF
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
        
        POLICY_FILE=$(convert_path_for_aws "$OUTPUT_DIR/s3-user-policy.json")
        $AWS_CMD iam put-user-policy \
            --user-name "$S3_USER_NAME" \
            --policy-name S3AccessPolicy \
            --policy-document "file://$POLICY_FILE" \
            >> "$SETUP_LOG" 2>&1
        
        if [ $? -eq 0 ]; then
            log_success "Attached S3 policy to user"
        else
            log_warning "Failed to attach S3 policy (may already be attached)"
        fi
        
        # Create access keys
        log "Creating access keys for user..."
        CREDENTIALS_OUTPUT=$($AWS_CMD iam create-access-key \
            --user-name "$S3_USER_NAME" \
            --output json 2>&1)
        
        if [ $? -eq 0 ]; then
            # Extract credentials
            if command -v jq &> /dev/null; then
                ACCESS_KEY_ID=$(echo "$CREDENTIALS_OUTPUT" | jq -r '.AccessKey.AccessKeyId')
                SECRET_ACCESS_KEY=$(echo "$CREDENTIALS_OUTPUT" | jq -r '.AccessKey.SecretAccessKey')
            else
                # Fallback to grep if jq not available
                ACCESS_KEY_ID=$(echo "$CREDENTIALS_OUTPUT" | grep -o '"AccessKeyId": "[^"]*' | cut -d'"' -f4)
                SECRET_ACCESS_KEY=$(echo "$CREDENTIALS_OUTPUT" | grep -o '"SecretAccessKey": "[^"]*' | cut -d'"' -f4)
            fi
            
            # Save credentials to file
            CREDENTIALS_FILE="$OUTPUT_DIR/s3-user-credentials.json"
            echo "$CREDENTIALS_OUTPUT" > "$CREDENTIALS_FILE"
            
            # Save to vars file
            echo "S3_USER_NAME=$S3_USER_NAME" >> "$VARS_FILE"
            echo "S3_ACCESS_KEY_ID=$ACCESS_KEY_ID" >> "$VARS_FILE"
            echo "S3_CREDENTIALS_FILE=$CREDENTIALS_FILE" >> "$VARS_FILE"
            
            # Export for use in task definition
            export S3_ACCESS_KEY_ID="$ACCESS_KEY_ID"
            export S3_SECRET_ACCESS_KEY="$SECRET_ACCESS_KEY"
            export S3_BUCKET_NAME="$BUCKET_NAME"
            
            log_success "Created access keys for user"
            log ""
            log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            log_warning "⚠️  IMPORTANT: Save these credentials securely!"
            log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            log ""
            log "Access Key ID:     $ACCESS_KEY_ID"
            log "Secret Access Key: $SECRET_ACCESS_KEY"
            log ""
            log "Credentials saved to: $CREDENTIALS_FILE"
            log ""
            log "Add these to your .env file:"
            log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            log "AWS_ACCESS_KEY_ID=$ACCESS_KEY_ID"
            log "AWS_SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY"
            log "AWS_REGION=$REGION"
            log "AWS_S3_BUCKET_NAME=$BUCKET_NAME"
            log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            log ""
            log_warning "⚠️  SECURITY WARNING:"
            log "   - Never commit these credentials to git"
            log "   - Add $CREDENTIALS_FILE to .gitignore"
            log "   - Rotate credentials regularly"
            log ""
        else
            log_error "Failed to create access keys"
            log "$CREDENTIALS_OUTPUT"
            exit 1
        fi
    else
        log "DRY RUN: Would create access keys for user: $S3_USER_NAME"
    fi
}

