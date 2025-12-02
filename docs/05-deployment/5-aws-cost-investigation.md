# AWS Cost Investigation Script

This guide documents the AWS cost investigation script located at:

```bash
infra/aws/aws-cost-investigation-commands.sh
```

It is the **primary reference** for cost investigation; the old `infra/aws/aws-cost-investigation-README.md` is now considered secondary and may be removed later.

## Usage

From repo root:

```bash
cd infra/aws
chmod +x aws-cost-investigation-commands.sh
./aws-cost-investigation-commands.sh
```

Results are written under:

```text
infra/aws/output/aws-cost-investigation-YYYYMMDD-HHMMSS/
```

This folder is gitignored.

## Output Structure

Each run creates:

- A timestamped directory: `output/aws-cost-investigation-YYYYMMDD-HHMMSS/`
- For each section:
  - `NN-section-name.txt` – human-readable output
  - `NN-section-name.json` – JSON output (when applicable)
- A `SUMMARY.txt` file with a consolidated view.

### Section Files

The script currently generates:

1. `01-cost-by-service-daily.txt/json` – daily cost breakdown by service
2. `02-cost-by-service-monthly.txt/json` – monthly cost breakdown by service
3. `03-top-services.txt` – top 10 most expensive services
4. `04-cost-by-resource.txt/json` – cost by specific resources (last 7 days)
5. `05-cost-by-availability-zone.txt/json` – cost by AZ
6. `06-cost-by-instance-type.txt/json` – cost by instance type
7. `07-cost-by-linked-account.txt/json` – cost by linked account
8. `08-cost-by-tags.txt/json` – cost by tags
9. `09-list-all-running-ec2-instances.txt` – running EC2 instances
10. `10-list-all-rds-instances.txt` – RDS instances
11. `11-list-all-s3-buckets.txt` – S3 buckets
12. `12-list-all-ebs-volumes.txt` – EBS volumes
13. `13-list-all-elastic-ips.txt` – Elastic IPs
14. `14-list-all-load-balancers.txt` – load balancers
15. `15-list-all-cloudwatch-log-groups.txt` – CloudWatch log groups
16. `16-current-month-cost.txt/json` – current month total cost
17. `17-anomalies.txt` – cost anomalies (if enabled)
18. `18-reserved-instance-utilization.txt/json` – reserved instance coverage
19. `19-savings-plans-coverage.txt/json` – savings plans coverage
20. `20-cost-by-usage-type.txt/json` – detailed usage-type breakdown

### Summary File

`SUMMARY.txt` includes:

- Total cost for current month
- Services and their costs
- Resources in use (EC2, RDS, S3, EBS, etc.)
- Usage breakdown
- High-level cost optimization hints

## Requirements

- **AWS CLI** configured with appropriate credentials
- **`jq`** installed:
  - Linux: `sudo apt-get install jq`
  - Mac: `brew install jq`
  - Windows (Git Bash): install `jq` and ensure it’s on `PATH`

The script validates JSON outputs before saving.

## Configuration

Edit the script if you need to change:

- `PROFILE="namaste"` – default AWS CLI profile
- `REGION="us-west-2"` – default AWS region

Cost Explorer API itself is always called in `us-east-1` internally where required.

## Notes and Tips

- Some sections may be empty if there are no matching resources.
- Use the JSON files with custom tooling / dashboards.
- Use the text files for quick human-readable inspection.


