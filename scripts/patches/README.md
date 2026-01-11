# 安全補丁應用指南 (Security Patches Guide)

本目錄包含安全審計報告中建議的代碼補丁。

## 📁 文件說明

- `main.ts.example` - 添加 Helmet 和改進 CORS 配置的 main.ts 示例
- `app.module.ts.example` - 添加 ThrottlerModule 的 app.module.ts 示例
- `auth.controller.example.ts` - 對認證端點加強速率限制的示例
- `media.service.example.ts` - 添加魔術數字驗證的 media.service.ts 示例

## 🚀 快速應用所有補丁

### 自動方式（推薦）

1. 運行安全修復腳本：
```bash
# 從項目根目錄執行
chmod +x scripts/security-fixes.sh
./scripts/security-fixes.sh
```

2. 手動應用代碼補丁（見下方）

### 手動方式

如果你想手動控制每個步驟，請按照以下順序操作：

#### 步驟 1: 更新依賴項

```bash
# 更新存在漏洞的套件
pnpm update @nestjs/serve-static --filter @all-platform-post/api
pnpm update @nestjs/platform-express --filter @all-platform-post/api
pnpm update @nestjs/cli --filter @all-platform-post/api
pnpm update eslint-config-next --filter @all-platform-post/web

# 驗證
pnpm audit --audit-level=high
```

#### 步驟 2: 安裝安全套件

```bash
cd apps/api

# 必要的安全套件
pnpm add helmet
pnpm add @nestjs/throttler
pnpm add file-type

cd ../..
```

#### 步驟 3: 應用代碼補丁

##### 3.1 修改 `apps/api/src/main.ts`

參考 `main.ts.example`，添加：
- Helmet 中介軟體
- 改進的 CORS 配置

**關鍵修改**:
```typescript
import helmet from 'helmet';

// 在 bootstrap() 函數中添加
app.use(helmet({ /* ... */ }));
```

##### 3.2 修改 `apps/api/src/app.module.ts`

參考 `app.module.ts.example`，添加：
- ThrottlerModule 導入
- ThrottlerGuard 全域註冊

**關鍵修改**:
```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// 在 imports 中添加
ThrottlerModule.forRoot([{ /* ... */ }]),

// 在 providers 中添加
{
  provide: APP_GUARD,
  useClass: ThrottlerGuard,
},
```

##### 3.3 修改 `apps/api/src/modules/auth/auth.controller.ts`

參考 `auth.controller.example.ts`，為敏感端點添加：
- `@Throttle()` 裝飾器

**關鍵修改**:
```typescript
import { Throttle } from '@nestjs/throttler';

@Throttle({ strict: { limit: 5, ttl: 60000 } })
@Get('facebook')
async facebookAuth() { /* ... */ }
```

##### 3.4 修改 `apps/api/src/modules/media/media.service.ts`

參考 `media.service.example.ts`，添加：
- 魔術數字 (Magic Bytes) 驗證
- 文件類型白名單
- MIME type 一致性檢查

**關鍵修改**:
```typescript
import { fileTypeFromFile } from 'file-type';

// 在 processImage 和 processVideo 中添加
const detectedType = await fileTypeFromFile(filePath);
// 驗證邏輯...
```

## ✅ 驗證修復

應用所有補丁後，執行以下檢查：

### 1. 編譯檢查
```bash
cd apps/api
pnpm build
```

### 2. 類型檢查
```bash
pnpm lint
```

### 3. 運行測試
```bash
pnpm test
```

### 4. 啟動應用
```bash
# 從項目根目錄
make dev

# 或
pnpm dev
```

### 5. 測試安全功能

#### 測試 Helmet Headers
```bash
curl -I http://localhost:3001/api
# 應該看到 X-Content-Type-Options, X-Frame-Options 等 headers
```

#### 測試 Rate Limiting
```bash
# 快速發送多個請求
for i in {1..101}; do
  curl http://localhost:3001/api
done
# 第 101 次應該被拒絕 (429 Too Many Requests)
```

#### 測試文件類型驗證
```bash
# 上傳非圖片文件（應該被拒絕）
curl -X POST http://localhost:3001/api/media/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.txt"
# 應該返回 400 Bad Request
```

## 📊 預期結果

應用所有補丁後：

- ✅ `pnpm audit --audit-level=high` 只剩下 xmldom 漏洞（需要遷移 Twitter OAuth）
- ✅ 應用啟動時顯示 "Security features enabled: Helmet, CORS, Rate Limiting"
- ✅ API 響應包含安全 headers
- ✅ 超過速率限制時返回 429 狀態碼
- ✅ 偽造的文件類型無法上傳

## ⚠️ 注意事項

1. **備份**: 修改前請先備份原始文件
2. **測試**: 在開發環境充分測試後再部署到生產環境
3. **配置**: 根據實際需求調整速率限制參數
4. **監控**: 部署後監控錯誤日誌，確保沒有誤判

## 🔄 回滾

如果需要回滾修改：

```bash
# 使用 git 恢復
git checkout apps/api/src/main.ts
git checkout apps/api/src/app.module.ts
git checkout apps/api/src/modules/auth/auth.controller.ts
git checkout apps/api/src/modules/media/media.service.ts

# 卸載套件
cd apps/api
pnpm remove helmet @nestjs/throttler file-type
```

## 📚 更多資訊

- 完整安全審計報告：`../../SECURITY_AUDIT_REPORT.md`
- Helmet 文檔：https://helmetjs.github.io/
- NestJS Throttler 文檔：https://docs.nestjs.com/security/rate-limiting
- file-type 文檔：https://github.com/sindresorhus/file-type

## 💬 支援

如有問題，請參考：
- 安全審計報告的「常見問題」章節
- 項目 GitHub Issues
