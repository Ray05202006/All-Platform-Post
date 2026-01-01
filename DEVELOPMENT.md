# 开发指南

## 项目已完成的部分

### ✅ 基础架构（第 1-2 周）

- [x] Monorepo 结构（pnpm workspace）
- [x] Next.js 14 前端（App Router + TypeScript + Tailwind CSS）
- [x] NestJS 10 后端（TypeScript）
- [x] PostgreSQL 数据库（Prisma ORM）
- [x] Redis 配置（Docker Compose）
- [x] 基础 UI 框架

### ✅ 核心功能模块

- [x] Prisma Schema 设计（User、PlatformConnection、Post、PublishLog）
- [x] 智能字数分割器（`@all-platform-post/text-splitter`）
  - 支持 Twitter 特殊字符计算（中文 2 字符、URL 23 字符）
  - 智能句子边界检测
  - 保留 URL、Hashtag、Mention 完整性
  - 自动添加编号（1/5、2/5...）
- [x] 共享类型定义（`@all-platform-post/shared`）
- [x] Docker Compose 开发环境

## 快速启动

### 前置要求

```bash
# 检查版本
node --version    # 需要 >= 18.0.0
pnpm --version    # 需要 >= 8.0.0
docker --version  # 可选，用于本地数据库
```

### 安装依赖

```bash
# 1. 安装所有依赖
pnpm install

# 2. 启动数据库（PostgreSQL + Redis）
docker-compose up -d

# 3. 生成 Prisma Client
cd apps/api
pnpm prisma:generate

# 4. 运行数据库迁移
pnpm prisma:migrate

# 5. 配置环境变量
cp .env.example .env

# 生成安全密钥
node scripts/generate-env-keys.js

# 编辑 .env 填入生成的密钥和其他配置
# 确保设置 ENCRYPTION_KEY 和 JWT_SECRET
```

### 启动开发服务器

```bash
# 方式 1：使用 Makefile（推荐）
make dev

# 方式 2：手动启动
docker-compose up -d        # 启动数据库
pnpm dev                     # 启动前后端

# 前端：http://localhost:3000
# 后端：http://localhost:3001/api
```

### 常用命令

```bash
# 安装依赖
make install

# 启动开发服务器
make dev

# 停止所有服务
make stop

# 运行数据库迁移
make db-migrate

# 打开 Prisma Studio（数据库 GUI）
make db-studio

# 重置数据库
make db-reset

# 清理所有构建文件和依赖
make clean
```

## 项目结构

```
.
├── apps/
│   ├── web/                    # Next.js 前端
│   │   ├── src/
│   │   │   ├── app/           # App Router 页面
│   │   │   │   ├── dashboard/ # 主控面板
│   │   │   │   ├── globals.css
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── components/    # React 组件
│   │   │   ├── lib/          # 工具函数
│   │   │   └── hooks/        # 自定义 Hooks
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   └── api/                    # NestJS 后端
│       ├── src/
│       │   ├── modules/       # 功能模块
│       │   │   └── prisma/   # Prisma 模块
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── prisma/
│       │   └── schema.prisma  # 数据库模型
│       └── package.json
│
├── packages/
│   ├── shared/                 # 共享类型定义
│   │   └── src/
│   │       ├── types.ts       # Platform、Post 等类型
│   │       └── index.ts
│   │
│   └── text-splitter/         # 智能字数分割库
│       └── src/
│           ├── TextSplitter.ts
│           └── index.ts
│
├── PLAN.md                     # 详细技术实现计划
├── DEVELOPMENT.md             # 本文档
├── docker-compose.yml         # 本地开发环境
├── Makefile                   # 快捷命令
└── pnpm-workspace.yaml        # Monorepo 配置
```

## 下一步开发计划

### 第 3-4 周：OAuth 认证

**任务清单**：
- [ ] 创建 AuthModule（apps/api/src/modules/auth）
- [ ] 实现 Facebook OAuth Strategy
  - 申请 Facebook App
  - 配置 Passport.js
  - 实现 Token 加密存储
- [ ] 实现 Instagram OAuth（共用 Facebook App）
- [ ] 实现 Twitter OAuth
  - 申请 Twitter Developer Account
  - 配置 OAuth 2.0 + PKCE
