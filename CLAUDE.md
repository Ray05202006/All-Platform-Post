# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

All-Platform-Post is a multi-platform social media automation system for publishing content to Facebook, Instagram, Twitter/X, and Threads. Features intelligent character-count splitting, OAuth authentication, scheduled publishing, and media handling. Documentation is in Chinese (中文).

## Commands

### Development
```bash
make dev              # Start Docker (PostgreSQL + Redis) and dev servers
make stop             # Stop all services
pnpm dev              # Start frontend (:3000) and backend (:3001) without Docker
```

### Build & Test
```bash
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm test             # Run tests (Jest in api package)
```

### Database
```bash
make db-migrate       # Run Prisma migrations
make db-studio        # Open Prisma Studio GUI
make db-reset         # Reset database (destroys data)
```

### App-Specific (run from respective directory)
```bash
# apps/api/
pnpm prisma:generate  # Generate Prisma client (required after schema changes)
pnpm prisma:migrate   # Run database migrations
pnpm test:watch       # Jest in watch mode
pnpm test:cov         # Jest with coverage

# apps/web/
pnpm lint             # Next.js lint
```

## Architecture

### Monorepo Structure (pnpm workspaces)
```
apps/
  web/     Next.js 14 frontend (App Router, Tailwind, shadcn/ui, TanStack Query)
  api/     NestJS 10 backend (Prisma, BullMQ, Passport.js)
packages/
  shared/        Shared TypeScript types
  text-splitter/ Platform-aware content splitting algorithm
```

### Backend Module Pattern (apps/api/src/modules/)
Each feature is a NestJS module with:
- `*.module.ts` - Module definition with imports/exports
- `*.controller.ts` - REST endpoints
- `*.service.ts` - Business logic
- `dto/` - Request/response validation (class-validator)
- `guards/` - Auth guards (JWT)
- `strategies/` - Passport OAuth strategies
- `decorators/` - Custom decorators (`@Public()`, `@CurrentUser()`)

Key modules: `auth/`, `platform/` (per-platform services), `post/`, `scheduler/`, `media/`

### Data Flow
1. User creates post → stored in PostgreSQL via Prisma
2. If scheduled → BullMQ job created with delay (Redis-backed)
3. At publish time → Platform services call respective APIs
4. Results stored in `Post.results` JSON field, logged to `PublishLog`

### Database Models (apps/api/prisma/schema.prisma)
- **User** - Core account
- **PlatformConnection** - OAuth tokens per platform (AES-256-GCM encrypted)
- **Post** - Content with multi-platform targeting, status tracking
- **PublishLog** - Publishing analytics and errors

### Text Splitter (packages/text-splitter/)
Handles platform-specific character limits:
- Twitter: 280 chars (CJK=2 chars, URLs=23 chars)
- Instagram: 2,200 chars, max 30 hashtags
- Facebook: 63,206 chars
- Threads: 500 chars

Preserves URLs, hashtags, and mentions when splitting.

## Environment Setup

Copy `.env.example` to `.env` and configure:
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_HOST`, `REDIS_PORT` - Redis for BullMQ
- `ENCRYPTION_KEY` - 64-char hex for token encryption (`openssl rand -hex 32`)
- `JWT_SECRET` - Session signing
- Platform OAuth credentials (Facebook, Twitter)

Docker Compose provides PostgreSQL 15 and Redis 7 for local development.

## Key Dependencies

### Backend
- Prisma 5.8 (ORM) - requires `prisma generate` after schema changes
- BullMQ 5.1 (job queue) - backed by Redis
- Sharp 0.33 (image processing)
- Passport.js (OAuth)

### Frontend
- Next.js 14 (App Router)
- TanStack Query (server state)
- shadcn/ui + Radix UI (components)
- React Hook Form + Zod (forms)
