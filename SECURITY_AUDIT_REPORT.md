# 安全掃描報告 (Security Audit Report)

**掃描日期**: 2026-01-09
**項目**: All-Platform-Post
**掃描類型**: 全面安全審計（依賴項漏洞、代碼安全、配置審查）

---

## 📊 執行摘要 (Executive Summary)

本次安全掃描發現了 **8 個依賴項漏洞**（1 critical, 4 high, 2 moderate, 1 low）以及 **4 個安全改進建議**。整體而言，項目在核心安全實踐方面表現良好，但需要解決依賴項漏洞並增強防禦層級。

**風險等級**: 🟡 **中等** (Medium)

---

## 🔴 嚴重問題 (Critical Issues)

### 1. xmldom 多重根節點漏洞 (CVE)

**嚴重程度**: Critical
**受影響套件**: `xmldom <= 0.6.0`
**路徑**: `apps/api > passport-twitter > xtraverse > xmldom`
**詳情**: https://github.com/advisories/GHSA-crh6-fp67-6883

**影響**:
- 允許惡意 XML 輸入導致解析錯誤
- 可能被利用進行 DoS 攻擊或繞過驗證

**修復建議**:
```bash
# 選項 1: 更新 passport-twitter（如果有新版本）
pnpm update passport-twitter

# 選項 2: 考慮替代方案（passport-twitter 已不再維護）
# 建議遷移至 Twitter OAuth 2.0 官方實現
```

---

## 🟠 高風險問題 (High Severity Issues)

### 2. path-to-regexp 回溯正則表達式 (ReDoS)

**嚴重程度**: High
**受影響套件**: `path-to-regexp >= 0.2.0 < 1.9.0`
**路徑**: `apps/api > @nestjs/serve-static > path-to-regexp`
**詳情**: https://github.com/advisories/GHSA-9wv6-86v2-598j

**影響**:
- 正則表達式回溯可能導致 CPU 資源耗盡 (ReDoS)

**修復建議**:
```bash
# 更新至修補版本
pnpm update @nestjs/serve-static
```

### 3. glob CLI 命令注入漏洞

**嚴重程度**: High
**受影響套件**: `glob >= 10.2.0 < 10.5.0`
**路徑**:
- `apps/web > eslint-config-next > @next/eslint-plugin-next > glob`
- `apps/api > @nestjs/cli > glob`
**詳情**: https://github.com/advisories/GHSA-5j98-mcp5-4vw2

**影響**:
- CLI 模式下可能執行任意命令（僅在使用 -c/--cmd 參數時）

**修復建議**:
```bash
# 更新至修補版本 >= 10.5.0
pnpm update glob
pnpm update @nestjs/cli
pnpm update eslint-config-next
```

### 4. qs 陣列限制繞過導致 DoS

**嚴重程度**: High
**受影響套件**: `qs < 6.14.1`
**路徑**: `apps/api > @nestjs/platform-express > body-parser > qs`
**詳情**: https://github.com/advisories/GHSA-6rw7-vpxm-498p

**影響**:
- 利用括號表示法繞過 arrayLimit 限制
- 可能導致內存耗盡 (DoS)

**修復建議**:
```bash
# 更新至修補版本 >= 6.14.1
pnpm update @nestjs/platform-express
```

---

## 🟡 中等風險問題 (Moderate Severity Issues)

### 5 & 6. xmldom 惡意 XML 誤解析漏洞

**嚴重程度**: Moderate (x2)
**受影響套件**: `xmldom < 0.5.0` 和 `xmldom <= 0.6.0`
**路徑**: `apps/api > passport-twitter > xtraverse > xmldom`
**詳情**:
- https://github.com/advisories/GHSA-h6q6-9hqw-rwfv
- https://github.com/advisories/GHSA-5fg8-2547-mr8q

**影響**:
- 惡意 XML 輸入可能被誤解析
- 無可用修補版本

**修復建議**:
- 同問題 #1，建議遷移至新的 Twitter OAuth 實現

---

## 🔵 安全改進建議 (Security Improvements)

### 7. 缺少安全 Headers (Helmet)

**當前狀態**: ❌ 未配置
**建議**: 添加 Helmet 中介軟體以設置安全 HTTP headers

**實施步驟**:
```bash
# 安裝 Helmet
cd apps/api
pnpm add helmet
```

```typescript
// apps/api/src/main.ts
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 添加安全 headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false, // 如果需要 CORS
  }));

  // ... 其他配置
}
```