- [ ] 实现 Threads OAuth（共用 Facebook App）
- [ ] 创建前端连接页面（apps/web/src/app/dashboard/settings）
- [ ] 实现 Token 刷新机制

**关键文件**：
```typescript
// apps/api/src/modules/auth/strategies/facebook.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get('FACEBOOK_APP_ID'),
      clientSecret: configService.get('FACEBOOK_APP_SECRET'),
      callbackURL: 'http://localhost:3001/api/auth/facebook/callback',
      scope: ['pages_show_list', 'pages_manage_posts'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    // 存储到数据库
    return { provider: 'facebook', accessToken, profile };
  }
}
```

### 第 5-6 周：平台 API 集成

**任务清单**：
- [ ] 创建 PlatformModule
- [ ] 实现 FacebookService
  - 发布贴文 API（POST /{page-id}/feed）
  - 发布图片（POST /{page-id}/photos）
  - 发布留言（POST /{post-id}/comments）
- [ ] 实现 InstagramService
  - 创建 Media Container
  - 发布 Container
- [ ] 实现 TwitterService
  - 发布推文（POST /2/tweets）
  - 上传媒体
  - 实现串文（reply）
- [ ] 实现 ThreadsService
  - 发布 Threads
  - 发布回复
- [ ] 统一接口抽象（PlatformService）

**API 端点示例**：
```typescript
// apps/api/src/modules/platform/platform.controller.ts
@Controller('platform')
export class PlatformController {
  @Post('publish')
  async publish(@Body() dto: PublishDto) {
    // 调用各平台 API
    return this.platformService.publishToMultiplePlatforms(dto);
  }
}
```

### 第 7 周：定时发布

**任务清单**：
- [ ] 配置 BullMQ
- [ ] 创建 SchedulerModule
- [ ] 实现排程创建（schedule-post 队列）
- [ ] 实现 Worker 处理逻辑
- [ ] 实现排程取消
- [ ] 前端排程界面

**BullMQ 配置**：
```typescript
// apps/api/src/modules/scheduler/scheduler.service.ts
@Injectable()
export class SchedulerService {
  private queue: Queue;

  constructor(private platformService: PlatformService) {
    this.queue = new Queue('scheduled-posts', {
      connection: { host: 'localhost', port: 6379 },
    });
  }

  async schedulePost(postId: string, scheduledAt: Date) {
    await this.queue.add('publish', { postId }, {
      delay: scheduledAt.getTime() - Date.now(),
      attempts: 3,
    });
  }
}
```

### 第 8 周：媒体处理

**任务清单**：
- [ ] 创建 MediaModule
- [ ] 实现文件上传端点
- [ ] 集成 Sharp（图片压缩）
- [ ] 实现各平台媒体上传
- [ ] 前端媒体上传组件

### 第 9-10 周：前端完善

**任务清单**：
- [ ] 发文编辑器组件
- [ ] 实时预览（字数分割）
- [ ] 平台选择器
- [ ] 排程管理界面
- [ ] 发文历史
- [ ] 统计仪表板

## 测试智能字数分割

```typescript
import { textSplitter } from '@all-platform-post/text-splitter';

// 测试 Twitter 分割
const text = `今天学习了 React Server Components 的工作原理，真的太强大了！
传统的 SSR 需要在服务器渲染整个页面，然后发送到客户端。
而 RSC 可以让某些组件完全在服务器运行，减少 JavaScript 包大小，提升性能。
这对于构建现代 Web 应用来说是一个巨大的进步。`;

const result = textSplitter.split(text, 'twitter');
console.log(result);
// {
//   platform: 'twitter',
//   needsSplitting: true,
//   chunks: [
//     '今天学习了 React Server Components... (1/3)',
//     '传统的 SSR 需要... (2/3)',
//     '而 RSC 可以... (3/3)'
//   ]
// }
```

## 环境变量配置

### 生成安全密钥

运行以下命令生成 `ENCRYPTION_KEY` 和 `JWT_SECRET`：

```bash
# 使用 Node.js 脚本（推荐，跨平台）
node scripts/generate-env-keys.js

# 或使用 Bash 脚本（仅限 Linux/macOS）
bash scripts/generate-env-keys.sh

# 或手动使用 openssl
openssl rand -hex 32  # 生成 ENCRYPTION_KEY
openssl rand -hex 32  # 生成 JWT_SECRET
```

