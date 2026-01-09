#!/bin/bash
# Security Fixes Script - All-Platform-Post
# 此腳本自動應用安全審計報告中的修復措施

set -e

echo "🔒 開始安全修復流程..."

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 步驟 1: 更新依賴項
echo -e "\n${YELLOW}步驟 1/3: 更新存在漏洞的依賴項${NC}"
echo "正在更新 @nestjs/serve-static, @nestjs/platform-express, @nestjs/cli, eslint-config-next..."

pnpm update @nestjs/serve-static --filter @all-platform-post/api
pnpm update @nestjs/platform-express --filter @all-platform-post/api
pnpm update @nestjs/cli --filter @all-platform-post/api
pnpm update eslint-config-next --filter @all-platform-post/web

echo -e "${GREEN}✓ 依賴項更新完成${NC}"

# 步驟 2: 安裝安全套件
echo -e "\n${YELLOW}步驟 2/3: 安裝安全相關套件${NC}"

cd apps/api

# Helmet
echo "安裝 helmet (安全 headers)..."
pnpm add helmet

# Rate Limiting
echo "安裝 @nestjs/throttler (請求速率限制)..."
pnpm add @nestjs/throttler

# File Type Validation
echo "安裝 file-type (文件類型驗證)..."
pnpm add file-type
pnpm add -D @types/file-type

cd ../..

echo -e "${GREEN}✓ 安全套件安裝完成${NC}"

# 步驟 3: 運行安全審計
echo -e "\n${YELLOW}步驟 3/3: 驗證修復效果${NC}"

echo "運行 pnpm audit..."
pnpm audit --audit-level=moderate || echo -e "${YELLOW}⚠ 仍有部分漏洞需要手動處理${NC}"

echo -e "\n${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ 自動修復流程完成！${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

echo -e "\n${YELLOW}下一步操作：${NC}"
echo "1. 應用代碼補丁："
echo "   - 修改 apps/api/src/main.ts 添加 Helmet"
echo "   - 修改 apps/api/src/app.module.ts 添加 ThrottlerModule"
echo "   - 修改 apps/api/src/modules/media/media.service.ts 添加文件類型驗證"
echo ""
echo "2. 查看詳細修復指南："
echo "   cat SECURITY_AUDIT_REPORT.md"
echo ""
echo "3. 測試應用程式："
echo "   make dev"
echo ""
echo -e "${YELLOW}⚠ 注意：xmldom 漏洞需要遷移至新的 Twitter OAuth 實現（見報告）${NC}"
