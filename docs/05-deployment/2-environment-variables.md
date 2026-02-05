# Environment Variables Configuration

This document describes all environment variables required for deploying the Webyalaya application across different environments (Dev, Test, Production).

## Overview

The application uses environment variables to configure:
- **Backend (NestJS)**: Deployed on AWS ECS (Fargate)
- **Frontend (Next.js)**: Deployed on Vercel

Environment variables are configured differently for each deployment target and environment.

---

## Backend Environment Variables (AWS ECS)

The backend runs as a Docker container on AWS ECS. Environment variables are configured in the **ECS Task Definition** and should **NOT** be hardcoded in the Dockerfile (as per security best practices).

### Required Environment Variables

#### Database Configuration
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@host:5432/dbname` | ✅ Yes |

#### Authentication (Clerk)
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `CLERK_SECRET_KEY` | Clerk backend secret key | `sk_test_...` or `sk_live_...` | ✅ Yes |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key | `pk_test_...` or `pk_live_...` | ✅ Yes |
| `CLERK_JWT_KEY` | Clerk JWT signing key for token verification | `-----BEGIN PUBLIC KEY-----...` | ✅ Yes |

#### CORS Configuration
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `FRONTEND_URLS` | Comma-separated list of allowed frontend URLs | `https://webyalaya.com,https://test.webyalaya.com` | ⚠️ Optional* |

**Note:** If `FRONTEND_URLS` is not set, the backend uses default URLs including:
- `https://www.webyalaya.com`
- `https://webyalaya.com`
- `https://webyalaya-next.vercel.app`
- `https://test.webyalaya.com`
- `https://webyalaya-next-test.vercel.app`
- `http://localhost:3000` (for development)

#### AWS S3 (File Uploads)
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `AWS_REGION` | AWS region for S3 bucket | `us-west-2` | ✅ Yes |
| `AWS_ACCESS_KEY_ID` | AWS access key ID | `AKIAIOSFODNN7EXAMPLE` | ✅ Yes |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | ✅ Yes |
| `AWS_S3_BUCKET_NAME` | S3 bucket name for file uploads | `webyalaya-uploads` | ✅ Yes |

#### LiveKit (Video Conferencing)
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `LIVEKIT_API_KEY` | LiveKit API key | `APIxxxxx` | ✅ Yes |
| `LIVEKIT_API_SECRET` | LiveKit API secret | `secretxxxxx` | ✅ Yes |

#### Push Notifications (VAPID)
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `VAPID_PUBLIC_KEY` | VAPID public key for web push | `BEl62iUYgUivxIkv69yViEuiBIa40...` | ⚠️ Optional |
| `VAPID_PRIVATE_KEY` | VAPID private key for web push | `...` | ⚠️ Optional |
| `VAPID_SUBJECT` | VAPID subject (email or URL) | `mailto:admin@webyalaya.com` | ⚠️ Optional |

**Note:** Push notifications will not work if VAPID keys are not configured.

#### Email Notifications (Resend)
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `RESEND_API_KEY` | Resend API key for sending emails | `re_...` | ⚠️ Optional |

**Note:** Email notifications for high priority (URGENT) notifications will not work if `RESEND_API_KEY` is not configured. Emails are sent from `notify@noreply.webyalaya.com`.

#### Application Configuration
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `PORT` | Port the application listens on | `3000` or `3001` | ⚠️ Optional* |
| `NODE_ENV` | Node.js environment | `production`, `development`, `test` | ⚠️ Optional* |
| `LOG_LEVEL` | Logging level for Pino logger | `debug`, `info`, `warn`, `error` | ⚠️ Optional* |

**Note:** 
- Default `PORT` is `3001` if not specified
- `NODE_ENV` defaults to `development` if not set
- Default `LOG_LEVEL` is `debug` if not specified. In production, consider using `info` or `warn` to reduce log volume

---

## Frontend Environment Variables (Vercel)

The frontend is deployed on Vercel. Environment variables are configured in the **Vercel Dashboard** under Project Settings → Environment Variables.

### Required Environment Variables

#### API Configuration
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `https://be.webyalaya.com` or `http://your-alb-dns.us-west-2.elb.amazonaws.com` | ✅ Yes |

**Note:** This should point to your AWS ALB (Application Load Balancer) DNS name or custom domain.

#### WebSocket Configuration
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_CHAT_WS_URL` | WebSocket URL for chat functionality | `wss://be.webyalaya.com` or `ws://your-alb-dns.us-west-2.elb.amazonaws.com` | ✅ Yes |

**Note:** Use `wss://` for HTTPS and `ws://` for HTTP. Should match the backend API URL protocol.

TODO: verify if this should be https or wss.