### 编辑 .env 文件

将生成的密钥填入 `.env` 文件：

```bash
# 数据库
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/allplatformpost"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379

# 加密密钥（必须是 64 字符的十六进制字符串）
ENCRYPTION_KEY="<从上面生成的密钥>"

# JWT Secret（必须是 64 字符的十六进制字符串）
JWT_SECRET="<从上面生成的密钥>"

# 应用 URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
API_URL="http://localhost:3001"

# === 平台 API 密钥（第 3-4 周配置）===

# Facebook App（同时用于 Instagram 和 Threads）
FACEBOOK_APP_ID="your-app-id"
FACEBOOK_APP_SECRET="your-app-secret"

# Twitter/X App
TWITTER_CLIENT_ID="your-client-id"
TWITTER_CLIENT_SECRET="your-client-secret"
```

**重要提示**：
- `ENCRYPTION_KEY` 必须是 64 个字符的十六进制字符串（32 字节）
- `JWT_SECRET` 也建议使用相同长度的安全密钥
- 这些密钥用于加密存储 OAuth tokens 和会话管理
- 在生产环境中，绝不要使用示例密钥或提交真实密钥到版本控制

## 数据库管理

### Prisma Studio（可视化数据库管理）

```bash
make db-studio
# 或
cd apps/api
pnpm prisma:studio
```

访问 http://localhost:5555 查看数据库。

### 创建新迁移

```bash
cd apps/api
pnpm prisma migrate dev --name add_new_field
```

### 重置数据库

```bash
make db-reset
```

## 调试

### 后端调试

```bash
# 查看后端日志
cd apps/api
pnpm dev
```

### 前端调试

```bash
# 查看前端日志
cd apps/web
pnpm dev
```

### 数据库调试

```bash
# 查看 PostgreSQL 日志
docker logs allplatformpost-postgres

# 连接到 PostgreSQL
docker exec -it allplatformpost-postgres psql -U postgres -d allplatformpost

# 查看所有表
\dt
```

## 常见问题

### Q: 启动时报错 "ENCRYPTION_KEY must be a 64-character hex string"

**A**: 这表示环境变量未设置或格式不正确。

**解决方法**：
1. 确保已复制 `.env.example` 到 `.env`
2. 运行密钥生成脚本：
   ```bash
   node scripts/generate-env-keys.js
   ```
3. 复制生成的 `ENCRYPTION_KEY` 到 `.env` 文件
4. 确保密钥是 64 个字符的十六进制字符串（不包含空格或引号）
5. 重启应用

**部署环境**：
- 在 Zeabur/Vercel/Railway 等平台，需要在环境变量设置中添加 `ENCRYPTION_KEY`
- 确保每个环境（开发、测试、生产）都有独立的密钥

### Q: pnpm install 失败

**A**: 确保 Node.js >= 18 和 pnpm >= 8：
```bash
node --version
pnpm --version
```

### Q: Prisma Client 找不到

**A**: 运行 Prisma 生成命令：
```bash
cd apps/api
pnpm prisma:generate
```

### Q: 数据库连接失败

**A**: 检查 Docker 容器是否运行：
```bash
docker ps
# 应该看到 allplatformpost-postgres 和 allplatformpost-redis
```

### Q: 端口被占用

**A**: 修改 `.env` 中的端口，或停止占用端口的程序：
```bash
# 查看 3000 端口占用
lsof -i :3000
# 杀死进程
kill -9 <PID>
```

## 贡献指南

### 分支策略

- `main`：稳定版本
- `develop`：开发分支
- `feature/*`：新功能分支

### 提交规范

```
feat: 新功能
fix: 修复 Bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建配置
```

示例：
```bash
git commit -m "feat: add Facebook OAuth authentication"
```

## 资源链接

- [Next.js 文档](https://nextjs.org/docs)
- [NestJS 文档](https://docs.nestjs.com/)
- [Prisma 文档](https://www.prisma.io/docs)
- [BullMQ 文档](https://docs.bullmq.io/)
- [Facebook Graph API](https://developers.facebook.com/docs/graph-api/)
- [Twitter API v2](https://developer.twitter.com/en/docs/twitter-api)
- [Threads API](https://developers.facebook.com/docs/threads)
