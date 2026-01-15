# RDS Connection Issue - Troubleshooting Guide

## Problem

Your ECS tasks cannot connect to the RDS database, showing this error:
```
PrismaClientInitializationError: Can't reach database server at `webyalaya-dev.c70404248ddy.us-west-2.rds.amazonaws.com:5432`
```

## Root Cause

The RDS security group is not configured to allow inbound PostgreSQL connections (port 5432) from your ECS security group. By default, RDS security groups only allow connections from explicitly configured sources.

## Solution

You need to add an inbound rule to your RDS security group that allows PostgreSQL traffic from your ECS security group.

### Option 1: Use the Automated Script (Recommended)

1. **Find your RDS instance identifier:**
   ```bash
   aws rds describe-db-instances --profile namaste --region us-west-2 \
     --query 'DBInstances[*].[DBInstanceIdentifier,DBInstanceStatus]' \
     --output table
   ```

2. **Find your ECS security group ID:**
   ```bash
   aws ec2 describe-security-groups --profile namaste --region us-west-2 \
     --filters "Name=group-name,Values=webyalaya-dev-ecs-task-sg" \
     --query 'SecurityGroups[0].GroupId' \
     --output text
   ```

3. **Run the fix script:**
   ```bash
   cd infra/aws
   chmod +x fix-rds-security-group.sh
   ./fix-rds-security-group.sh \
     --rds-instance-id webyalaya-dev \
     --ecs-sg-id sg-xxxxxxxxxxxxx \
     --profile namaste \
     --region us-west-2
   ```

### Option 2: Manual Fix via AWS Console

1. Go to **AWS Console** → **RDS** → **Databases**
2. Click on your RDS instance (e.g., `webyalaya-dev`)
3. Click on the **VPC security groups** link
4. Click on the security group ID
5. Go to **Inbound rules** tab
6. Click **Edit inbound rules**
7. Click **Add rule**
8. Configure:
   - **Type**: PostgreSQL
   - **Protocol**: TCP
   - **Port**: 5432
   - **Source**: Custom → Select your ECS security group (e.g., `webyalaya-dev-ecs-task-sg`)
9. Click **Save rules**

### Option 3: Manual Fix via AWS CLI

```bash
# Set variables
RDS_SG_ID="sg-xxxxxxxxxxxxx"  # RDS security group ID
ECS_SG_ID="sg-yyyyyyyyyyyyyy"  # ECS security group ID
PROFILE="namaste"
REGION="us-west-2"

# Add the rule
aws ec2 authorize-security-group-ingress \
  --group-id "$RDS_SG_ID" \
  --protocol tcp \
  --port 5432 \
  --source-group "$ECS_SG_ID" \
  --profile "$PROFILE" \
  --region "$REGION"
```

## Verification

After applying the fix, verify the connection:

1. **Check security group rules:**
   ```bash
   aws ec2 describe-security-groups \
     --group-ids "$RDS_SG_ID" \
     --query 'SecurityGroups[0].IpPermissions[?FromPort==`5432`]' \
     --profile "$PROFILE" \
     --region "$REGION"
   ```

2. **Restart your ECS service** to pick up the new network configuration:
   ```bash
   aws ecs update-service \
     --cluster webyalaya-dev-backend-cluster \
     --service webyalaya-dev-backend-task-service \
     --force-new-deployment \
     --profile "$PROFILE" \
     --region "$REGION"
   ```

3. **Check ECS logs** to verify the connection:
   ```bash
   aws logs tail /ecs/webyalaya-dev-backend-task \
     --follow \
     --profile "$PROFILE" \
     --region "$REGION"
   ```

## Additional Checks

If the issue persists after fixing the security group, verify:

1. **VPC Configuration:**
   - ECS tasks and RDS must be in the same VPC
   - Check: `aws ec2 describe-vpcs --filters "Name=isDefault,Values=true"`

2. **Subnet Configuration:**
   - ECS tasks should be in subnets that can reach RDS subnets
   - If using private subnets, ensure NAT gateway is configured

3. **RDS Accessibility:**
   - Verify RDS is not paused or in maintenance mode
   - Check RDS endpoint is correct in `DATABASE_URL`

4. **Environment Variables:**
   - Verify `DATABASE_URL` is correctly set in ECS task definition
   - Format: `postgresql://user:password@host:5432/dbname`

5. **Network ACLs:**
   - Ensure Network ACLs allow traffic between ECS and RDS subnets

## Prevention

To prevent this issue in the future, consider:

1. **Update the setup script** to automatically configure RDS security groups
2. **Use Infrastructure as Code** (Terraform, CloudFormation) to manage security groups
3. **Document security group dependencies** in your deployment guide

## Related Documentation

- [AWS RDS Security Groups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.RDSSecurityGroups.html)
- [ECS Networking](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/networking.html)
- [Environment Variables Guide](../docs/05-deployment/2-environment-variables.md)
