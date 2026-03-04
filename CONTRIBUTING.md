# Contributing Guide

Welcome to the Webyalaya codebase 👋  
This document explains how we work with branches, environments, and docs so that everyone stays in sync.

---

## Repo Structure

At the top level, the repo is organized as:

- `backend/` – Backend API (auth, business logic, DB access)
- `my-app/` – Frontend (Next.js web app)
- `docs/` – Architecture, design, and requirements documentation
- `e2e-tests/` – End-to-end test suite
- `lambdas/` – AWS Lambda functions (e.g., feedback-system)

Please keep this structure clean and consistent.

---

## Branches Overview

We use a **trunk + promotion** model with a few long-lived branches:

- `main` – **Production** branch  
- `test` – **Staging / Pre-prod** branch  
- `dev` – **Integration / Dev** branch  
- `wi/*` – Short-lived work-item branches  
- `claude-profiles` – Shared Claude agent profiles (never merged to `dev/test/main`)

### Branch → Environment → Database

| Branch          | Environment URL               | Database           | Purpose                             |
|-----------------|-------------------------------|--------------------|-------------------------------------|
| `main`          | `https://webyalaya.com`       | `webyalaya_prod`   | Live production                     |
| `test`          | `https://test.webyalaya.com`  | `webyalaya_test`   | Staging / QA                        |
| `dev`           | `https://dev.webyalaya.com`   | `webyalaya_dev`    | Integrated development              |
| `wi/*`     | Local only                    | Local or dev DB    | Individual work-item development      |
| `claude-profiles` | n/a (no deployment)        | n/a                | Shared Claude agents & prompts     |

> Only `dev`, `test`, and `main` are tied to deployments.  
> `claude-profiles` is a **library branch** for sharing AI agent profiles and must never be merged into `dev/test/main`.

---

## Prerequisites

Before you start contributing, make sure you have:

- **Node.js** >= 18.x
- **pnpm** >= 8.x (we use pnpm as our package manager)
- **PostgreSQL** >= 14.x
- **Redis** >= 7.x (optional, for local development)
- **Docker & Docker Compose** (optional, for running services locally)

### Installing pnpm

```bash
# Using npm
npm install -g pnpm

# Using Homebrew (macOS)
brew install pnpm

# Using standalone script
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

---

## Local Development Setup

### Initial Setup

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd webyalaya-mvp-1
   ```

2. **Set up Backend**:
   ```bash
   cd backend
   pnpm install
   cp .env.example .env  # Edit .env with your local config
   pnpm prisma generate
   pnpm prisma migrate dev
   pnpm prisma db seed  # Optional: seed with test data
   ```

3. **Set up Frontend**:
   ```bash
   cd ../my-app
   pnpm install
   cp .env.local.example .env.local  # Edit .env.local with your config
   ```

4. **Start development servers**:
   ```bash
   # Terminal 1: Backend
   cd backend
   pnpm start:dev

   # Terminal 2: Frontend
   cd my-app
   pnpm dev
   ```

### Common Development Commands

**Backend:**
- `pnpm start:dev` – Start backend in watch mode
- `pnpm test` – Run unit tests
- `pnpm test:e2e` – Run end-to-end tests
- `pnpm lint` – Lint code
- `pnpm prisma studio` – Open Prisma Studio (DB GUI)
- `pnpm prisma migrate dev` – Create and apply migrations

**Frontend:**
- `pnpm dev` – Start Next.js dev server
- `pnpm build` – Build for production
- `pnpm lint` – Lint code
- `pnpm test` – Run Playwright tests

---

## How to Work on a Feature

### 1. Sync `dev` and create a feature or work-item branch

```bash
git checkout dev
git pull origin dev

git checkout -b wi/<work-item-number>
# e.g. wi/123
```

You always branch off `dev` for new work.

---

### 2. Develop locally

* Use your local `.env` files (see env section below).
* Use either:

  * a **local DB** for safe experiments, or
  * the shared `webyalaya_dev` DB when you want integrated test data.

**Before committing, ensure:**
* Code builds successfully (`pnpm build` in backend/my-app)
* Linting passes (`pnpm lint`)
* Tests pass (if applicable)

Commit often with clear messages and descriptive commit body:

```bash
git add .
git commit -m "feat: implement session booking UI + basic API integration" -m "Describe the changes in detail"
```

Push your branch:

```bash
git push -u origin feature/session-booking
```

---

### 3. Open PR to `dev`

Create a PR:

> **from**: `wi/<work-item-number>`
> **to**: `dev`

**PR Size Guidelines:**
* **Ideal range**: 10-100 lines of code changes
* **Acceptable**: Up to ~500 lines for complex features
* **⚠️ Danger zone**: 1000+ lines — break it down into smaller PRs!

Large PRs are harder to review, increase risk, and slow down the team. If your PR exceeds 500 lines, please consider:
* Splitting into multiple smaller PRs
* Creating a feature flag and merging incrementally
* Breaking down into logical sub-features

