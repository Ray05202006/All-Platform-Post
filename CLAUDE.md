# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

All-Platform-Post is a multi-platform social media automation system for publishing content to Facebook, Instagram, Twitter/X, and Threads. Features intelligent character-count splitting, OAuth authentication, scheduled publishing, and media handling.

**Current deployment architecture:**
- **Frontend**: GitHub Pages (Next.js static export via `Ray05202006.github.io`)
- **Backend**: Azure Functions (NestJS wrapped in Azure HTTP trigger)
- **Scheduling**: DB-based scheduler polled by Azure Timer Trigger (no Redis/BullMQ required)

## Commands

### Development
```bash
make dev              # Start Docker (PostgreSQL) and dev servers
make stop             # Stop all services
pnpm dev              # Start frontend (:3000) and backend (:3001) without Docker
```

### Build & Test
```bash
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm test             # Run tests (Jest in api package)
pnpm test:e2e         # Run Playwright E2E tests
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
pnpm test:e2e         # Playwright E2E tests
pnpm test:e2e:ui      # Playwright E2E with UI
pnpm test:e2e:headed  # Playwright E2E in headed mode
```

## Architecture

### Monorepo Structure (pnpm workspaces)
```
apps/
  web/              Next.js 14 frontend (App Router, Tailwind, shadcn/ui, TanStack Query)
  api/              NestJS 10 backend (Prisma, Passport.js) — no Redis dependency
  azure-functions/  Azure Functions wrappers (HTTP trigger + Timer trigger)
packages/
  shared/           Shared TypeScript types and platform configs
  text-splitter/    Platform-aware content splitting algorithm
```

### Deployment Architecture

```
GitHub Pages (static Next.js)
        │ HTTP API calls
        ▼
Azure Functions
  ├── HTTP trigger (index.ts)   — wraps entire NestJS app for REST API
  └── Timer trigger (timer.ts) — polls every minute for due scheduled posts
        │
        ▼
    PostgreSQL (Azure Database / local Docker)
```

The Azure Functions approach uses a **singleton NestJS app** that is initialized once (warm start pattern) and reused across invocations for performance.

### Backend Module Pattern (apps/api/src/modules/)
Each feature is a NestJS module with:
- `*.module.ts` — Module definition with imports/exports
- `*.controller.ts` — REST endpoints
- `*.service.ts` — Business logic
- `dto/` — Request/response validation (class-validator)
- `guards/` — Auth guards (JWT)
- `strategies/` — Passport OAuth strategies
- `decorators/` — Custom decorators (`@Public()`, `@CurrentUser()`)

Key modules: `auth/`, `platform/` (per-platform services), `post/`, `scheduler/`, `media/`

### Scheduling Architecture (DB-based, no Redis)

The scheduler was migrated from BullMQ/Redis to a DB-based approach:

1. User schedules post → `Post.status = 'scheduled'`, `Post.scheduledAt` set in PostgreSQL
2. Azure Timer Trigger fires every minute → calls `SchedulerService.processDuePosts()`
3. `processDuePosts()` queries for posts where `status = 'scheduled' AND scheduledAt <= now`
4. Each due post is atomically set to `status = 'publishing'` (prevents double-processing)
5. `PostService.publishPost()` is called → platform APIs invoked
6. Results stored in `Post.results` JSON field, logged to `PublishLog`

**No Redis is required** for the scheduler. Docker Compose still provides PostgreSQL for local development.

### Data Flow (Post Publishing)
1. User creates post → stored in PostgreSQL via Prisma
2. If immediate → `PostService.publishPost()` called directly
3. If scheduled → `SchedulerService.schedulePost()` sets DB fields; Azure Timer picks it up
4. Platform services call Facebook/Instagram/Twitter/Threads APIs
5. Results stored in `Post.results` JSON, logged to `PublishLog`

### Database Models (apps/api/prisma/schema.prisma)
- **User** — Core account (id, email, name)
- **PlatformConnection** — OAuth tokens per platform (AES-256-GCM encrypted accessToken/refreshToken)
  - Unique constraint: `[userId, platform]`
- **Post** — Content with multi-platform targeting, status tracking
  - `platforms: String[]` — target platforms
  - `status: String` — draft | scheduled | publishing | published | failed | partial
  - `results: JSON` — per-platform publish results
  - Indexes on `[userId, status]` and `scheduledAt`
- **PublishLog** — Publishing analytics and errors per platform

### Text Splitter (packages/text-splitter/)
Handles platform-specific character limits:
- **Twitter**: 280 chars (CJK/emoji = 2 chars each, URLs = fixed 23 chars)
- **Instagram**: 2,200 chars, max 30 hashtags
- **Facebook**: 63,206 chars
- **Threads**: 500 chars

