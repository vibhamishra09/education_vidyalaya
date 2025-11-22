# Backend Overview

## Tech Stack

- **Framework**: NestJS (Node.js framework)
- **Language**: TypeScript
- **Database**: PostgreSQL 14+
- **ORM**: Prisma
- **Authentication**: Clerk (JWT-based)
- **Validation**: class-validator & class-transformer
- **Documentation**: Swagger/OpenAPI
- **Package Manager**: pnpm

## Folder Structure

```
backend/
├── src/
│   ├── app.module.ts          # Root module
│   ├── main.ts                 # Application entry point
│   ├── users/                  # User management module
│   ├── skills/                 # Skills CRUD module
│   ├── study-rooms/            # Study room management
│   ├── peer-sessions/          # Peer session management
│   ├── reviews/                # Review and rating system
│   ├── notifications/          # Notification management
│   ├── payments/               # Payment processing
│   ├── browse/                 # Browse and search
│   ├── dashboard/              # Dashboard data aggregation
│   ├── chat/                   # Real-time chat (LiveKit)
│   ├── upload/                 # File upload handling
│   ├── livekit/                # LiveKit integration
│   ├── prisma/                 # Prisma service and module
│   ├── common/                 # Shared utilities
│   │   ├── decorators/         # Custom decorators
│   │   ├── dto/                # Shared DTOs
│   │   └── guards/             # Auth guards
│   └── utils/                  # Utility functions
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Database migrations
│   └── seed.ts                 # Seed data script
└── dist/                       # Compiled JavaScript
```

## How the Backend Fits into the Overall System

The backend serves as the central API layer that:

1. **Handles Business Logic**: Processes all user requests, validates data, and enforces business rules
2. **Manages Data**: Provides type-safe database access via Prisma ORM
3. **Authenticates Users**: Verifies Clerk JWT tokens on protected endpoints
4. **Integrates External Services**: Connects with Clerk (auth), LiveKit (video), and push notification services
5. **Serves Frontend**: Provides RESTful API endpoints for the Next.js frontend
6. **Processes Payments**: Manages virtual coin transactions with escrow system
7. **Sends Notifications**: Dispatches real-time notifications to users
8. **Generates Tokens**: Creates LiveKit tokens for WebRTC sessions

## Key Responsibilities

- **API Endpoints**: RESTful endpoints organized by domain (users, sessions, etc.)
- **Data Validation**: Input validation using DTOs and class-validator
- **Error Handling**: Standardized error responses with error codes
- **Authentication**: Clerk JWT verification via guards
- **Database Operations**: Type-safe queries via Prisma
- **Webhooks**: Clerk webhook handling for user synchronization
- **Documentation**: Auto-generated Swagger/OpenAPI docs

## Links to Related Documentation

- [API Documentation](./04-api/1-overview.md)
- [Database Documentation](./05-db/1-schema_overview.md)
- [Low-Level Design](./3-lld.md)
- [Requirements](./2-requirements.md)

## Development Workflow

1. **Local Development**: Run `pnpm start:dev` for hot-reload development
2. **Database Migrations**: Use Prisma migrations for schema changes
3. **Testing**: Run `pnpm test` for unit and integration tests
4. **API Documentation**: Access Swagger UI at `/api/docs` when server is running
5. **Database GUI**: Use `pnpm prisma:studio` to view/edit database records

## API Base URL

- **Development**: `http://localhost:3001`
- **Production**: Configured via environment variables

## Port Configuration

- Default port: `3001`
- Configurable via `PORT` environment variable