**PR Quality Guidelines:**
* **Self-review**: Always review your own code in the web UI before submitting. This instantly highlights left-over `console.log` statements and weird formatting issues.
* **Add context**: Leave comments on your own PR to explain weird diffs or non-obvious necessary changes. Save the reviewer from asking, "Why is this here?"

**PR Description Requirements:**

Your PR must include:

1. **Title**: Clear, concise, and descriptive (e.g., `feat: add session booking UI with calendar integration`)

2. **Description** with:
   * **TL;DR**: Brief summary of what this PR does (1-2 sentences)
   * **Links**: Reference to work items, related issues, or parent PRs
   * **Visuals**: Attach screenshots, GIFs, or videos showing the changes (especially for UI changes)
   * **Reproduction steps**: Exact steps for reviewers to test locally:
     ```markdown
     ## How to Test
     1. Checkout this branch: `git checkout wi/123`
     2. Install dependencies: `pnpm install` (in both backend and my-app)
     3. Set up environment variables:
        - Backend: Copy `.env.example` to `.env` and set `DATABASE_URL=...`
        - Frontend: Copy `.env.local.example` to `.env.local` and set `NEXT_PUBLIC_API_URL=...`
     4. Run migrations: `cd backend && pnpm prisma migrate dev`
     5. Start backend: `pnpm start:dev`
     6. Start frontend: `cd ../my-app && pnpm dev`
     7. Navigate to `/sessions` and test the booking flow
     ```
   * **Required setup**: List any required API keys, environment variables, or external services needed for testing

Checklist before opening the PR:

* [ ] PR has a clear, concise, and descriptive title.
* [ ] PR description includes TL;DR, links to work items, screenshots/GIFs (if UI changes), and exact reproduction steps with required environment variables/API keys.
* [ ] The app builds and runs locally (`pnpm build` in both backend and my-app).
* [ ] PR size is reasonable (ideally 10-100 lines, avoid 1000+ lines).
* [ ] Self-reviewed the PR in the web UI (check for console.logs, formatting issues).
* [ ] Added comments explaining any non-obvious changes or weird diffs.
* [ ] No secrets or hard-coded tokens are committed.
* [ ] If you changed API/DB/contracts, related docs in `docs/` are updated.
* [ ] Database migrations (if any) are included and tested.
* [ ] Environment variable changes are documented in `.env.example` files.

Once approved and merged:

* CI/CD deploys `dev` to **`dev.webyalaya.com`** using **`webyalaya_dev`**.

Use this environment to test integrated features.

---

## PR Review Guidelines

When reviewing PRs, follow these principles to make the review process constructive and efficient:

### Practice Radical Clarity

**Over-communicate your intent** so the author never has to guess if a comment is blocking approval. Use clear prefixes to categorize your comments:

* **[Nit]**: A minor syntax or style suggestion. Not critical for meeting standards. Example: `[Nit] Consider using a more descriptive variable name here.`
* **[Sanity check/Non-Actionable]**: Is this what you meant to do? Just asking for clarity, no change required. Example: `[Sanity check] Did you intend to use `===` instead of `==` here?`
* **[Explicit Deferral]**: Use your judgement, I don't feel strongly about this. Example: `[Explicit Deferral] I'm not sure about this approach, but if you think it's best, go ahead.`
* **[Blocking]**: Must be addressed before approval. Example: `[Blocking] This will cause a security issue in production.`
* **[Suggestion]**: Would improve the code but not required. Example: `[Suggestion] Consider extracting this into a helper function for reusability.`
* **[Question]**: Need clarification to understand the change. Example: `[Question] Why did we choose this approach over the alternative?`

**Always state whether a comment is blocking or not.** If you don't specify, the author may assume it's blocking and delay the PR unnecessarily.

### Generosity and Praise

* **Acknowledge good work**: When you see well-written code, thoughtful solutions, or good practices, say so! Positive feedback encourages the team and reinforces good patterns.
* **Be kind**: Remember that code reviews are about improving code, not criticizing people. Frame feedback constructively.
* **Recognize effort**: If someone tackled a difficult problem or went the extra mile, acknowledge it.

### Progress Over Perfection

* **Bring it up a letter grade, not to A+**: Focus on making the PR better, not perfect. If the code is functional, readable, and follows standards, it's often better to merge and iterate than to hold it up for minor improvements.
* **Prioritize impact**: Spend more time on high-impact feedback (bugs, security, architecture) than on style preferences.
* **Ship and iterate**: It's better to ship good code and improve it later than to delay for perfection. Trust that the team will continue to improve the codebase over time.

### Review Checklist

When reviewing a PR, consider:

* [ ] Does the code solve the problem described in the PR?
* [ ] Are there any obvious bugs or security issues?
* [ ] Is the code readable and maintainable?
* [ ] Are tests included (if applicable)?
* [ ] Is documentation updated (if needed)?
* [ ] Are my comments clear about whether they're blocking or not?

