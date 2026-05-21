# 操作手冊 — All-Platform-Post

> 本手冊說明如何日常維護此專案，包含功能開發、測試、部署、緊急修復與回滾。

---

## 目錄

1. [環境說明](#1-環境說明)
2. [分支策略](#2-分支策略)
3. [日常開發流程（新功能 / 修 Bug）](#3-日常開發流程新功能--修-bug)
4. [緊急修復正式版（Hotfix）](#4-緊急修復正式版hotfix)
5. [確認部署成功](#5-確認部署成功)
6. [回滾正式版](#6-回滾正式版)
7. [Secrets 與環境變數管理](#7-secrets-與環境變數管理)
8. [Azure 資源清單](#8-azure-資源清單)
9. [常見問題](#9-常見問題)

---

## 1. 環境說明

| 環境 | 網址 | 對應分支 | 用途 |
|------|------|----------|------|
| **正式版 (Production)** | https://brave-meadow-09650f810.6.azurestaticapps.net | `main` | 真實用戶使用 |
| **測試版 (Staging)** | https://brave-meadow-09650f810-staging.centralus.1.azurestaticapps.net | `staging` | 上線前驗證 |
| **PR Preview** | 每個 PR 自動產生一個臨時網址 | feature branch PR | 單一功能預覽 |

**識別方式**：測試版頁面頂端會有黃色橫幅「⚠️ STAGING 測試環境」，正式版沒有。

---

## 2. 分支策略

```
main (正式版，受保護)
 └── staging (測試版，整合分支)
       └── feature/xxx (功能開發)
       └── fix/xxx     (問題修復)
```

**規則：**
- **禁止**直接 push 到 `main`，必須透過 `staging` 分支的 PR
- **建議**不要直接 push 到 `staging`，改用 feature branch + PR
- 所有改動都必須先在 staging 驗證，才能進正式版

---

## 3. 日常開發流程（新功能 / 修 Bug）

### Step 1：從 `staging` 建立 feature branch

```bash
git checkout staging
git pull origin staging
git checkout -b feature/我的功能名稱
```

### Step 2：開發、測試

```bash
cd v2
pnpm install
pnpm dev          # 本地開發伺服器 http://localhost:3000
pnpm lint         # 檢查程式碼風格
pnpm test         # 執行單元測試
```

### Step 3：推上 GitHub，開 PR 指向 `staging`

```bash
git push origin feature/我的功能名稱
```

到 GitHub 開 PR，**Base branch 選 `staging`**（不是 `main`）。

PR 建立後，GitHub Actions 會自動：
- 執行 Lint + 單元測試（CI）
- 部署到一個臨時的 PR Preview 網址（Azure SWA 自動產生，會留言在 PR 下方）

### Step 4：在 PR Preview 確認功能正常

點開 PR 下方 Azure 留言的網址，確認功能如預期運作。

### Step 5：合併到 `staging`

PR 審核通過後合併，GitHub Actions 自動部署到測試版網址：
https://brave-meadow-09650f810-staging.centralus.1.azurestaticapps.net

### Step 6：在測試版完整測試

- 登入 / 登出流程
- 連接平台帳號
- 發文（包含排程）
- 媒體上傳

### Step 7：準備好後，開 PR 從 `staging` 到 `main`

```bash
# 在 GitHub 上開 PR：
# Base: main  ←  Compare: staging
```

此 PR 代表「這批功能已測試完畢，準備上正式版」。

### Step 8：合併到 `main` → 自動部署正式版

PR 合併後，GitHub Actions 自動部署到正式版。等 3-5 分鐘後到正式版網址確認。

---

## 4. 緊急修復正式版（Hotfix）

當正式版出現嚴重問題需要立即修復，不能等完整的 staging 流程時：

### Step 1：從 `main` 建立 hotfix branch

```bash
git checkout main
git pull origin main
git checkout -b hotfix/問題描述
```

### Step 2：修復問題，確認沒有 regression

```bash
pnpm test
```

### Step 3：開 PR 直接指向 `main`

在 GitHub 開 PR，**Base branch 選 `main`**。

說明這是緊急 hotfix，請人快速審核。

### Step 4：合併後，同步回 `staging`

hotfix 合併到 `main` 後，**務必**也合併回 `staging`，避免下次 staging → main 時把修復覆蓋掉：

```bash
git checkout staging
git pull origin staging
git merge main
git push origin staging
```

---

## 5. 確認部署成功

### 看 GitHub Actions 狀態

到 https://github.com/Ray05202006/All-Platform-Post/actions 確認最新的 workflow run：

| Workflow | 觸發時機 | 成功標準 |
|----------|----------|----------|
| **CI** | 所有 push / PR | Lint & Test 全部通過 |
| **Deploy to Staging** | push 到 `staging` | 綠色 ✅ |
| **Deploy to Production** | push 到 `main` | 綠色 ✅ |
| **Deploy Timer (Staging)** | push 到 `staging`（且有改 `timer-function/`） | 綠色 ✅ |
| **Deploy Timer (Production)** | push 到 `main`（且有改 `timer-function/`） | 綠色 ✅ |

### 視覺確認

- **測試版**：https://brave-meadow-09650f810-staging.centralus.1.azurestaticapps.net — 應有黃色橫幅
- **正式版**：https://brave-meadow-09650f810.6.azurestaticapps.net — 無橫幅

---

## 6. 回滾正式版

### 方法一：從 GitHub Actions 重新部署舊版本（推薦）

1. 到 https://github.com/Ray05202006/All-Platform-Post/actions
2. 找到 **Azure Static Web Apps CI/CD** workflow
3. 點進上一個成功的 run（問題發生前那次）
4. 點右上角 **Re-run jobs** → **Re-run all jobs**

### 方法二：git revert

```bash
git checkout main
git pull origin main
git log --oneline        # 找到要回滾的 commit hash
git revert <commit-hash> # 產生一個新的「撤銷」commit
git push origin main
```

> ⚠️ 不要用 `git reset --hard` + force push，會破壞 commit 歷史。

### 資料庫注意事項

如果這次更新有執行 **Prisma migration（資料庫結構異動）**，回滾前端並不會自動回滾資料庫。需要另外手動執行 down migration 或請 DBA 處理。

---

## 7. Secrets 與環境變數管理

所有 secrets 存在 GitHub → Settings → Secrets and variables → Actions。

### 目前 Secrets 清單

| Secret 名稱 | 用途 | 影響環境 |
|-------------|------|----------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_MEADOW_09650F810` | Azure SWA 部署金鑰 | 兩者 |
| `AZURE_CREDENTIALS` | Azure CLI 登入憑證（JSON） | 兩者 |
| `AZURE_RESOURCE_GROUP` | Azure 資源群組名稱 | 兩者 |
| `NEXT_PUBLIC_APP_URL` | 正式版前端網址 | Production |
| `NEXT_PUBLIC_APP_URL_STAGING` | 測試版前端網址 | Staging |
| `AZURE_TIMER_FUNCTION_NAME` | 正式版 Timer Function App 名稱 | Production |
| `AZURE_TIMER_FUNCTION_NAME_STAGING` | 測試版 Timer Function App 名稱 | Staging |
| `SCHEDULER_APP_URL` | 正式版排程器呼叫網址（base URL）| Production |
| `SCHEDULER_API_KEY` | 排程器 API 金鑰 | 兩者（Staging 沒設時共用） |
| `ENCRYPTION_KEY` | OAuth token 加密金鑰（64 hex chars） | 兩者 |

> `NEXT_PUBLIC_APP_URL_STAGING` 同時被 staging Timer Function 用來呼叫 `/api/scheduler/process`，所以只需一個 secret。

### 新增 / 修改 Secret

1. 到 https://github.com/Ray05202006/All-Platform-Post/settings/secrets/actions
2. 點 **New repository secret** 或點現有 secret 旁的編輯按鈕
3. 修改後，下次部署時自動生效（不需要重新 push code）

### Azure SWA 的 runtime 環境變數

以下變數不在 GitHub Secrets，而是直接設在 Azure Portal（Static Web Apps → 設定 → 環境變數）：

- `NEXTAUTH_URL` — 必須對應各環境的網址
- `NEXTAUTH_SECRET`
- `DATABASE_URL`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET`
- `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` 等

Staging 和 Production 在 Azure Portal 各自有獨立的環境變數設定，互不影響。

---

## 8. Azure 資源清單

| 資源 | 名稱 | 用途 |
|------|------|------|
| Static Web Apps | `brave-meadow-09650f810` | 前端 + API（含 staging 環境） |
| Function App | `（你的正式版 function app 名稱）` | 正式版排程 Timer |
| Function App | `（你的 staging function app 名稱）` | 測試版排程 Timer |
| Azure Database for PostgreSQL | `（你的 DB 名稱）` | 資料庫 |
| Storage Account | `（你的 storage 名稱）` | 媒體檔案 |

> 建議把實際名稱填入上表，方便日後查閱。

---

## 9. 常見問題

### Q：推到 `staging` 但 Deploy to Staging 顯示 skipped？

確認 push 的 branch 名稱是否確實為 `staging`（不是 `main` 或其他名稱）。

### Q：PR Preview 網址在哪裡？

PR 建立後，Azure Static Web Apps bot 會在 PR 留言欄自動留下網址，格式為：
`https://brave-meadow-09650f810-<PR編號>.centralus.1.azurestaticapps.net`

### Q：Timer Function 沒有觸發排程發文？

1. 到 Azure Portal → Function App → 函數 → `scheduled-posts-processor` → 監視
2. 確認最近 1 分鐘內有執行記錄
3. 確認 `SCHEDULER_APP_URL` 和 `SCHEDULER_API_KEY` 設定正確

### Q：staging 和 main 的資料庫是共用的嗎？

預設是**共用同一個資料庫**。如果需要完全隔離，需要在 Azure 另外建一個 PostgreSQL，並在 staging 的 Azure SWA 環境變數中設定不同的 `DATABASE_URL`。

### Q：如何在本地端連到 staging / production 資料庫除錯？

```bash
# 複製 .env.example 並填入 staging 或 production 的 DATABASE_URL
cp v2/.env.example v2/.env
# 編輯 .env 填入資料庫連線字串
cd v2 && pnpm dev
```
