.PHONY: help install dev build start stop clean db-migrate db-studio

help: ## 顯示幫助資訊
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## 安裝依賴
	pnpm install

dev: ## 啟動開發伺服器
	docker-compose up -d
	@echo "等待資料庫啟動..."
	@sleep 3
	pnpm dev

build: ## 構建生產版本
	pnpm build

start: ## 啟動生產伺服器
	docker-compose up -d
	pnpm start

stop: ## 停止所有服務
	docker-compose down
	pkill -f "next dev" || true
	pkill -f "nest start" || true

clean: ## 清理構建檔案和依賴
	pnpm clean
	docker-compose down -v
	rm -rf node_modules apps/*/node_modules packages/*/node_modules

db-migrate: ## 執行資料庫遷移
	pnpm --filter @all-platform-post/api prisma:migrate

db-studio: ## 開啟 Prisma Studio
	pnpm --filter @all-platform-post/api prisma:studio

db-reset: ## 重置資料庫
	docker-compose down -v
	docker-compose up -d postgres
	@sleep 3
	pnpm --filter @all-platform-post/api prisma:migrate
