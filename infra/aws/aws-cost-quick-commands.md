# AWS Cost Investigation - Quick Commands

## Most Important Commands

### 1. **Cost by Service (Last 30 Days)**
```bash
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "30 days ago" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Key=SERVICE,Type=DIMENSION \
  --profile namaste \
  --region us-east-1
```

### 2. **Top Services (Sorted)**
```bash
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "30 days ago" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Key=SERVICE,Type=DIMENSION \
  --profile namaste \
  --region us-east-1 \
  | jq -r '.ResultsByTime[0].Groups | sort_by(.Metrics.BlendedCost.Amount | tonumber) | reverse | .[] | "\(.Keys[0]): $\(.Metrics.BlendedCost.Amount)"'
```

### 3. **Cost by Resource ID (Last 7 Days)**
```bash
aws ce get-cost-and-usage-with-resources \
  --time-period Start=$(date -d "7 days ago" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Key=SERVICE,Type=DIMENSION \
  --group-by Key=RESOURCE_ID,Type=DIMENSION \
  --profile namaste \
  --region us-east-1
```

### 4. **List Running EC2 Instances**
```bash
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query 'Reservations[*].Instances[*].[InstanceId,InstanceType,LaunchTime,Tags[?Key==`Name`].Value|[0]]' \
  --output table \
  --profile namaste \
  --region us-west-2
```

### 5. **List All RDS Instances**
```bash
aws rds describe-db-instances \
  --query 'DBInstances[*].[DBInstanceIdentifier,DBInstanceClass,Engine,DBInstanceStatus]' \
  --output table \
  --profile namaste \
  --region us-west-2
```

### 6. **List S3 Buckets**
```bash
aws s3 ls --profile namaste --region us-west-2
```

### 7. **List EBS Volumes**
```bash
aws ec2 describe-volumes \
  --query 'Volumes[*].[VolumeId,Size,VolumeType,State,Attachments[0].InstanceId]' \
  --output table \
  --profile namaste \
  --region us-west-2
```

### 8. **List Unattached Elastic IPs (these cost money!)**
```bash
aws ec2 describe-addresses \
  --query 'Addresses[?AssociationId==null].[PublicIp,AllocationId]' \
  --output table \
  --profile namaste \
  --region us-west-2
```

### 9. **List Load Balancers**
```bash
aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[*].[LoadBalancerName,Type,State.Code]' \
  --output table \
  --profile namaste \
  --region us-west-2
```

### 10. **Current Month Total Cost**
```bash
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --profile namaste \
  --region us-east-1
```

## Notes:
- **Cost Explorer API** requires `us-east-1` region (even if your resources are in other regions)
- Other services use `us-west-2` (or your actual region)
- Replace `namaste` with your profile name if different
- Install `jq` for JSON parsing: `sudo apt-get install jq` (Linux) or `brew install jq` (Mac)