Algorithm: extracts URLs/hashtags/mentions as placeholders → splits on word boundaries → restores placeholders. Supports CJK characters in hashtags (`#[\w\u4e00-\u9fa5]+`).

## Environment Setup

Copy `.env.example` to `.env` and configure:
- `DATABASE_URL` — PostgreSQL connection string
- `ENCRYPTION_KEY` — 64-char hex for token encryption (`openssl rand -hex 32`)
- `JWT_SECRET` — Session signing (`openssl rand -hex 32`)
- `NEXT_PUBLIC_APP_URL` — Frontend URL (default `http://localhost:3000`)
- `API_URL` — Backend URL (default `http://localhost:3001`)
- Platform OAuth credentials: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`, `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

**Note**: `REDIS_HOST`/`REDIS_PORT` are no longer required. Docker Compose provides only PostgreSQL for local development.

Optional cleanup configuration:
- `CLEANUP_POSTS_RETENTION_DAYS` (default: 90)
- `CLEANUP_LOGS_RETENTION_DAYS` (default: 30)
- `CLEANUP_FAILED_JOBS_RETENTION_HOURS` (default: 24)

## Key Dependencies

### Backend (apps/api/)
- **Prisma 5.8** (ORM) — requires `prisma generate` after schema changes
- **Sharp 0.33** (image processing) — resizes/converts media uploads
- **Passport.js** (OAuth) — Facebook, Twitter, Threads, Google strategies + JWT
- **class-validator 0.14** — DTO validation decorators

### Azure Functions (apps/azure-functions/)
- **@azure/functions** — Azure Functions v4 SDK
- **@nestjs/platform-express** — Express adapter for NestJS inside Azure Functions
- Timer trigger schedule: `0 * * * * *` (every minute, cron with seconds)

### Frontend (apps/web/)
- **Next.js 14** (App Router) — static export for GitHub Pages
- **TanStack Query v5** (server state management)
- **shadcn/ui + Radix UI** (component library)
- **React Hook Form + Zod** (form validation)
- **Playwright** (E2E testing)

## CI/CD

GitHub Actions workflows in `.github/workflows/`:
- `ci.yml` — Lint, test, build on every PR
- `playwright.yml` — E2E tests
- `deploy-api.yml` — Deploy Azure Functions
- `deploy-frontend.yml` — Deploy Next.js static build to GitHub Pages

### Required GitHub Repository Secrets

Configure these in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `AZURE_FUNCTIONS_URL` | Full Azure Functions base URL (e.g. `https://your-app.azurewebsites.net`) — used as `NEXT_PUBLIC_API_URL` at frontend build time |
| `AZURE_CREDENTIALS` | Azure service principal JSON for `azure/login` action |
| `AZURE_FUNCTION_APP_NAME` | Azure Function App name |
| `AZURE_RESOURCE_GROUP` | Azure resource group name (required for CORS env var deployment) |
| `POSTGRES_CONNECTION_STRING` | Production PostgreSQL connection string for Prisma migrations |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (also needed as placeholder in E2E CI to prevent build failure) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

### GitHub Pages Setup

1. Go to **Settings → Pages** → set Source to **GitHub Actions**
2. First deploy triggers automatically on push to `main`
3. Site URL: `https://Ray05202006.github.io/All-Platform-Post`

### CORS Configuration Note

The Azure Functions backend reads `CORS_ORIGIN` env var (set automatically by `deploy-api.yml` to `https://Ray05202006.github.io`). This is the browser `Origin` header value — **no path**, just scheme + host.

## Key Conventions

- **Path aliases**: `@/*` → `src/*` in both API and web apps
- **API prefix**: All backend routes are under `/api`
- **CORS**: Backend allows origin from `NEXT_PUBLIC_APP_URL` (defaults to `https://Ray05202006.github.io`)
- **Encryption**: OAuth tokens encrypted with AES-256-GCM before storing in DB
- **Validation**: All API inputs use `class-validator` DTOs with `whitelist: true, forbidNonWhitelisted: true`
- **Testing**: Unit tests in `apps/api/src/**/*.spec.ts` (Jest); E2E in `apps/web/e2e/` (Playwright)
- **Shared types**: Import from `@all-platform-post/shared`; text splitting from `@all-platform-post/text-splitter`
- **Google OAuth login**: Login page redirects directly to `/api/auth/google` (full browser redirect, not a fetch). Strategy in `apps/api/src/modules/auth/strategies/google.strategy.ts`. Callback issues JWT and redirects to frontend with token in URL param.