**防護效果**:
- X-Content-Type-Options (防止 MIME 類型嗅探)
- X-Frame-Options (防止點擊劫持)
- Strict-Transport-Security (強制 HTTPS)
- Content-Security-Policy (防止 XSS)

---

### 8. 缺少請求速率限制 (Rate Limiting)

**當前狀態**: ❌ 未配置
**建議**: 添加 Rate Limiting 防止暴力破解和 DoS 攻擊

**實施步驟**:
```bash
# 安裝 Throttler
cd apps/api
pnpm add @nestjs/throttler
```

```typescript
// apps/api/src/app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 秒
      limit: 100, // 100 次請求
    }]),
    // ... 其他模組
  ],
})
export class AppModule {}
```

```typescript
// apps/api/src/main.ts
// Note: ThrottlerGuard should be registered in the module providers array
// using APP_GUARD, not as a global guard in main.ts. See app.module.ts.example
// for the correct implementation.

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ... 其他配置
}
```

**特別保護端點**:
```typescript
// 對認證端點加強限制
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 60秒5次
@Post('login')
async login(@Body() loginDto: LoginDto) {
  // ...
}
```

---

### 9. 文件上傳驗證增強

**當前狀態**: ⚠️ 僅依賴 MIME type 驗證
**建議**: 添加魔術數字 (Magic Bytes) 驗證防止偽造文件類型

**當前實施** (`apps/api/src/modules/media/media.controller.ts:116`):
```typescript
// 僅檢查文件名，缺少內容驗證
const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '');
```

**改進建議**:
```typescript
// apps/api/src/modules/media/media.service.ts
import { fileTypeFromFile } from 'file-type';

async processImage(file: Express.Multer.File): Promise<ProcessedMedia> {
  // 驗證文件魔術數字
  const detectedType = await fileTypeFromFile(file.path);

  if (!detectedType || !detectedType.mime.startsWith('image/')) {
    throw new BadRequestException('Invalid image file');
  }

  // 白名單驗證
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedMimes.includes(detectedType.mime)) {
    throw new BadRequestException('File type not allowed');
  }

  // ... 現有邏輯
}
```

**安裝依賴**:
```bash
cd apps/api
pnpm add file-type
```

---

### 10. CORS 配置加固

**當前狀態**: ⚠️ 單一來源配置，缺少預檢緩存
**當前配置** (`apps/api/src/main.ts:9-12`):
```typescript
app.enableCors({
  origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  credentials: true,
});
```

**改進建議**:
```typescript
app.enableCors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      'http://localhost:3000',
      // 生產環境域名
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400, // 預檢緩存 24 小時
});
```

---

## ✅ 良好的安全實踐 (Security Strengths)

### 加密實現
- ✅ **AES-256-GCM** 加密 OAuth tokens (`apps/api/src/common/services/encryption.service.ts`)
- ✅ 隨機 IV (16 bytes) 使用 `crypto.randomBytes()`
- ✅ 認證標籤 (Auth Tag) 防止篡改
- ✅ PKCE 實現 (code_verifier + code_challenge)
- ✅ CSRF 防護 (state 參數生成)
- ✅ 密鑰長度驗證 (64 字符 hex)

### 認證與授權
- ✅ **JWT** 認證策略 (`passport-jwt`)
- ✅ Token 過期時間設置 (7 天)
- ✅ `@Public()` 裝飾器實現公開路由
- ✅ JwtAuthGuard 全域保護

### 資料驗證
- ✅ **ValidationPipe** with `whitelist: true` (防止額外欄位注入)
- ✅ `forbidNonWhitelisted: true` (拒絕未知欄位)
- ✅ **Prisma ORM** (防止 SQL 注入)
- ✅ class-validator 驗證 DTOs

### 文件安全
- ✅ 路徑遍歷防護 (`apps/api/src/modules/media/media.controller.ts:115-128`)
- ✅ 文件名淨化 (移除特殊字符)
- ✅ 路徑解析驗證 (`resolve()` + `startsWith()`)
- ✅ 文件大小限制 (100MB 視頻)
- ✅ 圖片尺寸限制 (1440px 自動壓縮)

### 環境變數管理
- ✅ `.env` 已在 `.gitignore` 中排除
- ✅ `.env.example` 提供模板
- ✅ ConfigService 統一管理
- ✅ 啟動時驗證 ENCRYPTION_KEY 格式