#### LiveKit Configuration
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_LIVEKIT_WS_URL` | LiveKit WebSocket URL for video rooms | `wss://your-livekit-server.com` | ✅ Yes |

#### Clerk Authentication
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (frontend) | `pk_test_...` or `pk_live_...` | ✅ Yes |
| `CLERK_SECRET_KEY` | Clerk secret key (for API routes) | `sk_test_...` or `sk_live_...` | ✅ Yes |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook secret for user sync | `whsec_...` | ⚠️ Optional* |

**Note:** `CLERK_WEBHOOK_SECRET` is required if you're using Clerk webhooks for user synchronization.

#### Backend URL (API Routes)
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `BACKEND_URL` | Backend URL for server-side API routes | `https://api.webyalaya.com` | ⚠️ Optional* |

**Note:** Used in Next.js API routes. Defaults to `http://localhost:3001` if not set.

---

## Environment-Specific Configurations

### Development Environment (Dev)

#### Backend (ECS)
- **Cluster**: `webyalaya-dev-backend-cluster`
- **Service**: `webyalaya-dev-backend-task-service`
- **ECR Repository**: `webyalaya-dev-backend-app`
- **Region**: `us-west-2`

**Environment Variables:**
- Use dev database URL
- Use Clerk test keys of dev account (`sk_test_...`, `pk_test_...`)
- Use dev S3 bucket
- Use dev LiveKit credentials
- `FRONTEND_URLS`: Include dev Vercel preview URLs

#### Frontend (Vercel)
- **Project ID**: Configured via `VERCEL_PROJECT_ID_DEV` secret
- **Deployment Type**: Preview

**Environment Variables:**
- `NEXT_PUBLIC_API_URL`: Dev ALB DNS name
- `NEXT_PUBLIC_CHAT_WS_URL`: Dev WebSocket URL
- Use Clerk test keys of dev account
- Use dev LiveKit URL

---

### Test Environment (Test/Staging)

#### Backend (ECS)
- **Cluster**: `webyalaya-test-backend-app`
- **Service**: `webyalaya-test-backend-task-service`
- **ECR Repository**: `webyalaya-test-backend-app`
- **Region**: `us-west-2`

**Environment Variables:**
- Use test/staging database URL
- Use Clerk test keys of test account (`sk_test_...`, `pk_test_...`)
- Use test S3 bucket
- Use test LiveKit credentials
- `FRONTEND_URLS`: Include test Vercel preview URLs

#### Frontend (Vercel)
- **Project ID**: Configured via `VERCEL_PROJECT_ID_TEST` secret
- **Deployment Type**: Preview

**Environment Variables:**
- `NEXT_PUBLIC_API_URL`: Test ALB DNS name
- `NEXT_PUBLIC_CHAT_WS_URL`: Test WebSocket URL
- Use Clerk test keys
- Use test LiveKit URL

---

### Production Environment

#### Backend (ECS)
- **Cluster**: `webyalaya-backend-cluster`
- **Service**: `webyalaya-backend-task-service`
- **ECR Repository**: `webyalaya-backend-app`
- **Region**: `us-west-2`

**Environment Variables:**
- Use production database URL
- Use Clerk production keys of prod clerk account (`sk_live_...`, `pk_live_...`)
- Use production S3 bucket
- Use production LiveKit credentials
- `FRONTEND_URLS`: Include production domain URLs

#### Frontend (Vercel)
- **Project ID**: Configured via `VERCEL_PROJECT_ID` secret
- **Deployment Type**: Production

**Environment Variables:**
- `NEXT_PUBLIC_API_URL`: Production ALB DNS name or custom domain
- `NEXT_PUBLIC_CHAT_WS_URL`: Production WebSocket URL (use `wss://` for HTTPS)
- Use Clerk production keys of prod clerk account
- Use production LiveKit URL

---

## How to Configure Environment Variables

### Backend (AWS ECS)

1. **Via AWS Console:**
   - Go to ECS → Task Definitions
   - Select your task definition
   - Click "Create new revision"
   - Scroll to "Container definitions" → Select container
   - Expand "Environment variables" section
   - Add/edit environment variables
   - Click "Create" to create new revision
   - Update service to use new task definition revision

2. **Via AWS CLI:**
   ```bash
   aws ecs register-task-definition \
     --family your-task-family \
     --container-definitions '[{
       "name": "nestjs-container",
       "image": "your-image-uri",
       "environment": [
         {"name": "DATABASE_URL", "value": "postgresql://..."},
         {"name": "CLERK_SECRET_KEY", "value": "sk_..."}
       ]
     }]'
   ```