---

### 4. Promote `dev` → `test`

When `dev` is stable and a set of features is ready:

1. Create PR: **`dev` → `test`**
2. CI runs again (tests, build, etc.).
3. On merge:

   * Code is deployed to **`test.webyalaya.com`** using **`webyalaya_test`**.

Staging/testing environment is used for:

* QA / manual test passes
* Checking migrations and integrations
* Testing with more realistic (anonymized) data

---

### 5. Promote `test` → `main`

When staging looks good:

1. Create PR: **`test` → `main`**
2. CI runs full pipeline.
3. On merge:

   * Code is deployed to **`webyalaya.com`** with **`webyalaya_prod`**.

This is the only way changes should reach production.

---

## Claude Profiles Branch

We maintain a dedicated branch for sharing Claude agent profiles:

* Branch name: **`claude-profiles`**
* Purpose: shared AI agents, prompts, and configs by contributors
* Rule: **never open PRs from `claude-profiles` into `dev`, `test`, or `main`.**

### Structure in `claude-profiles` branch

```text
claude_profiles/
  sachin/
    bug_triage.json
    code_review.json
    prompts.md
  nwazota/
    research_helper.json
  templates/
    example_profile.json
README.md
```

Each contributor uses their own folder.

### How to add/update your profiles

```bash
git checkout claude-profiles
git pull origin claude-profiles

# edit/add files in claude_profiles/<your-name>/
git add claude_profiles/<your-name>/
git commit -m "Add new bug triage agent profile"
git push origin claude-profiles
```

### How to use profiles in a feature branch

On a feature branch, you can pull in profiles without merging the branch:

```bash
git checkout feature/session-booking
git checkout claude-profiles -- claude_profiles/sachin/
```

This copies `claude_profiles/sachin/` into your working tree, but does **not** merge `claude-profiles` into your branch.

If you want to avoid accidentally committing these files, add to `.gitignore`:

```gitignore
claude_profiles/
```

---

## Environment Configuration

Each dev is responsible for managing their local environment files. A typical setup:

### Backend

* `backend/.env` – local dev config
* `backend/.env.test` – used by CI/test environment if needed
* **Do not commit** real secrets.

### Frontend (`my-app`)

* `my-app/.env.local` – local dev
* `my-app/.env.production` – used only in deployment pipeline, not committed with real secrets

Never commit `.env` files with secrets. Use env injection in your CI/CD.

---

## Branch Protection Rules (Recommended)

To keep things safe:

### `main`

* Protected
* No direct pushes
* PR required
* CI must pass
* 1–2 approvals required
* No force pushes

### `test`

* Protected
* No direct pushes
* PRs from `dev` or hotfix branches
* CI must pass
* At least 1 approval

### `dev`

* Protected (soft)
* Prefer PRs from `feature/*` branches
* CI must pass

### `claude-profiles`

* Not protected, but:

  * **No PRs into `dev/test/main`**
  * Used only for shared AI configs

---

## Documentation Expectations

We keep design and architecture docs under `docs/`:

* `docs/hld/` – High Level Design, system-wide requirements and architecture
* `docs/backend/` – Backend LLD, API & DB docs
* `docs/frontend/` – Frontend LLD, routes, components, UI/UX flows
* `docs/sequences/` – Sequence diagrams for end-to-end flows

If your work changes APIs, DB schema, or important flows, **update the corresponding docs** in the same PR.

----

## Coding & Commit Style (Short Version)

* Write clear commit messages using conventional commits:

  * `feat: add session booking API`
  * `fix: handle null mentor in session list`
  * `docs: update ERD for new review table`
  * `refactor: simplify dashboard service logic`
  * `test: add unit tests for achievements service`
  * `chore: update dependencies`

* Keep PRs focused: one feature / bugfix per PR.
* Add comments or small docs when behavior is non-obvious.
* Follow TypeScript best practices and existing code style.
* Use `pnpm` for all package management (never commit `package-lock.json` or `yarn.lock`).

## Testing Guidelines

* Write tests for new features when possible.
* Backend: Use Jest for unit tests, located in `*.spec.ts` files.
* Frontend: Use Playwright for E2E tests, located in `tests/` directory.
* Run tests locally before pushing:

## Troubleshooting

### Common Issues

**pnpm install fails:**
- Ensure you're using pnpm >= 8.x
- Try deleting `node_modules` and `pnpm-lock.yaml`, then reinstall

**Database connection errors:**
- Verify PostgreSQL is running
- Check `.env` file has correct `DATABASE_URL`
- Run `pnpm prisma generate` to regenerate Prisma client

**Port already in use:**
- Backend defaults to port 3001, frontend to 3000
- Change ports in `.env` files if needed

Thanks for contributing 🙏

