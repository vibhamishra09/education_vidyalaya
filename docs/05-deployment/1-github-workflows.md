# GitHub Actions Workflows

This document describes the CI/CD workflows configured for automated deployment of the Webyalaya application.

## Overview

The project uses three GitHub Actions workflows for deploying to different environments:

1. **Deploy (Dev)** - Development environment
2. **Deploy (Test)** - Test/staging environment  
3. **Deploy** - Production environment

All workflows follow a similar pattern with environment-specific configurations. They automatically detect changes in the codebase and deploy only the affected components (backend or frontend).

## Workflow Architecture

Each workflow consists of three main jobs:

1. **changes** - Detects which parts of the codebase have changed
2. **deploy-backend** - Builds and deploys the backend to AWS ECS (if backend changed)
3. **deploy-frontend** - Deploys the frontend to Vercel (if frontend changed)

## Workflow Details

### 1. Deploy (Dev)

**File:** `.github/workflows/deploy-dev.yml`

**Trigger:**
- Branch: `dev`
- Paths:
  - `backend/**`
  - `my-app/**`
  - `.github/workflows/deploy-dev.yml`

**Backend Configuration:**
- AWS Region: `us-west-2`
- ECR Repository: `webyalaya-dev-backend-app`
- ECS Cluster: `webyalaya-dev-backend-cluster`
- ECS Service: `webyalaya-dev-backend-task-service`
- Image Tags: `dev-{sha}` and `latest`

**Frontend Configuration:**
- Deployment Type: Preview
- Vercel Project ID Secret: `VERCEL_PROJECT_ID_DEV`

**Use Case:** Development environment for testing new features before they reach test/production.

---

### 2. Deploy (Test)

**File:** `.github/workflows/deploy-test.yml`

**Trigger:**
- Branch: `test`
- Paths:
  - `backend/**`
  - `my-app/**`
  - `.github/workflows/deploy-test.yml`

**Backend Configuration:**
- AWS Region: `us-west-2`
- ECR Repository: `webyalaya-test-backend-app`
- ECS Cluster: `webyalaya-test-backend-app`
- ECS Service: `webyalaya-test-backend-task-service`
- Image Tags: `test-{sha}` and `latest`

**Frontend Configuration:**
- Deployment Type: Preview
- Vercel Project ID Secret: `VERCEL_PROJECT_ID_TEST`

**Use Case:** Test/staging environment for QA and pre-production validation.

---

### 3. Deploy (Production)

**File:** `.github/workflows/deploy.yml`

**Trigger:**
- Branch: `main`
- Paths:
  - `backend/**`
  - `my-app/**`
  - `.github/workflows/deploy.yml`

**Backend Configuration:**
- AWS Region: `us-west-2`
- ECR Repository: `webyalaya-backend-app`
- ECS Cluster: `webyalaya-backend-cluster`
- ECS Service: `webyalaya-backend-task-service`
- Image Tags: `{sha}` and `latest`

**Frontend Configuration:**
- Deployment Type: Production (`--prod` flag)
- Vercel Project ID Secret: `VERCEL_PROJECT_ID`

**Use Case:** Production environment serving live users.

---

## Change Detection

All workflows use the `dorny/paths-filter@v2` action to detect changes:

- **Backend changes:** Files in `backend/**`
- **Frontend changes:** Files in `my-app/**`

The workflows only run deployment jobs if the corresponding component has changed, saving CI/CD resources and time.

## Backend Deployment Process

When backend changes are detected, the workflow:

1. **Checks out code** from the repository
2. **Configures AWS credentials** using GitHub secrets
3. **Logs into Amazon ECR** for Docker image registry access
4. **Sets up pnpm** (version 9) and Node.js (version 20)
5. **Installs dependencies** using `pnpm install --frozen-lockfile`
6. **Generates Prisma Client** (using a dummy DATABASE_URL)
7. **Builds the application** using `pnpm build`
8. **Builds Docker image** and tags it with:
   - Commit SHA-based tag (e.g., `dev-abc123`, `test-abc123`, `abc123`)
   - Environment-specific `latest` tag (e.g., `latest`, `latest`, `latest`)
9. **Pushes images** to Amazon ECR
10. **Forces new ECS deployment** to update the running service

## Frontend Deployment Process

When frontend changes are detected, the workflow:

1. **Checks out code** from the repository
2. **Sets up Node.js** (version 20)
3. **Installs Vercel CLI** globally
4. **Deploys to Vercel**:
   - Dev/Test: Preview deployment (`vercel --yes`)
   - Production: Production deployment (`vercel --prod --yes`)

## Required GitHub Secrets

The workflows require the following secrets to be configured in GitHub:

### AWS Secrets (for backend deployment)
- `AWS_ACCESS_KEY_ID` - AWS access key for ECR and ECS access
- `AWS_SECRET_ACCESS_KEY` - AWS secret key

### Vercel Secrets (for frontend deployment)
- `VERCEL_TOKEN` - Vercel API token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Production Vercel project ID
- `VERCEL_PROJECT_ID_TEST` - Test environment Vercel project ID
- `VERCEL_PROJECT_ID_DEV` - Dev environment Vercel project ID

## Workflow Execution Flow

```
Push to branch (dev/test/main)
    ↓
Change Detection Job
    ├─→ Backend changes detected?
    │   └─→ Yes → Deploy Backend Job
    │
    └─→ Frontend changes detected?
        └─→ Yes → Deploy Frontend Job
```

## Best Practices

1. **Branch Protection:** Ensure `main` branch has protection rules to prevent direct pushes
2. **Testing:** Always test changes in `dev` before merging to `test`, and in `test` before merging to `main`
3. **Monitoring:** Monitor deployment logs in GitHub Actions and check AWS ECS/Vercel dashboards after deployments
4. **Rollback:** Keep previous Docker images tagged in ECR for quick rollback if needed
5. **Secrets Management:** Rotate secrets regularly and use least-privilege IAM policies for AWS credentials

## Troubleshooting

### Workflow not triggering
- Verify the branch name matches the workflow trigger (`dev`, `test`, or `main`)
- Check that changes are in the monitored paths (`backend/**` or `my-app/**`)
- Ensure the workflow file itself hasn't been modified incorrectly

### Backend deployment failures
- Verify AWS credentials are correct and have necessary permissions
- Check ECR repository exists and is accessible
- Ensure ECS cluster and service names are correct
- Review build logs for compilation errors

### Frontend deployment failures
- Verify Vercel token and project IDs are correct
- Check Vercel project exists and is linked to the repository
- Review Vercel deployment logs for build errors

### Change detection not working
- Ensure `fetch-depth: 2` is set in checkout step (needed for path filtering)
- Check that changes are actually in `backend/**` or `my-app/**` directories
- Verify the `dorny/paths-filter` action is working correctly

## Related Documentation

- [AWS Account Setup Guide](./04-aws-account-setup/README.md)
- [Environment Variables Configuration](./2-environment-variables.md)
- [Deployment Commands Guide](./3-deployment-commands.md)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Amazon ECR Documentation](https://docs.aws.amazon.com/ecr/)
- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