### 其他
- ✅ CORS 啟用 (credentials: true)
- ✅ 無明顯的命令注入、XSS、eval() 使用
- ✅ 無硬編碼密鑰或 API keys
- ✅ 無 dangerouslySetInnerHTML 使用

---

## 🛠️ 修復優先級與時間估計

| 優先級 | 問題 | 修復時間 | 實施難度 |
|--------|------|---------|---------|
| 🔴 P0 | 依賴項漏洞更新 (#2, #3, #4) | 1 小時 | 低 |
| 🔴 P0 | 添加 Helmet (#7) | 30 分鐘 | 低 |
| 🟠 P1 | 添加 Rate Limiting (#8) | 1 小時 | 中 |
| 🟠 P1 | xmldom 漏洞 - 遷移 Twitter OAuth (#1) | 4-6 小時 | 高 |
| 🟡 P2 | 文件上傳魔術數字驗證 (#9) | 1 小時 | 低 |
| 🟡 P2 | CORS 配置加固 (#10) | 30 分鐘 | 低 |

**總估計修復時間**: 8-10 小時

---

## 📝 快速修復腳本

### 步驟 1: 更新依賴項
```bash
# 在項目根目錄執行
pnpm update @nestjs/serve-static
pnpm update @nestjs/platform-express
pnpm update @nestjs/cli
pnpm update eslint-config-next

# 驗證修復
pnpm audit --audit-level=high
```

### 步驟 2: 安裝安全套件
```bash
cd apps/api

# Helmet (安全 headers)
pnpm add helmet

# Rate Limiting
pnpm add @nestjs/throttler

# 文件類型驗證
pnpm add file-type
pnpm add -D @types/file-type
```

### 步驟 3: 代碼修改
請參考上述各問題的「實施步驟」進行代碼修改。

---

## 🔒 長期安全建議

1. **依賴項監控**
   - 設置 GitHub Dependabot 自動監控依賴項漏洞
   - 每月運行 `pnpm audit` 檢查新漏洞
   - 訂閱 NestJS 和 Next.js 安全公告

2. **安全測試**
   - 集成 OWASP ZAP 或 Burp Suite 進行定期滲透測試
   - 添加安全測試到 CI/CD 流程 (`pnpm audit` in GitHub Actions)

3. **日誌與監控**
   - 實施日誌記錄系統 (Winston/Pino)
   - 監控異常登入嘗試和 API 濫用
   - 設置告警機制 (Sentry, DataDog)

4. **代碼審查**
   - 所有 PR 進行安全審查
   - 使用 ESLint 安全規則 (eslint-plugin-security)
   - 定期進行代碼安全培訓

5. **備份與災難恢復**
   - 定期備份 PostgreSQL 資料庫
   - 測試備份恢復流程
   - 準備事件響應計劃

6. **OAuth Token 輪換**
   - 實施 refresh token 機制
   - 定期輪換加密密鑰 (密鑰版本控制)
   - 添加 token 撤銷功能

---

## 📋 合規性檢查表

- [x] OWASP Top 10 2021 檢查
  - [x] A01: Broken Access Control → JWT Guards ✅
  - [x] A02: Cryptographic Failures → AES-256-GCM ✅
  - [x] A03: Injection → Prisma ORM ✅
  - [ ] A04: Insecure Design → 需要 Rate Limiting ⚠️
  - [x] A05: Security Misconfiguration → 需要 Helmet ⚠️
  - [x] A06: Vulnerable Components → 8 個漏洞待修復 ❌
  - [x] A07: Authentication Failures → JWT 實現良好 ✅
  - [x] A08: Data Integrity Failures → Auth Tag 驗證 ✅
  - [x] A09: Security Logging → 需要增強 ⚠️
  - [x] A10: SSRF → 無明顯風險 ✅

- [ ] GDPR 合規性
  - [ ] 實施數據刪除功能
  - [ ] 添加數據導出功能
  - [ ] 隱私政策和同意管理

---

## 🎯 結論

All-Platform-Post 項目在核心安全實踐方面表現**良好**，特別是加密實現、認證機制和輸入驗證。然而，**依賴項漏洞**（特別是 critical xmldom 漏洞）需要立即處理。

建議**優先修復**:
1. 更新所有受影響依賴項 (1-2 小時)
2. 添加 Helmet 和 Rate Limiting (2 小時)
3. 規劃 Twitter OAuth 遷移 (中期目標)

**修復後風險等級**: 🟢 **低** (Low)

---

**報告生成者**: Claude Code Security Audit
**下次審計建議**: 2026-04-09 (每季度)
