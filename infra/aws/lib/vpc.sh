#!/bin/bash
# VPC and networking setup module

setup_vpc() {
    log "Setting up VPC and networking..."
    
    DEFAULT_VPC_ID=$($AWS_CMD ec2 describe-vpcs \
        --filters "Name=isDefault,Values=true" \
        --query 'Vpcs[0].VpcId' \
        --output text)
    
    if [ "$DEFAULT_VPC_ID" = "None" ] || [ -z "$DEFAULT_VPC_ID" ]; then
        log_error "Default VPC not found. Please create a VPC first."
        exit 1
    fi
    
    SUBNET_IDS=$($AWS_CMD ec2 describe-subnets \
        --filters "Name=vpc-id,Values=$DEFAULT_VPC_ID" \
        --query 'Subnets[*].SubnetId' \
        --output text)
    
    SUBNET_1=$(echo $SUBNET_IDS | cut -d' ' -f1)
    SUBNET_2=$(echo $SUBNET_IDS | cut -d' ' -f2)
    
    if [ -z "$SUBNET_1" ] || [ -z "$SUBNET_2" ]; then
        log_error "Not enough subnets found. Need at least 2 subnets."
        exit 1
    fi
    
    log_success "Found VPC: $DEFAULT_VPC_ID"
    log_success "Found Subnets: $SUBNET_1, $SUBNET_2"
    
    echo "DEFAULT_VPC_ID=$DEFAULT_VPC_ID" >> "$VARS_FILE"
    echo "SUBNET_1=$SUBNET_1" >> "$VARS_FILE"
    echo "SUBNET_2=$SUBNET_2" >> "$VARS_FILE"
    
    export DEFAULT_VPC_ID SUBNET_1 SUBNET_2
}

