# All-Platform-Post

個人自建的多平台社群媒體發文系統，支援 Facebook、Instagram、Twitter/X、Threads 四大平台的統一發文管理。

**線上展示**：[https://Ray05202006.github.io/All-Platform-Post](https://Ray05202006.github.io/All-Platform-Post)

## 核心功能

- ✅ **多平台發布**：一次編寫，同時發布到 Facebook、Instagram、Twitter、Threads
- ✅ **智慧字數分割**：自動偵測各平台字數限制，智慧斷句分段
- ✅ **定時發布**：支援預約發文，自動在指定時間發布
- ✅ **媒體上傳**：支援圖片和影片上傳，自動適配各平台格式要求
- ✅ **OAuth 認證**：安全的平台帳號連接，加密儲存存取令牌
- ✅ **即時預覽**：編輯時即時查看各平台的分割效果

## 技術棧

### 前端
- **Next.js 14** (App Router，靜態匯出部署至 GitHub Pages)
- **React 18** + TypeScript
- **Tailwind CSS** + shadcn/ui
- **TanStack Query** (資料管理)

### 後端
- **NestJS 10** + TypeScript（部署至 Azure Functions）
- **Prisma** (ORM)
- **PostgreSQL** (資料庫)
- **Passport.js** (OAuth 認證)

### 部署架構

```
GitHub Pages (靜態 Next.js)
        │ HTTP API 呼叫
        ▼
Azure Functions
  ├── HTTP trigger  — 包裝整個 NestJS 應用程式
  └── Timer trigger — 每分鐘輪詢資料庫執行定時發文
        │
        ▼
    PostgreSQL (Azure Database / 本機 Docker)
```

## 專案結構

```
.
├── apps/
│   ├── web/              # Next.js 前端
│   ├── api/              # NestJS 後端
│   └── azure-functions/  # Azure Functions 封裝
├── packages/
│   ├── shared/           # 共用型別與工具
│   └── text-splitter/    # 智慧字數分割函式庫
└── README.md
```

## 快速開始

### 前置要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker（用於本機 PostgreSQL）或自備 PostgreSQL >= 15

### 安裝

```bash
# 複製儲存庫
git clone https://github.com/Ray05202006/All-Platform-Post.git
cd All-Platform-Post

# 安裝依賴
pnpm install

# 複製環境變數檔案
cp .env.example .env

# 編輯 .env，填入密鑰與其他設定
# ENCRYPTION_KEY 與 JWT_SECRET 可用以下指令產生：
openssl rand -hex 32

# 啟動 Docker (PostgreSQL)
make dev

# 或不使用 Docker，直接啟動開發伺服器
pnpm dev
```

前端：http://localhost:3000
後端：http://localhost:7071（Azure Functions 本機模擬）

## 平台 API 申請指南

### Facebook & Instagram & Threads

1. 前往 [Facebook Developers](https://developers.facebook.com/)
2. 建立新應用，選擇「消費者」類型
3. 新增「Facebook Login」產品
4. 在「設定」中取得 App ID 和 App Secret
5. 新增重新導向 URI：`https://YOUR_AZURE_FUNCTIONS_URL/api/auth/facebook/callback`
6. 申請以下權限：
   - `pages_show_list`
   - `pages_manage_posts`
   - `pages_manage_engagement`
   - `instagram_basic`
   - `instagram_content_publish`

### Twitter/X

1. 前往 [Twitter Developer Portal](https://developer.twitter.com/)
2. 建立新專案和應用程式
3. 選擇 API 層級（免費層或 Basic $200/月）
4. 在「User authentication settings」中設定：
   - Type: Web App
   - Callback URI: `https://YOUR_AZURE_FUNCTIONS_URL/api/auth/twitter/callback`
5. 取得 Client ID 和 Client Secret

> **注意**：免費層每月僅 500 則推文，建議個人使用。

## 字數限制說明

| 平台 | 單則貼文字數 | 特殊規則 |
|------|-------------|---------|
| Facebook | 63,206 字 | 無 |
| Instagram | 2,200 字 | 最多 30 個 hashtag |
| Twitter | 280 字 | 中文算 2 字元，URL 固定算 23 字 |
| Threads | 500 字 | 建議只用 1 個 hashtag |

## 智慧分割範例

**輸入內容**（350 字）：
```
今天學習了 React Server Components 的工作原理，真的太強大了！
傳統的 SSR 需要在伺服器渲染整個頁面，然後傳送到客戶端。
而 RSC 可以讓某些元件完全在伺服器執行，減少 JavaScript 包大小...
```

**Twitter 分割結果**（280 字限制）：
```
[1/2] 今天學習了 React Server Components 的工作原理，真的太強大了！
傳統的 SSR 需要在伺服器渲染整個頁面，然後傳送到客戶端。

[2/2] 而 RSC 可以讓某些元件完全在伺服器執行，減少 JavaScript 包大小...
```

**Threads / Facebook**：
```
[不分割] 今天學習了 React Server Components 的工作原理...
```

## 部署指南

### GitHub Pages（前端）

1. 至 GitHub repo → **Settings → Pages** → Source 設為 **GitHub Actions**
2. 設定以下 Repository Secrets（Settings → Secrets and variables → Actions）：

   | Secret | 說明 |
   |--------|------|
   | `AZURE_FUNCTIONS_URL` | Azure Functions 完整 URL（如 `https://your-app.azurewebsites.net`） |
   | `AZURE_CREDENTIALS` | Azure 服務主體 JSON |
   | `AZURE_FUNCTION_APP_NAME` | Azure Function App 名稱 |
   | `AZURE_RESOURCE_GROUP` | Azure 資源群組名稱 |
   | `POSTGRES_CONNECTION_STRING` | 生產環境 PostgreSQL 連線字串 |

3. 推送至 `main` branch 即自動觸發部署

### Azure Functions（後端）

推送至 `main` branch 時自動觸發，workflow 會：
1. 建置 NestJS + Azure Functions
2. 執行 Prisma 資料庫遷移
3. 設定 CORS 環境變數
4. 部署至 Azure

### 本機開發環境變數

複製 `.env.example` 為 `.env`，主要設定項目：

```bash
DATABASE_URL="postgresql://..."     # PostgreSQL 連線字串
ENCRYPTION_KEY="64位hex字串"         # openssl rand -hex 32
JWT_SECRET="隨機字串"                # openssl rand -hex 32
NEXT_PUBLIC_API_URL="http://localhost:7071"  # 後端 URL
CORS_ORIGIN="http://localhost:3000"  # 前端 origin（僅 scheme+host）
```

## 安全性

- ✅ OAuth 2.0 認證流程
- ✅ AES-256-GCM 加密儲存存取令牌
- ✅ JWT 工作階段管理
- ✅ CORS 保護（嚴格 origin 驗證）
- ✅ 輸入驗證（class-validator）

## 常見問題

### Q：為什麼不用 Buffer 或 Hootsuite？
A：第三方服務每月收費 $20-100，且不提供完整的智慧字數分割功能。自建系統可完全掌控，且僅需 Azure Functions 的低成本運行費用。

### Q：Twitter API 太貴怎麼辦？
A：免費層每月 500 則推文，對個人用戶通常足夠。

### Q：支援其他平台嗎？
A：目前支援 Facebook / Instagram / Twitter / Threads。未來可擴展 LinkedIn、Discord、Mastodon 等平台。

### Q：資料存放在哪裡？
A：所有資料（包含 OAuth 令牌）存放在你自己的 PostgreSQL 資料庫，完全私有。OAuth 令牌以 AES-256-GCM 加密後才寫入資料庫。

## 參考資源

- [Facebook Graph API 文件](https://developers.facebook.com/docs/graph-api/)
- [Instagram API 文件](https://developers.facebook.com/docs/instagram-api/)
- [Twitter API v2 文件](https://developer.twitter.com/en/docs/twitter-api)
- [Threads API 文件](https://developers.facebook.com/docs/threads)

## 授權

MIT License
