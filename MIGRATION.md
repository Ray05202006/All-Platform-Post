# Migration Summary — All-Platform-Post to Azure + GitHub Pages

**Date:** 2026-03-10  
**Author:** Dev.Manager (Archimedes)

---

## What Changed

### Frontend: `apps/web`

| Before | After |
|--------|-------|
| `output: 'standalone'` (Docker/Zeabur) | `output: 'export'` (static HTML/CSS/JS) |
| Server-side `redirect()` on root | Client-side `useRouter().replace()` |
| Image optimization enabled | `images: { unoptimized: true }` (static export requirement) |
| Zeabur deployment | **GitHub Pages** via Actions |

**URL:** `https://Ray05202006.github.io/All-Platform-Post/`

### Backend: New `apps/azure-functions`

- NestJS app is **unchanged** (`apps/api/`)
- New thin wrapper `apps/azure-functions/src/index.ts` exposes it as a single Azure Function HTTP trigger (`{*route}`) using the same Express adapter pattern
- Warm-start singleton prevents cold-start overhead on repeated calls
- Prisma schema unchanged — just change the connection string env var

### CI/CD: `.github/workflows/`

| Workflow | Trigger | Action |
|----------|---------|--------|
| `ci.yml` | All pushes/PRs | Lint + type check |
| `deploy-frontend.yml` | Push to `main` (web/packages) | Build static → GitHub Pages |
| `deploy-api.yml` | Push to `main` (api/functions) | Prisma migrate + deploy Azure Functions |

---

## Azure Resources to Provision

Run these commands with your Azure Student account (`az login` first):

```bash
# Variables — fill these in
RESOURCE_GROUP="all-platform-post-rg"
LOCATION="eastasia"           # or southeastasia — pick closest to Taiwan
FUNCTION_APP_NAME="all-platform-post-api"   # must be globally unique
STORAGE_ACCOUNT="allplatformpost"           # 3-24 chars, lowercase only
POSTGRES_SERVER="all-platform-post-db"
POSTGRES_ADMIN="appadmin"
POSTGRES_PASSWORD="<generate-strong-password>"
DB_NAME="allplatformpost"

# 1. Create Resource Group
az group create --name $RESOURCE_GROUP --location $LOCATION

# 2. Create Storage Account (required for Azure Functions)
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS

# 3. Create Azure Functions App (Consumption plan = free tier)
az functionapp create \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --storage-account $STORAGE_ACCOUNT \
  --consumption-plan-location $LOCATION \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --os-type Linux

# 4. Create PostgreSQL Flexible Server (Azure Student credits / B1ms free trial)
az postgres flexible-server create \
  --name $POSTGRES_SERVER \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --admin-user $POSTGRES_ADMIN \
  --admin-password $POSTGRES_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16

# 5. Create Database
az postgres flexible-server db create \
  --database-name $DB_NAME \
  --server-name $POSTGRES_SERVER \
  --resource-group $RESOURCE_GROUP

# 6. Allow Azure services to access PostgreSQL
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# 7. Get connection string and set app settings
POSTGRES_CONN="postgresql://${POSTGRES_ADMIN}:${POSTGRES_PASSWORD}@${POSTGRES_SERVER}.postgres.database.azure.com:5432/${DB_NAME}?sslmode=require"

az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    POSTGRES_CONNECTION_STRING="$POSTGRES_CONN" \
    ENCRYPTION_KEY="<64-char-hex-from-generate-env-keys.js>" \
    JWT_SECRET="<generate-strong-secret>" \
    NEXT_PUBLIC_APP_URL="https://Ray05202006.github.io/All-Platform-Post" \
    FACEBOOK_APP_ID="<from-facebook-developers>" \
    FACEBOOK_APP_SECRET="<from-facebook-developers>" \
    TWITTER_CLIENT_ID="<from-twitter-developer-portal>" \
    TWITTER_CLIENT_SECRET="<from-twitter-developer-portal>" \
    TWITTER_API_KEY="<from-twitter-developer-portal>" \
    TWITTER_API_SECRET="<from-twitter-developer-portal>" \
    NODE_ENV="production"

# 8. Get the Functions URL (set as GitHub Secret AZURE_FUNCTIONS_URL)
az functionapp show \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query defaultHostName -o tsv
# → something like: all-platform-post-api.azurewebsites.net
# Full URL: https://all-platform-post-api.azurewebsites.net
```

---

## GitHub Secrets to Add

Go to: **Settings → Secrets and variables → Actions**

| Secret Name | Value |
|------------|-------|
| `AZURE_CREDENTIALS` | Service principal JSON (see below) |
| `AZURE_FUNCTION_APP_NAME` | e.g. `all-platform-post-api` |
| `AZURE_FUNCTIONS_URL` | e.g. `https://all-platform-post-api.azurewebsites.net` |
| `POSTGRES_CONNECTION_STRING` | PostgreSQL connection string (for migrations in CI) |

### Create AZURE_CREDENTIALS service principal:

```bash
az ad sp create-for-rbac \
  --name "all-platform-post-deployer" \
  --role contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth
# Copy the entire JSON output as the AZURE_CREDENTIALS secret
```

---

## GitHub Pages Setup

1. Go to repo **Settings → Pages**
2. Set **Source** to `GitHub Actions`
3. The `deploy-frontend.yml` workflow handles the rest on next push to `main`

---

## OAuth Callback URLs to Update

After provisioning Azure Functions, update these in each platform's developer console:

| Platform | Callback URL |
|----------|-------------|
| Facebook | `https://<FUNCTION_APP_NAME>.azurewebsites.net/api/auth/facebook/callback` |
| Instagram | `https://<FUNCTION_APP_NAME>.azurewebsites.net/api/auth/facebook/callback` (same app) |
| Twitter/X | `https://<FUNCTION_APP_NAME>.azurewebsites.net/api/auth/twitter/callback` |
| Threads | `https://<FUNCTION_APP_NAME>.azurewebsites.net/api/auth/threads/callback` |

---

## Redis / BullMQ Note

The current BullMQ implementation uses Redis for the job queue. For the free/student tier:

**Option A (Recommended for now):** Remove BullMQ and use a cron-based approach inside Azure Functions Timer Trigger — simpler, no Redis needed.

**Option B:** Azure Cache for Redis (Basic C0 = ~$16/mo, uses student credits).

The current code has `REDIS_HOST` / `REDIS_PORT` env vars. If Azure Redis is used, just set those. If going with Timer Trigger approach, a follow-up refactor is needed in `scheduler.service.ts`.

---

## Estimated Monthly Cost

| Service | Tier | Cost |
|---------|------|------|
| Azure Functions | Consumption (free 1M calls/mo) | **$0** |
| Azure Storage | LRS (for Functions host) | ~$0.02 |
| PostgreSQL Flexible | B1ms Burstable | ~$13/mo (student credits) |
| Azure Cache for Redis | Basic C0 (optional) | ~$16/mo (student credits) |
| GitHub Pages | Free | **$0** |
| **Total** | | **~$0-30/mo** (student credits cover most) |
