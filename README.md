# All-Platform-Post

**[English](#english)** | **[繁體中文](#繁體中文)**

---

<a name="english"></a>

## English

A self-hosted multi-platform social media management system that lets you write once and publish to Facebook, Instagram, Twitter/X, and Threads simultaneously.

**Live Demo**: [https://brave-meadow-09650f810.6.azurestaticapps.net](https://brave-meadow-09650f810.6.azurestaticapps.net)

### Features

- **Multi-platform publishing** — Publish to Facebook, Instagram, Twitter/X, and Threads in one click
- **Smart text splitting** — Automatically splits content to fit each platform's character limit
- **Scheduled publishing** — Schedule posts to be published at a specific time
- **Media upload** — Upload images and videos stored on Azure Blob Storage
- **OAuth authentication** — Securely connect platform accounts; tokens encrypted with AES-256-GCM
- **Live preview** — See how content splits across platforms as you type

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend + API | Next.js 14 (App Router) |
| Authentication | NextAuth.js (Google OAuth login) |
| Database | PostgreSQL + Prisma ORM |
| Media Storage | Azure Blob Storage |
| Scheduled Jobs | Azure Functions (Timer trigger) |
| Deployment | Azure Static Web Apps |

### Architecture

```
Browser
  │  HTTPS
  ▼
Azure Static Web Apps
  └── Next.js 14 (App Router)
        ├── /dashboard        — UI pages
        └── /api/...          — API routes (connections, posts, OAuth, media)

Azure Functions (Timer trigger, every minute)
  └── POST /api/scheduler/process  — Triggers due scheduled posts

PostgreSQL (Azure Database)
  └── Users, Posts, PlatformConnections
```

### Project Structure

```
.
├── v2/                          # Main application
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/             # Next.js API routes
│   │   │   │   ├── auth/        # NextAuth
│   │   │   │   ├── connections/ # Platform OAuth token management
│   │   │   │   ├── media/       # Media upload / serve
│   │   │   │   ├── oauth/       # Platform OAuth flows
│   │   │   │   ├── posts/       # Post CRUD, publish, schedule
│   │   │   │   └── scheduler/   # Scheduler trigger endpoint
│   │   │   ├── dashboard/       # Dashboard pages
│   │   │   └── login/           # Login page
│   │   ├── components/          # React components
│   │   └── lib/                 # Platform clients, utilities
│   ├── prisma/                  # Database schema & migrations
│   └── timer-function/          # Azure Functions timer
├── scripts/                     # Key generation utilities
└── .github/workflows/           # CI/CD pipelines
```

### Quick Start

**Prerequisites**

- Node.js >= 18
- pnpm >= 8
- PostgreSQL >= 15 (local or cloud)

**Setup**

```bash
# Clone the repo
git clone https://github.com/Ray05202006/All-Platform-Post.git
cd All-Platform-Post/v2

# Install dependencies
pnpm install

# Generate Prisma client
npx prisma generate

# Copy and fill in environment variables
cp ../.env.example .env
# Edit .env — see Environment Variables section below

# Run database migrations
npx prisma migrate dev

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Environment Variables**

```bash
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=          # openssl rand -hex 32

# Google OAuth (user login)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Platform OAuth
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
TWITTER_API_KEY=
TWITTER_API_SECRET=

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/allplatformpost

# Security
ENCRYPTION_KEY=           # openssl rand -hex 32
SCHEDULER_API_KEY=        # openssl rand -hex 16

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER=media
```

### Platform API Setup

**Facebook / Instagram / Threads**

1. Go to [Facebook Developers](https://developers.facebook.com/) and create an app (Consumer type)
2. Add the **Facebook Login** product
3. Get the **App ID** and **App Secret** from App Settings
4. Add callback URIs:
   - `https://YOUR_APP_URL/api/oauth/facebook/callback`
   - `https://YOUR_APP_URL/api/oauth/instagram/callback`
   - `https://YOUR_APP_URL/api/oauth/threads/callback`
5. Required permissions: `pages_show_list`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`, `threads_basic`, `threads_content_publish`

**Twitter/X**

1. Go to [Twitter Developer Portal](https://developer.twitter.com/) and create a project and app
2. Under **User authentication settings**, set callback URI: `https://YOUR_APP_URL/api/oauth/twitter/callback`
3. Copy the **Client ID**, **Client Secret**, **API Key**, and **API Secret**

> **Note**: The free tier allows 500 tweets/month, which is sufficient for personal use.

### Character Limits

| Platform | Limit | Notes |
|----------|-------|-------|
| Facebook | 63,206 chars | — |
| Instagram | 2,200 chars | Max 30 hashtags |
| Twitter/X | 280 chars | CJK = 2 chars; URLs = 23 chars |
| Threads | 500 chars | — |

### Deployment

**Azure Static Web Apps (Frontend + API)**

1. Go to **Settings → Pages** is not needed — this app uses Azure Static Web Apps.
2. Add the following GitHub repository secrets (**Settings → Secrets and variables → Actions**):

   | Secret | Description |
   |--------|-------------|
   | `AZURE_STATIC_WEB_APPS_API_TOKEN_*` | Azure Static Web Apps deploy token |
   | `NEXT_PUBLIC_APP_URL` | Public URL of your Azure Static Web App |

3. Push to `main` to trigger automatic deployment.

**Azure Functions Timer (Scheduled Posts)**

Add the following secrets:

| Secret | Description |
|--------|-------------|
| `AZURE_CREDENTIALS` | Azure service principal JSON |
| `AZURE_TIMER_FUNCTION_NAME` | Azure Function App name |
| `AZURE_RESOURCE_GROUP` | Azure resource group name |
| `SCHEDULER_APP_URL` | Your Azure Static Web App URL |
| `SCHEDULER_API_KEY` | Matches `SCHEDULER_API_KEY` in the app |

### Security

- OAuth 2.0 / OAuth 1.0a authentication flows
- AES-256-GCM encrypted storage for platform access tokens
- NextAuth.js session management (JWT)
- CORS protection
- Input validation on all API routes

### License

MIT

---

<a name="繁體中文"></a>

## 繁體中文

個人自建的多平台社群媒體發文系統，支援 Facebook、Instagram、Twitter/X、Threads 四大平台的統一發文管理。

**線上展示**：[https://brave-meadow-09650f810.6.azurestaticapps.net](https://brave-meadow-09650f810.6.azurestaticapps.net)

### 核心功能

- **多平台發布** — 一次編寫，同時發布到 Facebook、Instagram、Twitter/X、Threads
- **智慧字數分割** — 自動偵測各平台字數限制，智慧斷句分段
- **定時發布** — 支援預約發文，自動在指定時間發布
- **媒體上傳** — 支援圖片與影片上傳，儲存於 Azure Blob Storage
- **OAuth 認證** — 安全連接平台帳號，存取權杖以 AES-256-GCM 加密儲存
- **即時預覽** — 編輯時即時查看各平台的分割效果

### 技術棧

| 層級 | 技術 |
|------|------|
| 前端 + API | Next.js 14（App Router） |
| 身份驗證 | NextAuth.js（Google OAuth 登入） |
| 資料庫 | PostgreSQL + Prisma ORM |
| 媒體儲存 | Azure Blob Storage |
| 排程任務 | Azure Functions（Timer 觸發器） |
| 部署 | Azure Static Web Apps |

### 部署架構

```
瀏覽器
  │  HTTPS
  ▼
Azure Static Web Apps
  └── Next.js 14 (App Router)
        ├── /dashboard        — 使用者介面頁面
        └── /api/...          — API 路由（連線、貼文、OAuth、媒體）

Azure Functions（Timer 觸發器，每分鐘執行）
  └── POST /api/scheduler/process  — 觸發到期的排程貼文

PostgreSQL（Azure Database）
  └── 使用者、貼文、平台連線
```

### 專案結構

```
.
├── v2/                          # 主應用程式
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/             # Next.js API 路由
│   │   │   │   ├── auth/        # NextAuth
│   │   │   │   ├── connections/ # 平台 OAuth 權杖管理
│   │   │   │   ├── media/       # 媒體上傳 / 存取
│   │   │   │   ├── oauth/       # 平台 OAuth 流程
│   │   │   │   ├── posts/       # 貼文 CRUD、發布、排程
│   │   │   │   └── scheduler/   # 排程觸發端點
│   │   │   ├── dashboard/       # 主控台頁面
│   │   │   └── login/           # 登入頁面
│   │   ├── components/          # React 元件
│   │   └── lib/                 # 平台客戶端、工具函式
│   ├── prisma/                  # 資料庫 Schema 與遷移
│   └── timer-function/          # Azure Functions 計時器
├── scripts/                     # 金鑰生成工具
└── .github/workflows/           # CI/CD 流水線
```

### 快速開始

**前置要求**

- Node.js >= 18
- pnpm >= 8
- PostgreSQL >= 15（本機或雲端）

**安裝步驟**

```bash
# 複製儲存庫
git clone https://github.com/Ray05202006/All-Platform-Post.git
cd All-Platform-Post/v2

# 安裝相依套件
pnpm install

# 產生 Prisma 客戶端
npx prisma generate

# 複製並填寫環境變數
cp ../.env.example .env
# 編輯 .env，填入各項設定

# 執行資料庫遷移
npx prisma migrate dev

# 啟動開發伺服器
pnpm dev
```

開啟瀏覽器前往 [http://localhost:3000](http://localhost:3000)。

**環境變數**

```bash
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=          # openssl rand -hex 32

# Google OAuth（使用者登入）
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# 平台 OAuth
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
TWITTER_API_KEY=
TWITTER_API_SECRET=

# 資料庫
DATABASE_URL=postgresql://user:password@localhost:5432/allplatformpost

# 安全性
ENCRYPTION_KEY=           # openssl rand -hex 32
SCHEDULER_API_KEY=        # openssl rand -hex 16

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER=media
```

### 平台 API 申請

**Facebook / Instagram / Threads**

1. 前往 [Facebook Developers](https://developers.facebook.com/) 建立應用程式（消費者類型）
2. 新增 **Facebook Login** 產品
3. 從應用程式設定取得 **App ID** 和 **App Secret**
4. 新增回呼 URI：
   - `https://YOUR_APP_URL/api/oauth/facebook/callback`
   - `https://YOUR_APP_URL/api/oauth/instagram/callback`
   - `https://YOUR_APP_URL/api/oauth/threads/callback`
5. 申請必要權限：`pages_show_list`、`pages_manage_posts`、`instagram_basic`、`instagram_content_publish`、`threads_basic`、`threads_content_publish`

**Twitter/X**

1. 前往 [Twitter Developer Portal](https://developer.twitter.com/) 建立專案與應用程式
2. 在「User authentication settings」設定回呼 URI：`https://YOUR_APP_URL/api/oauth/twitter/callback`
3. 取得 **Client ID**、**Client Secret**、**API Key**、**API Secret**

> **注意**：免費方案每月 500 則推文，個人使用通常已足夠。

### 字數限制

| 平台 | 字數上限 | 備註 |
|------|---------|------|
| Facebook | 63,206 字元 | — |
| Instagram | 2,200 字元 | 最多 30 個 hashtag |
| Twitter/X | 280 字元 | 中日韓字元算 2 字元；URL 固定算 23 字元 |
| Threads | 500 字元 | — |

### 部署

**Azure Static Web Apps（前端 + API）**

1. 在 GitHub 儲存庫新增以下 Secrets（**Settings → Secrets and variables → Actions**）：

   | Secret | 說明 |
   |--------|------|
   | `AZURE_STATIC_WEB_APPS_API_TOKEN_*` | Azure Static Web Apps 部署金鑰 |
   | `NEXT_PUBLIC_APP_URL` | Azure Static Web App 的公開 URL |

2. 推送至 `main` 分支即自動觸發部署。

**Azure Functions 計時器（排程發文）**

新增以下 Secrets：

| Secret | 說明 |
|--------|------|
| `AZURE_CREDENTIALS` | Azure 服務主體 JSON |
| `AZURE_TIMER_FUNCTION_NAME` | Azure Function App 名稱 |
| `AZURE_RESOURCE_GROUP` | Azure 資源群組名稱 |
| `SCHEDULER_APP_URL` | Azure Static Web App 的 URL |
| `SCHEDULER_API_KEY` | 與應用程式內 `SCHEDULER_API_KEY` 相同 |

### 安全性

- OAuth 2.0 / OAuth 1.0a 認證流程
- AES-256-GCM 加密儲存平台存取權杖
- NextAuth.js 工作階段管理（JWT）
- CORS 保護
- 所有 API 路由皆有輸入驗證

### 授權

MIT
