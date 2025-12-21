.PHONY: help install dev build start stop clean db-migrate db-studio

help: ## 显示帮助信息
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## 安装依赖
	pnpm install

dev: ## 启动开发服务器
	docker-compose up -d
	@echo "等待数据库启动..."
	@sleep 3
	pnpm dev

build: ## 构建生产版本
	pnpm build

start: ## 启动生产服务器
	docker-compose up -d
	pnpm start

stop: ## 停止所有服务
	docker-compose down
	pkill -f "next dev" || true
	pkill -f "nest start" || true

clean: ## 清理构建文件和依赖
	pnpm clean
	docker-compose down -v
	rm -rf node_modules apps/*/node_modules packages/*/node_modules

db-migrate: ## 运行数据库迁移
	pnpm --filter @all-platform-post/api prisma:migrate

db-studio: ## 打开 Prisma Studio
	pnpm --filter @all-platform-post/api prisma:studio

db-reset: ## 重置数据库
	docker-compose down -v
	docker-compose up -d postgres
	@sleep 3
	pnpm --filter @all-platform-post/api prisma:migrate
