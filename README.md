# All-Platform-Post

个人自建的多平台社交媒体发文系统，支持 Facebook、Instagram、Twitter/X、Threads 四大平台的统一发文管理。

## 核心功能

- ✅ **多平台发布**：一次编写，同时发布到 Facebook、Instagram、Twitter、Threads
- ✅ **智能字数分割**：自动检测各平台字数限制，智能断句分段
- ✅ **定时发布**：支持预约发文，自动在指定时间发布
- ✅ **媒体上传**：支持图片和视频上传，自动适配各平台格式要求
- ✅ **OAuth 认证**：安全的平台账号连接，加密存储访问令牌
- ✅ **实时预览**：编辑时实时查看各平台的分割效果

## 技术栈

### 前端
- **Next.js 14** (App Router)
- **React 18** + TypeScript
- **Tailwind CSS** + shadcn/ui
- **TanStack Query** (数据管理)

### 后端
- **NestJS 10** + TypeScript
- **Prisma** (ORM)
- **PostgreSQL** (数据库)
- **Redis** + **BullMQ** (任务队列)
- **Passport.js** (OAuth 认证)

## 项目结构

```
.
├── apps/
│   ├── web/                 # Next.js 前端
│   └── api/                 # NestJS 后端
├── packages/
│   ├── shared/              # 共享类型和工具
│   └── text-splitter/       # 智能字数分割库
├── PLAN.md                  # 详细技术实现计划
└── README.md
```

## 快速开始

### 前置要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL >= 15
- Redis >= 7

### 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/All-Platform-Post.git
cd All-Platform-Post

# 安装依赖
pnpm install

# 复制环境变量文件
cp .env.example .env

# 生成安全密钥（ENCRYPTION_KEY 和 JWT_SECRET）
node scripts/generate-env-keys.js
# 或使用 Bash 版本: bash scripts/generate-env-keys.sh

# 编辑 .env 填入生成的密钥和其他配置
nano .env

# 初始化数据库
pnpm --filter api prisma migrate dev

# 启动开发服务器
pnpm dev
```

访问 http://localhost:3000 查看前端界面。

## 平台 API 申请指南

### Facebook & Instagram & Threads

1. 前往 [Facebook Developers](https://developers.facebook.com/)
2. 创建新应用，选择「消费者」类型
3. 添加「Facebook Login」产品
4. 在「设置」中获取 App ID 和 App Secret
5. 添加重定向 URI: `http://localhost:3000/api/auth/facebook/callback`
6. 申请以下权限：
   - `pages_show_list`
   - `pages_manage_posts`
   - `pages_manage_engagement`
   - `instagram_basic`
   - `instagram_content_publish`

### Twitter/X

