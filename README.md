Education Vidyalaya

## 🎓 Overview

Education Vidyalaya is a peer-to-peer learning platform that connects students and facilitates collaborative study sessions. The platform enables real-time video interactions, study room creation, peer matching, and comprehensive progress tracking through achievements and streaks.

## 📋 Table of Contents

- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Core Features](#-core-features)
- [Getting Started](#-getting-started)
- [Development](#-development)
- [Deployment](#-deployment)
- [Monitoring](#-monitoring)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Contributing](#-contributing)

## 🏗 Architecture

### High-Level Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│  API Gateway │────▶│   Backend   │
│  (Next.js)  │     │    (NestJS)  │     │  Services   │
└─────────────┘     └──────────────┘     └─────────────┘
                            │                    │
                            ▼                    ▼
                    ┌──────────────┐     ┌─────────────┐
                    │   LiveKit    │     │  PostgreSQL │
                    │   (WebRTC)   │     │   Database  │
                    └──────────────┘     └─────────────┘
                            │                    │
                            ▼                    ▼
                    ┌──────────────┐     ┌─────────────┐
                    │    Redis     │     │     S3      │
                    │   (Cache)    │     │  (Storage)  │
                    └──────────────┘     └─────────────┘
```

### System Components

- **Frontend (Next.js)**: Server-side rendered React application
- **Backend (NestJS)**: Modular microservices architecture
- **Database (PostgreSQL + Prisma)**: Relational data with ORM
- **Real-time Communication (LiveKit)**: WebRTC for video/audio
- **Caching (Redis)**: Session management and performance optimization
- **Storage (AWS S3)**: File uploads and media storage
- **Monitoring (Prometheus + Grafana)**: Metrics and observability

## 🛠 Tech Stack

### Backend
- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Real-time**: LiveKit WebRTC
- **Authentication**: JWT-based auth
- **Validation**: class-validator
- **API Documentation**: OpenAPI/Swagger

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Context/Zustand
- **Forms**: React Hook Form + Zod
- **Real-time**: WebSocket + LiveKit SDK

### Infrastructure
- **Cloud Provider**: AWS
- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **CDN**: CloudFront (for static assets)

## 📁 Project Structure

```
education_vidyalaya/
├── backend/                    # NestJS Backend Service
│   ├── src/
│   │   ├── achievements/       # Achievement tracking system
│   │   ├── availability/       # User availability management
│   │   ├── browse/            # Browse peers functionality
│   │   ├── chat/              # Real-time chat module
│   │   ├── dashboard/         # User dashboard data
│   │   ├── livekit/           # Video call integration
│   │   ├── notifications/     # Push notifications
│   │   ├── payments/          # Payment processing (Razorpay)
│   │   ├── peer-sessions/     # Peer learning sessions
│   │   ├── reviews/           # Peer review system
│   │   ├── skills/            # Skills management
│   │   ├── streaks/           # Learning streak tracking
│   │   ├── study-rooms/       # Virtual study rooms
│   │   ├── transcripts/       # Session transcripts
│   │   ├── upload/            # File upload service
│   │   └── users/             # User management
│   ├── prisma/                # Database schema & migrations
│   ├── monitoring/            # Prometheus & Grafana configs
│   └── scripts/               # Utility scripts
│
├── my-app/                    # Next.js Frontend Application
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   ├── components/       # React components
│   │   ├── lib/              # Utility functions
│   │   └── hooks/            # Custom React hooks
│   └── public/               # Static assets
│
├── docs/                      # Comprehensive documentation
│   ├── 01-hld/               # High-Level Design
│   ├── 02-backend/           # Backend architecture
│   ├── 03-frontend/          # Frontend architecture
│   ├── 04-sequences/         # Sequence diagrams
│   └── 05-deployment/        # Deployment guides
│
├── infra/                     # Infrastructure as Code
│   └── aws/                  # AWS resource definitions
│
└── lambdas/                   # AWS Lambda functions
    └── feedback-system/      # Feedback collection service
```

## ✨ Core Features

### 1. **Study Rooms**
- Create virtual study rooms with topics and duration
- Real-time video/audio communication via LiveKit
- Session recording and transcription
- Host controls and participant management
- Session feedback collection

### 2. **Peer Sessions**
- One-on-one learning sessions
- Skill-based peer matching
- Availability scheduling
- Session reviews and ratings
- Progress tracking

### 3. **User System**
- Profile management (students & teachers)
- Skill tracking and verification
- Availability calendar
- Achievement badges
- Learning streaks

### 4. **Chat & Communication**
- Real-time text chat
- File sharing
- Notifications system
- Push notifications (Firebase)

### 5. **Browse & Discovery**
- Search peers by skills
- Filter by availability
- View peer profiles and ratings
- Smart matching algorithm

### 6. **Gamification**
- Achievement system (badges)
- Learning streaks
- Progress milestones
- Leaderboards

### 7. **Payments**
- Razorpay integration
- Session pricing
- Payment tracking
- Refund management

### 8. **Analytics & Monitoring**
- Prometheus metrics
- Grafana dashboards
- Performance monitoring
- Error tracking
- User analytics

## 🚀 Getting Started

### Prerequisites

```bash
# Required software
- Node.js >= 18.x
- pnpm >= 8.x
- PostgreSQL >= 14.x
- Redis >= 7.x
- Docker & Docker Compose
```

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
pnpm prisma migrate dev

# Seed the database
pnpm prisma db seed

# Start development server
pnpm start:dev
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd my-app

# Install dependencies
pnpm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your configuration

# Start development server
pnpm dev
```

### Docker Setup

```bash
# Start all services with Docker Compose
docker-compose up -d

# Start with monitoring
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

## 🔧 Development

### Backend Development

```bash
# Run in watch mode
pnpm start:dev

# Run tests
pnpm test

# E2E tests
pnpm test:e2e

# Generate Prisma client
pnpm prisma generate

# Create new migration
pnpm prisma migrate dev --name migration_name
```

### Frontend Development

```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/webyalaya"
JWT_SECRET="your-secret-key"
REDIS_URL="redis://localhost:6379"
LIVEKIT_API_KEY="your-livekit-api-key"
LIVEKIT_API_SECRET="your-livekit-secret"
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_S3_BUCKET="your-bucket-name"
RAZORPAY_KEY_ID="your-razorpay-key"
RAZORPAY_KEY_SECRET="your-razorpay-secret"
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_LIVEKIT_URL="wss://your-livekit-url"
NEXT_PUBLIC_FIREBASE_CONFIG='{"apiKey":"...","projectId":"..."}'
```

## 📦 Deployment

### AWS Deployment

The project includes GitHub Actions workflows for automated deployment:

```
.github/workflows/
├── deploy-dev.yml          # Deploy to dev environment
├── deploy-test.yml         # Deploy to test environment
└── deploy.yml              # Deploy to production
```



### Manual Deployment

```bash
# Build backend
cd backend


# Build frontend
cd my-app



```

See [deployment documentation](docs/05-deployment/) for detailed guides.

## 📊 Monitoring

### Access Monitoring Tools

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)

### Key Metrics

- API response times
- Database query performance
- WebRTC connection quality
- User session duration
- Error rates
- Cache hit rates

### Setting Up Monitoring

```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Run verification script
cd backend/monitoring
./verify-setup.ps1

# Run stress tests
node stress-test.js
```

See [MONITORING.md](backend/MONITORING.md) for comprehensive monitoring guide.

## 📚 API Documentation

### Key Endpoints

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh token

#### Study Rooms
- `POST /study-rooms` - Create study room
- `GET /study-rooms` - List active rooms
- `POST /study-rooms/:id/join` - Join room
- `POST /study-rooms/:id/feedback` - Submit feedback

#### Peer Sessions
- `POST /peer-sessions` - Create session
- `GET /peer-sessions/my-sessions` - User's sessions
- `POST /peer-sessions/:id/complete` - Complete session
- `POST /peer-sessions/:id/review` - Submit review

#### Browse
- `GET /browse/peers` - Search peers
- `GET /browse/peers/:id` - Peer profile

#### Achievements
- `GET /achievements` - List achievements
- `GET /achievements/my-achievements` - User achievements
- `POST /achievements/check` - Check achievement progress

#### Streaks
- `GET /streaks/current` - Current streak
- `POST /streaks/update` - Update streak

For complete API documentation, run the backend and visit:
```
http://localhost:3001/api/docs
```

## 🧪 Testing

### Backend Tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov

# Test specific module
pnpm test achievements
```

### Frontend Tests

```bash
# Run tests
pnpm test

# Test with coverage
pnpm test:coverage
```

### Test Achievement Flow

```bash
cd backend/scripts
pnpm tsx test-achievement-flow.ts
```


### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation
- Follow existing code style



## 🔗 Related Documentation

- [Feedback System](docs/FEEDBACK_SYSTEM.md)
- [Push Notifications](docs/PUSH_NOTIFICATIONS.md)
- [Monitoring Guide](backend/MONITORING.md)
- [Stress Testing](backend/monitoring/STRESS_TEST_GUIDE.md)
- [High-Level Design](docs/01-hld/)
- [Backend Architecture](docs/02-backend/)
- [Frontend Architecture](docs/03-frontend/)




---