3. **Via AWS Secrets Manager (Recommended for sensitive values):**
   - Store secrets in AWS Secrets Manager
   - Reference them in task definition:
   ```json
   "secrets": [
     {
       "name": "DATABASE_URL",
       "valueFrom": "arn:aws:secretsmanager:us-west-2:123456789012:secret:db-url"
     }
   ]
   ```

### Frontend (Vercel)

1. **Via Vercel Dashboard:**
   - Go to your project → Settings → Environment Variables
   - Add variables for each environment (Development, Preview, Production)
   - Click "Save"
   - Redeploy the application

2. **Via Vercel CLI:**
   ```bash
   vercel env add NEXT_PUBLIC_API_URL production
   ```

3. **Via GitHub Actions:**
   - Variables are passed via secrets (see workflow documentation)
   - Vercel CLI automatically uses environment variables from Vercel project settings

---

> **📋 Template Commands and Manual Deployment:**  
> For template commands to update environment variables and step-by-step manual deployment instructions, see [Deployment Commands Guide](./3-deployment-commands.md).

---

## Security Best Practices

### ✅ DO:
- Store sensitive values (API keys, secrets, database URLs) in AWS Secrets Manager or Vercel secrets
- Use different credentials for each environment
- Rotate secrets regularly
- Use least-privilege IAM policies for AWS credentials
- Never commit `.env` files to version control
- Use environment-specific values (test vs production keys)

### ❌ DON'T:
- Hardcode secrets in Dockerfile or source code
- Commit environment variables to Git
- Use production credentials in development/test environments
- Share secrets via email or chat
- Store secrets in Docker image layers

---

## Environment Variable Checklist

### Backend Checklist
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `CLERK_SECRET_KEY` - Clerk backend secret
- [ ] `CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- [ ] `CLERK_JWT_KEY` - Clerk JWT signing key
- [ ] `AWS_REGION` - AWS region
- [ ] `AWS_ACCESS_KEY_ID` - AWS access key
- [ ] `AWS_SECRET_ACCESS_KEY` - AWS secret key
- [ ] `AWS_S3_BUCKET_NAME` - S3 bucket name
- [ ] `LIVEKIT_API_KEY` - LiveKit API key
- [ ] `LIVEKIT_API_SECRET` - LiveKit API secret
- [ ] `FRONTEND_URLS` - Allowed CORS origins (optional)
- [ ] `VAPID_PUBLIC_KEY` - Push notification public key (optional)
- [ ] `VAPID_PRIVATE_KEY` - Push notification private key (optional)
- [ ] `RESEND_API_KEY` - Resend API key for email notifications (optional)
- [ ] `PORT` - Application port (optional, defaults to 3001)
- [ ] `LOG_LEVEL` - Logging level (optional, defaults to debug)

### Frontend Checklist
- [ ] `NEXT_PUBLIC_API_URL` - Backend API URL
- [ ] `NEXT_PUBLIC_CHAT_WS_URL` - WebSocket URL for chat
- [ ] `NEXT_PUBLIC_LIVEKIT_WS_URL` - LiveKit WebSocket URL
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- [ ] `CLERK_SECRET_KEY` - Clerk secret (for API routes)
- [ ] `CLERK_WEBHOOK_SECRET` - Clerk webhook secret (optional)
- [ ] `BACKEND_URL` - Backend URL for API routes (optional)

---

## Troubleshooting

### Backend Issues

**Problem:** Application fails to start
- Check that all required environment variables are set
- Verify `DATABASE_URL` is correct and database is accessible
- Check ECS task logs: `aws ecs describe-tasks --cluster <cluster> --tasks <task-id>`

**Problem:** CORS errors
- Verify `FRONTEND_URLS` includes the frontend domain
- Check that frontend URL matches exactly (including protocol and port)

**Problem:** File uploads fail
- Verify AWS credentials have S3 permissions
- Check `AWS_S3_BUCKET_NAME` is correct
- Verify bucket exists and is accessible

### Frontend Issues

**Problem:** API calls fail
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check that backend is accessible from Vercel
- Verify CORS is configured on backend

**Problem:** WebSocket connection fails
- Verify `NEXT_PUBLIC_CHAT_WS_URL` uses correct protocol (`ws://` or `wss://`)
- Check that WebSocket is enabled on ALB
- Verify backend WebSocket gateway is running

**Problem:** Authentication fails
- Verify Clerk keys are correct for the environment
- Check that `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` matches backend `CLERK_PUBLISHABLE_KEY`

---

## Related Documentation

- [AWS Account Setup Guide](./04-aws-account-setup/README.md)
- [GitHub Actions Workflows](./1-github-workflows.md)
- [Deployment Commands Guide](./3-deployment-commands.md)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)