1. 前往 [Twitter Developer Portal](https://developer.twitter.com/)
2. 创建新项目和应用
3. 选择 API 层级（免费层或 Basic $200/月）
4. 在「User authentication settings」中配置：
   - Type: Web App
   - Callback URI: `http://localhost:3000/api/auth/twitter/callback`
5. 获取 Client ID 和 Client Secret

**注意**：免费层每月仅 500 条推文，建议个人使用。

## 字数限制说明

| 平台 | 单条贴文字数 | 留言字数 | 特殊规则 |
|------|-------------|---------|---------|
| Facebook | 63,206 字 | 8,000 字 | 无 |
| Instagram | 2,200 字 | 2,200 字 | 最多 30 个 hashtag |
| Twitter | 280 字 | 280 字 | 中文算 2 字元，URL 算 23 字 |
| Threads | 500 字 | 500 字 | 建议只用 1 个 hashtag |

## 智能分割示例

**输入内容**（350 字）：
```
今天学习了 React Server Components 的工作原理，真的太强大了！
传统的 SSR 需要在服务器渲染整个页面，然后发送到客户端。
而 RSC 可以让某些组件完全在服务器运行，减少 JavaScript 包大小...
```

**Twitter 分割结果**（280 字限制）：
```
[1/2] 今天学习了 React Server Components 的工作原理，真的太强大了！
传统的 SSR 需要在服务器渲染整个页面，然后发送到客户端。

[2/2] 而 RSC 可以让某些组件完全在服务器运行，减少 JavaScript 包大小...
```

**Threads/Facebook**：
```
[不分割] 今天学习了 React Server Components 的工作原理...
```

## 开发进度

查看 [PLAN.md](./PLAN.md) 了解详细的技术实现计划。

- [x] 项目架构设计
- [x] 各平台 API 研究
- [x] 智能字数分割算法设计
- [ ] Monorepo 基础架构
- [ ] Next.js 前端
- [ ] NestJS 后端
- [ ] OAuth 认证
- [ ] 平台 API 集成
- [ ] 定时发布
- [ ] 媒体处理
- [ ] UI 界面

## 安全性

- ✅ OAuth 2.0 + PKCE 认证流程
- ✅ AES-256-GCM 加密存储访问令牌
- ✅ JWT 会话管理
- ✅ CSRF 防护
- ✅ 速率限制

## 成本估算

**开发成本**：12 周（个人兼职约 3 个月）

**运行成本**（每月）：
- VPS 托管: $5-20
- Twitter API: $0-200（免费层 vs Basic 层）
- 其他平台 API: $0（完全免费）
- **总计**: $5-220/月

## 部署指南

### Zeabur 部署

1. **准备环境变量**

   首先生成安全密钥：
   ```bash
   node scripts/generate-env-keys.js
   ```

2. **在 Zeabur 配置环境变量**

   在你的 Zeabur 服务设置中添加以下环境变量：
   
   **必需的环境变量**：
   ```
   ENCRYPTION_KEY=<生成的64位hex密钥>
   JWT_SECRET=<生成的64位hex密钥>
   DATABASE_URL=<Zeabur提供的PostgreSQL连接字符串>
   REDIS_HOST=<Zeabur提供的Redis主机>
   REDIS_PORT=<Zeabur提供的Redis端口>
   ```

   **平台 API 密钥**（按需配置）：
   ```
   FACEBOOK_APP_ID=<你的Facebook App ID>
   FACEBOOK_APP_SECRET=<你的Facebook App Secret>
   TWITTER_CLIENT_ID=<你的Twitter Client ID>
   TWITTER_CLIENT_SECRET=<你的Twitter Client Secret>
   TWITTER_API_KEY=<你的Twitter API Key>
   TWITTER_API_SECRET=<你的Twitter API Secret>
   ```

   **应用 URL**：
   ```
   NEXT_PUBLIC_APP_URL=<你的前端URL>
   API_URL=<你的后端URL>
   ```

3. **部署应用**

   推送代码到 GitHub，Zeabur 将自动构建和部署。

### 其他平台部署

对于其他托管平台（如 Vercel、Railway、Render 等），请确保：

1. 设置所有必需的环境变量（特别是 `ENCRYPTION_KEY` 和 `JWT_SECRET`）
2. 配置 PostgreSQL 数据库连接
3. 配置 Redis 连接（用于任务队列）
4. 运行数据库迁移：`pnpm --filter api prisma migrate deploy`

### 环境变量故障排除

如果遇到 `ENCRYPTION_KEY must be a 64-character hex string` 错误：

1. 确保已在部署平台设置 `ENCRYPTION_KEY` 环境变量
2. 密钥必须是 64 个字符的十六进制字符串（32 字节）
3. 使用 `node scripts/generate-env-keys.js` 生成有效的密钥
4. 不要在密钥前后添加引号或空格

## 贡献

欢迎提交 Issue 和 Pull Request！

## 授权

MIT License

---

## 参考资源

- [Facebook Graph API 文档](https://developers.facebook.com/docs/graph-api/)
- [Instagram API 文档](https://developers.facebook.com/docs/instagram-api/)
- [Twitter API v2 文档](https://developer.twitter.com/en/docs/twitter-api)
- [Threads API 文档](https://developers.facebook.com/docs/threads)
- [Postiz 开源项目](https://github.com/gitroomhq/postiz-app)

## 常见问题

### Q: 为什么不用 Buffer 或 Hootsuite？
A: 第三方服务每月收费 $20-100，且不提供完整的智能字数分割功能。自建系统可完全掌控，且仅需 $5-20/月的 VPS 费用。

### Q: Twitter API 太贵怎么办？
A: 免费层每月 500 条推文，对个人用户通常足够。系统会显示剩余额度，接近限制时提醒。

### Q: 支持其他平台吗？
A: 目前支持 Facebook/Instagram/Twitter/Threads。未来可扩展 LinkedIn、Discord、Mastodon 等平台。

### Q: 数据存储在哪里？
A: 所有数据（包括 OAuth 令牌）存储在你自己的 PostgreSQL 数据库，完全私有。

### Q: 部署时遇到 ENCRYPTION_KEY 错误怎么办？
A: 这个错误表示环境变量未设置或格式不正确。解决方法：
1. 运行 `node scripts/generate-env-keys.js` 生成密钥
2. 在部署平台的环境变量设置中添加 `ENCRYPTION_KEY`
3. 确保密钥是 64 个字符的十六进制字符串
4. 重新部署应用
