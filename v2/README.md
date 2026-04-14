# All-Platform-Post v2 — Developer Guide

**[English](#english)** | **[繁體中文](#繁體中文)**

---

<a name="english"></a>

## English

This is the v2 of All-Platform-Post, rebuilt as a unified Next.js 14 application deployed on Azure Static Web Apps.

### Stack

- **Next.js 14** (App Router) — frontend + API routes in one app
- **NextAuth.js** — Google OAuth login, JWT sessions
- **Prisma 5** — ORM for PostgreSQL
- **Azure Blob Storage** — media file storage
- **Azure Functions** (timer-function) — triggers scheduled post processing every minute
- **Tailwind CSS** — styling

### Directory Layout

```
v2/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/  # NextAuth handler
│   │   │   ├── connections/         # GET/DELETE platform connections
│   │   │   ├── media/               # Upload & serve media files
│   │   │   ├── oauth/               # Facebook / Instagram / Threads / Twitter OAuth flows
│   │   │   ├── posts/               # Post CRUD, publish, schedule, split preview
│   │   │   └── scheduler/process    # Called by timer to publish due posts
│   │   ├── auth/callback/           # Post-OAuth redirect handler
│   │   ├── dashboard/               # Main UI (compose, history, scheduled, settings)
│   │   └── login/                   # Login page
│   ├── components/
│   │   └── providers.tsx            # SessionProvider wrapper
│   └── lib/
│       ├── auth.ts                  # NextAuth config
│       ├── db.ts                    # Prisma client singleton
│       ├── encryption.ts            # AES-256-GCM token encryption
│       ├── publisher.ts             # Multi-platform publish orchestrator
│       ├── splitter.ts              # Platform-aware text splitter
│       ├── storage.ts               # Azure Blob Storage client
│       ├── types.ts                 # Shared TypeScript types
│       ├── url.ts                   # URL helpers
│       └── platforms/               # Per-platform API clients
│           ├── facebook.ts
│           ├── instagram.ts
│           ├── threads.ts
│           └── twitter.ts
├── prisma/
│   └── schema.prisma                # Database schema
└── timer-function/                  # Azure Functions timer trigger
    └── src/index.ts                 # Calls /api/scheduler/process every minute
```

### Local Development

```bash
# From repo root
cd v2

# Install dependencies
pnpm install

# Generate Prisma client (required after schema changes)
npx prisma generate

# Set up environment variables
cp ../.env.example .env
# Fill in .env with your credentials

# Run database migrations
npx prisma migrate dev

# Start dev server (http://localhost:3000)
pnpm dev
```

### Database

**Schema models:**

- `User` — Google-authenticated users
- `Post` — Content with target platforms, status (`draft | scheduled | publishing | published | failed | partial`), per-platform results JSON
- `PlatformConnection` — Encrypted OAuth tokens per platform per user

**Common Prisma commands:**

```bash
npx prisma migrate dev       # Apply migrations and regenerate client
npx prisma migrate deploy    # Apply migrations in production (no client regeneration)
npx prisma studio            # Open Prisma Studio GUI
npx prisma generate          # Regenerate client after schema edits
```

### Scheduled Posts Flow

1. User sets `scheduledAt` on a post → status set to `scheduled`
2. Azure Functions timer fires every minute → calls `POST /api/scheduler/process` with `SCHEDULER_API_KEY` header
3. API queries posts where `status = scheduled AND scheduledAt <= now()`
4. Each post is atomically set to `publishing`, then published to each platform
5. Result stored in `post.results` JSON; status set to `published`, `failed`, or `partial`

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_URL` | App public URL (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Random secret — `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `FACEBOOK_APP_ID` | Facebook App ID |
| `FACEBOOK_APP_SECRET` | Facebook App Secret |
| `TWITTER_CLIENT_ID` | Twitter OAuth 2.0 Client ID |
| `TWITTER_CLIENT_SECRET` | Twitter OAuth 2.0 Client Secret |
| `TWITTER_API_KEY` | Twitter OAuth 1.0a API Key |
| `TWITTER_API_SECRET` | Twitter OAuth 1.0a API Secret |
| `DATABASE_URL` | PostgreSQL connection string |
| `ENCRYPTION_KEY` | 32-byte hex key — `openssl rand -hex 32` |
| `SCHEDULER_API_KEY` | Shared key between timer and app — `openssl rand -hex 16` |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storage connection string |
| `AZURE_STORAGE_CONTAINER` | Blob container name (default: `media`) |

### Deployment

This app is deployed to **Azure Static Web Apps** via the GitHub Actions workflow at `.github/workflows/azure-static-web-apps-*.yml`.

The timer is deployed separately to **Azure Functions** via `.github/workflows/deploy-timer.yml`.

See the root [README.md](../README.md) for required GitHub secrets.

---

<a name="繁體中文"></a>

## 繁體中文

這是 All-Platform-Post 的 v2 版本，以統一的 Next.js 14 應用程式重新建構，部署於 Azure Static Web Apps。

### 技術棧

- **Next.js 14**（App Router）— 前端與 API 路由整合於同一應用
- **NextAuth.js** — Google OAuth 登入、JWT 工作階段
- **Prisma 5** — PostgreSQL ORM
- **Azure Blob Storage** — 媒體檔案儲存
- **Azure Functions**（timer-function）— 每分鐘觸發排程貼文處理
- **Tailwind CSS** — 樣式

### 目錄結構

```
v2/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/  # NextAuth 處理器
│   │   │   ├── connections/         # 平台連線 GET/DELETE
│   │   │   ├── media/               # 媒體上傳與存取
│   │   │   ├── oauth/               # Facebook / Instagram / Threads / Twitter OAuth 流程
│   │   │   ├── posts/               # 貼文 CRUD、發布、排程、分割預覽
│   │   │   └── scheduler/process    # 計時器觸發端點，發布到期貼文
│   │   ├── auth/callback/           # OAuth 回呼後的重新導向處理
│   │   ├── dashboard/               # 主介面（編輯、歷史、排程、設定）
│   │   └── login/                   # 登入頁面
│   ├── components/
│   │   └── providers.tsx            # SessionProvider 包裝元件
│   └── lib/
│       ├── auth.ts                  # NextAuth 設定
│       ├── db.ts                    # Prisma 客戶端單例
│       ├── encryption.ts            # AES-256-GCM 權杖加密
│       ├── publisher.ts             # 多平台發布協調器
│       ├── splitter.ts              # 平台感知文字分割器
│       ├── storage.ts               # Azure Blob Storage 客戶端
│       ├── types.ts                 # 共用 TypeScript 型別
│       ├── url.ts                   # URL 輔助函式
│       └── platforms/               # 各平台 API 客戶端
│           ├── facebook.ts
│           ├── instagram.ts
│           ├── threads.ts
│           └── twitter.ts
├── prisma/
│   └── schema.prisma                # 資料庫 Schema
└── timer-function/                  # Azure Functions 計時器觸發器
    └── src/index.ts                 # 每分鐘呼叫 /api/scheduler/process
```

### 本機開發

```bash
# 從儲存庫根目錄
cd v2

# 安裝相依套件
pnpm install

# 產生 Prisma 客戶端（每次修改 schema 後必須執行）
npx prisma generate

# 設定環境變數
cp ../.env.example .env
# 填寫 .env 中的各項設定

# 執行資料庫遷移
npx prisma migrate dev

# 啟動開發伺服器（http://localhost:3000）
pnpm dev
```

### 資料庫

**Schema 資料模型：**

- `User` — 透過 Google 驗證的使用者
- `Post` — 內容與目標平台、狀態（`draft | scheduled | publishing | published | failed | partial`）、各平台結果 JSON
- `PlatformConnection` — 每位使用者每個平台的加密 OAuth 權杖

**常用 Prisma 指令：**

```bash
npx prisma migrate dev       # 套用遷移並重新產生客戶端
npx prisma migrate deploy    # 生產環境套用遷移（不重新產生客戶端）
npx prisma studio            # 開啟 Prisma Studio 視覺化介面
npx prisma generate          # 修改 schema 後重新產生客戶端
```

### 排程發文流程

1. 使用者設定 `scheduledAt` → 狀態設為 `scheduled`
2. Azure Functions 計時器每分鐘觸發 → 呼叫 `POST /api/scheduler/process`（帶 `SCHEDULER_API_KEY` 標頭）
3. API 查詢 `status = scheduled AND scheduledAt <= now()` 的貼文
4. 每則貼文原子性地設為 `publishing`，再發布至各平台
5. 結果存入 `post.results` JSON；狀態更新為 `published`、`failed` 或 `partial`

### 環境變數說明

| 變數 | 說明 |
|------|------|
| `NEXTAUTH_URL` | 應用程式公開 URL（例如 `http://localhost:3000`） |
| `NEXTAUTH_SECRET` | 隨機密鑰 — `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth 用戶端 ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 用戶端密鑰 |
| `FACEBOOK_APP_ID` | Facebook App ID |
| `FACEBOOK_APP_SECRET` | Facebook App Secret |
| `TWITTER_CLIENT_ID` | Twitter OAuth 2.0 Client ID |
| `TWITTER_CLIENT_SECRET` | Twitter OAuth 2.0 Client Secret |
| `TWITTER_API_KEY` | Twitter OAuth 1.0a API Key |
| `TWITTER_API_SECRET` | Twitter OAuth 1.0a API Secret |
| `DATABASE_URL` | PostgreSQL 連線字串 |
| `ENCRYPTION_KEY` | 32 位元組十六進位金鑰 — `openssl rand -hex 32` |
| `SCHEDULER_API_KEY` | 計時器與應用程式共用金鑰 — `openssl rand -hex 16` |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storage 連線字串 |
| `AZURE_STORAGE_CONTAINER` | Blob 容器名稱（預設：`media`） |

### 部署

本應用程式透過 `.github/workflows/azure-static-web-apps-*.yml` 工作流程部署至 **Azure Static Web Apps**。

計時器則透過 `.github/workflows/deploy-timer.yml` 單獨部署至 **Azure Functions**。

所需的 GitHub Secrets 詳見根目錄 [README.md](../README.md)。
