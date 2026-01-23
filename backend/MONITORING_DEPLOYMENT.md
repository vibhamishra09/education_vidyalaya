# Monitoring Stack Deployment Guide for AWS EC2

## Prerequisites

1. AWS EC2 instance running (Ubuntu 20.04+ or Amazon Linux 2 recommended)
2. Docker and Docker Compose installed on the EC2 instance
3. Security group configured with the following inbound rules:
   - Port 9090 (Prometheus) - Optional, can be internal only
   - Port 3002 (Grafana) - Required for web access
   - Port 22 (SSH) - For management

## Deployment Steps

### 1. Connect to Your EC2 Instance

```bash
ssh -i your-key.pem ec2-user@your-ec2-public-ip
# or for Ubuntu:
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### 2. Install Docker and Docker Compose (if not already installed)

#### For Amazon Linux 2:
```bash
sudo yum update -y
sudo yum install docker -y
sudo service docker start
sudo usermod -a -G docker ec2-user
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### For Ubuntu:
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
```

**Log out and back in** for group changes to take effect.

### 3. Create Project Directory

```bash
mkdir -p ~/webyalaya-monitoring
cd ~/webyalaya-monitoring
```

### 4. Upload Files to EC2

From your local machine, upload the necessary files:

```powershell
# From your local machine (PowerShell)
scp -i your-key.pem backend/docker-compose.monitoring.yml ec2-user@your-ec2-ip:~/webyalaya-monitoring/
scp -i your-key.pem backend/.env.monitoring.example ec2-user@your-ec2-ip:~/webyalaya-monitoring/.env
scp -r backend/monitoring ec2-user@your-ec2-ip:~/webyalaya-monitoring/
```

### 5. Configure Environment Variables

On the EC2 instance, edit the .env file:

```bash
cd ~/webyalaya-monitoring
nano .env
```

Update the following critical values:

```env
# Update with your EC2 public IP or domain
GRAFANA_ROOT_URL=http://YOUR_EC2_PUBLIC_IP:3002

# Change default password for security
GRAFANA_ADMIN_PASSWORD=YourSecurePassword123!

# Update SMTP credentials if you want email alerts
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
SMTP_FROM_ADDRESS=your-email@gmail.com
```

### 6. Start the Monitoring Stack

```bash
docker-compose -f docker-compose.monitoring.yml --env-file .env up -d
```

### 7. Verify Deployment

Check if containers are running:

```bash
docker ps
```

You should see:
- webyalaya-prometheus
- webyalaya-grafana

Check logs:

```bash
docker-compose -f docker-compose.monitoring.yml logs -f
```

### 8. Access Grafana

Open your browser and navigate to:
- `http://YOUR_EC2_PUBLIC_IP:3002`

Login with:
- Username: `admin` (or your configured GRAFANA_ADMIN_USER)
- Password: Your configured GRAFANA_ADMIN_PASSWORD

### 9. Configure Prometheus Data Source in Grafana

1. In Grafana, go to Configuration → Data Sources
2. Add Prometheus data source with URL: `http://prometheus:9090`

## Security Recommendations

### 1. Restrict Access with Security Groups

Configure AWS Security Group to allow Grafana access only from trusted IPs:

```
Type: Custom TCP
Port: 3002
Source: Your-IP/32
```

### 2. Use HTTPS with Nginx Reverse Proxy

Create nginx configuration:

```bash
sudo apt-get install nginx certbot python3-certbot-nginx
```

```nginx
server {
    listen 80;
    server_name monitoring.webyalaya.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Get SSL certificate:
```bash
sudo certbot --nginx -d monitoring.webyalaya.com
```

### 3. Keep Prometheus Internal

Consider removing public access to Prometheus (port 9090) and only allow Grafana to access it internally through Docker network.

## Maintenance Commands

### View Logs
```bash
docker-compose -f docker-compose.monitoring.yml logs -f grafana
docker-compose -f docker-compose.monitoring.yml logs -f prometheus
```

### Restart Services
```bash
docker-compose -f docker-compose.monitoring.yml restart
```

### Stop Services
```bash
docker-compose -f docker-compose.monitoring.yml down
```

### Update Configuration
```bash
# Edit .env file
nano .env

# Restart services to apply changes
docker-compose -f docker-compose.monitoring.yml down
docker-compose -f docker-compose.monitoring.yml --env-file .env up -d
```

### Backup Data
```bash
docker run --rm --volumes-from webyalaya-grafana -v $(pwd):/backup ubuntu tar cvf /backup/grafana-backup.tar /var/lib/grafana
docker run --rm --volumes-from webyalaya-prometheus -v $(pwd):/backup ubuntu tar cvf /backup/prometheus-backup.tar /prometheus
```

## Troubleshooting

### Containers Won't Start
```bash
# Check logs
docker-compose -f docker-compose.monitoring.yml logs

# Check disk space
df -h

# Check if ports are in use
sudo netstat -tulpn | grep -E '3002|9090'
```

### Can't Access Grafana
1. Check EC2 security group allows port 3002
2. Verify container is running: `docker ps`
3. Check Grafana logs: `docker logs webyalaya-grafana`

### Email Alerts Not Working
1. Verify SMTP credentials in .env file
2. For Gmail, use App-Specific Password (not your regular password)
3. Check Grafana logs for SMTP errors

## Cost Optimization

- Instance Type: t3.small or t3.medium recommended
- Use spot instances for non-production monitoring
- Configure Prometheus retention time (default: 30 days)
- Enable EBS volume encryption for data security

## Monitoring Your Monitoring

Set up CloudWatch alarms for:
- EC2 instance CPU/Memory
- Disk space usage
- Container health checks

```bash
# Add to docker-compose.monitoring.yml healthchecks if needed
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3002/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```
