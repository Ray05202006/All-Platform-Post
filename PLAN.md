# All-Platform-Post 技术实现计划

## 项目概述

个人自建的多平台社交媒体发文系统，支持一次编写内容，自动分发到 Facebook、Instagram、Twitter/X、Threads 四大平台，具备智能字数分割和定时发布功能。

---

## 一、技术栈选择

### 1.1 整体架构：Monorepo

**选择理由**：前后端代码共享、统一依赖管理、简化部署流程

**工具选择**：
- **pnpm workspace**（推荐）：速度快、节省磁盘空间、原生支持 monorepo
- 备选方案：Turborepo（更复杂但性能更好）

### 1.2 前端技术栈

```
Next.js 14 (App Router)
├── React 18
├── TypeScript 5+
├── Tailwind CSS 3
├── shadcn/ui（UI 组件库）
├── React Hook Form（表单管理）
├── Zod（表单验证）
└── TanStack Query（API 状态管理）
```

**关键特性**：
- Server Actions 简化 API 调用
- 内置图片优化（`next/image`）
- 支持 OAuth 回调路由

### 1.3 后端技术栈

```
NestJS 10
├── TypeScript 5+
├── Prisma（ORM）
├── Passport.js（OAuth 认证）
├── BullMQ（任务队列）
└── class-validator（输入验证）
```

**关键模块**：
- `PlatformModule`：各平台 API 集成
- `PostModule`：发文逻辑
- `ScheduleModule`：定时任务
- `MediaModule`：媒体文件处理
- `SplitterModule`：智能字数分割

### 1.4 数据存储

**PostgreSQL 15+**
- 用户数据
- OAuth tokens（加密存储）
- 发文历史
- 排程任务

**Redis 7+**
- BullMQ 任务队列
- OAuth state 参数（CSRF 防护）
- 速率限制计数器
- Session 存储

### 1.5 文件存储

**本地存储**（个人使用推荐）
- 使用 `multer` 处理上传
- 存储路径：`/uploads/media/{user_id}/{timestamp}_{filename}`

**可选扩展**：
- MinIO（自托管 S3 兼容存储）
- Cloudflare R2（免费 10GB）

---

## 二、各平台 API 集成方案

### 2.1 Facebook Pages API

**API 版本**：Graph API v19.0
**费用**：完全免费
**限制**：200 次调用/小时/用户

#### 所需权限
```javascript
const FACEBOOK_SCOPES = [
  'pages_show_list',           // 获取页面列表
  'pages_read_engagement',     // 读取互动数据
  'pages_manage_posts',        // 发布和管理贴文
  'pages_manage_engagement',   // 发布留言
];
```

#### 发文 API
```javascript
// 发布文字贴文
POST /{page-id}/feed
{
  "message": "贴文内容",
  "published": true
}

// 发布图片贴文
POST /{page-id}/photos
{
  "url": "https://example.com/image.jpg",
  "caption": "图片说明",
  "published": true
}

// 发布视频（<1GB）
POST /{page-id}/videos
{
  "file_url": "https://example.com/video.mp4",
  "description": "视频说明"
}
```

#### 留言 API
```javascript
POST /{post-id}/comments
{
  "message": "留言内容（最多 8000 字元）"
}
```

**字数限制**：贴文 63,206 字元 / 留言 8,000 字元

---

### 2.2 Instagram Business API

**API 版本**：Graph API v19.0
**费用**：完全免费
**账号要求**：必须是商业或创作者账号

#### 所需权限
```javascript
const INSTAGRAM_SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'pages_read_engagement',
];
```

#### 发文流程（两步骤）
```javascript
// 步骤 1：创建 Media Container
POST /{ig-user-id}/media
{
  "image_url": "https://example.com/image.jpg",
  "caption": "贴文内容 #hashtag @mention"
}
// 返回 { "id": "container_id" }

// 步骤 2：发布 Container
POST /{ig-user-id}/media_publish
{
  "creation_id": "container_id"
}
```

#### 重要限制
- **无法透过 API 发布 Stories 或 Reels**
- 图片尺寸：最小 320px，最大 1440px，宽高比 4:5 到 1.91:1
- Hashtag 限制：最多 30 个
- 发布速率：每小时 25 个容器

**字数限制**：2,200 字元

---

### 2.3 Twitter/X API

**最大挑战**：免费层级严格限制

#### 免费层级（Free Tier）
- **发文额度**：500 条/月
- **读取限制**：0（无法读取推文）
- **费用**：$0

#### Basic 层级
- **发文额度**：50,000 条/月
- **读取额度**：10,000 条/月
- **费用**：$200/月

#### 推荐方案
对于个人用户：
1. **使用免费层**（500 条/月 = 每天约 16 条，通常足够）
2. 系统内建计数器，接近限额时提醒用户
3. 超出后选择：跳过 Twitter 或升级 Basic 层

#### 所需权限
```javascript
const TWITTER_SCOPES = [
  'tweet.read',
  'tweet.write',
  'users.read',
];
```

#### 发文 API
```javascript
// 发布推文（v2 API）
POST /2/tweets
{
  "text": "推文内容（最多 280 字元）"
}

// 发布带图片的推文
POST /2/tweets
{
  "text": "推文内容",
  "media": {
    "media_ids": ["1234567890"]  // 需先上传媒体
  }
}

// 回复推文（实现串文）
POST /2/tweets
{
  "text": "续文内容 (2/5)",
  "reply": {
    "in_reply_to_tweet_id": "上一条推文ID"
  }
}
```

#### 字元计算规则
```javascript
// Twitter 官方算法
function calculateTweetLength(text) {
  let length = 0;
  for (const char of text) {
    const code = char.codePointAt(0);
    // 拉丁字母: 1 字元
    // 中日韩、Emoji: 2 字元
    length += (code <= 0x10FF) ? 1 : 2;
  }
  // URL 固定算 23 字元
  length += (text.match(/https?:\/\/\S+/g) || []).length * 23;
  return length;
}
```

**字数限制**：免费用户 280 字元 / Twitter Blue 用户 25,000 字元

---

### 2.4 Threads API

**状态**：2024年6月正式开放
**费用**：完全免费
**账号要求**：需绑定 Instagram 账号

#### 所需权限
```javascript
const THREADS_SCOPES = [
  'threads_basic',
  'threads_content_publish',
  'threads_manage_replies',
];
```

#### 发文 API
```javascript
// 创建 Threads 贴文
POST /{threads-user-id}/threads
{
  "media_type": "TEXT",
  "text": "贴文内容（最多 500 字元）"
}

// 发布带图片的贴文
POST /{threads-user-id}/threads
{
  "media_type": "IMAGE",
  "image_url": "https://example.com/image.jpg",
  "text": "图片说明"
}

// 发布 Carousel（多图）
POST /{threads-user-id}/threads
{
  "media_type": "CAROUSEL",
  "children": ["media_id_1", "media_id_2"],
  "text": "轮播图说明"
}
```

#### 回复 API（实现留言功能）
```javascript
POST /{threads-user-id}/threads
{
  "media_type": "TEXT",
  "text": "续文内容",
  "reply_to_id": "父贴文ID"
}
```

**字数限制**：500 字元
**Hashtag 建议**：仅使用 1 个（官方建议）

---

## 三、智能字数分割算法设计

### 3.1 核心挑战

1. **多语言字符计算**（中文、英文、Emoji 权重不同）
2. **自然断句**（避免在句子中间切断）
3. **保留格式**（Hashtag、@Mention、URL 完整性）
4. **平台差异**（Twitter 280 vs Threads 500 vs Facebook 63,206）

### 3.2 算法流程

```
输入文本
  ↓
提取特殊内容（URL、Hashtag、Mention）
  ↓
句子边界检测（pySBD / compromise.js）
  ↓
计算各平台权重长度
  ↓
智能分段（优先级：句号 > 逗号 > 空格）
  ↓
还原特殊内容
  ↓
添加编号（1/5）、（2/5）
  ↓
输出分段结果
```

### 3.3 技术实现方案

#### 方案 A：纯 JavaScript（推荐）

**优点**：
- 与 NestJS 无缝集成
- 部署简单，无需额外语言环境

**核心库**：
- `compromise`：自然语言处理（英文句子分割）
- `nlcst-to-string`：保留原始格式
- 自实现中文断句逻辑（正则表达式）

```typescript
import nlp from 'compromise';

export class TextSplitter {
  // Twitter 字符权重计算
  private calculateTwitterLength(text: string): number {
    let length = 0;
    for (const char of text) {
      const code = char.codePointAt(0)!;
      // 拉丁字符 1 字元，其他 2 字元
      length += (code <= 0x10FF) ? 1 : 2;
    }
    // URL 处理
    const urls = text.match(/https?:\/\/\S+/g) || [];
    length -= urls.reduce((sum, url) => sum + url.length, 0);
    length += urls.length * 23;
    return length;
  }

  // 智能分割
  public split(text: string, platform: 'twitter' | 'threads' | 'facebook'): string[] {
    const maxLength = {
      twitter: 280,
      threads: 500,
      facebook: 63206,
    }[platform];

    // 1. 提取 URL、Hashtag、Mention
    const placeholders = this.extractSpecialContent(text);

    // 2. 句子检测
    const sentences = this.detectSentences(placeholders.text);

    // 3. 组合句子为分段
    const chunks: string[] = [];
    let current = '';

    for (const sentence of sentences) {
      const testText = current + sentence;
      const length = this.calculateLength(testText, platform);

      if (length <= maxLength - 10) {  // 预留编号空间
        current = testText;
      } else {
        if (current) chunks.push(current);
        current = sentence;
      }
    }

    if (current) chunks.push(current);

    // 4. 还原特殊内容并添加编号
    return chunks.map((chunk, i) => {
      const restored = this.restoreSpecialContent(chunk, placeholders);
      return chunks.length > 1 ? `${restored} (${i+1}/${chunks.length})` : restored;
    });
  }

  private detectSentences(text: string): string[] {
    // 中文句子分割
    if (/[\u4e00-\u9fa5]/.test(text)) {
      return text.split(/([。！?？\n]+)/).filter(s => s.trim());
    }

    // 英文句子分割
    const doc = nlp(text);
    return doc.sentences().out('array');
  }
}
```

#### 方案 B：Python 微服务（更准确）

**优点**：
- `pySBD` 提供 22 种语言支持
- 句子边界检测更精确

**架构**：
```
NestJS Backend
  ↓ HTTP/gRPC
Python Splitter Service (FastAPI)
  ↓
返回分段结果
```

**Python 实现**：
```python
import pysbd
import re

class TextSplitter:
    def __init__(self):
        self.segmenter_en = pysbd.Segmenter(language="en", clean=False)
        self.segmenter_zh = pysbd.Segmenter(language="zh", clean=False)

    def split(self, text: str, platform: str) -> list[str]:
        max_lengths = {"twitter": 280, "threads": 500, "facebook": 63206}
        max_len = max_lengths[platform]

        # 检测语言
        is_chinese = bool(re.search(r'[\u4e00-\u9fa5]', text))
        segmenter = self.segmenter_zh if is_chinese else self.segmenter_en

        # 句子分割
        sentences = segmenter.segment(text)

        # 组合句子
        chunks = []
        current = ""

        for sentence in sentences:
            if self.calculate_length(current + sentence, platform) <= max_len - 10:
                current += sentence
            else:
                if current:
                    chunks.append(current)
                current = sentence

        if current:
            chunks.append(current)

        # 添加编号
        if len(chunks) > 1:
            return [f"{chunk} ({i+1}/{len(chunks)})" for i, chunk in enumerate(chunks)]
        return chunks
```

**推荐**：个人项目先用方案 A，需要多语言精确分割时再引入方案 B。

### 3.4 边界情况处理

| 场景 | 处理策略 |
|------|---------|
| Hashtag 被切断 | 检测 `#` 后无空格，整体移至下一段 |
| @Mention 被切断 | 同上，保持 `@username` 完整 |
| URL 被切断 | URL 视为不可分割单元（23字元） |
| Emoji 被切断 | 检测 surrogate pair，整体保留 |
| 代码块被切断 | Markdown ` ``` ` 保持在同一段 |

---

## 四、OAuth 认证流程设计

### 4.1 统一认证架构

```
用户点击「连接 Facebook」
  ↓
重定向到 Facebook OAuth
  ↓
用户授权
  ↓
Facebook 回调 /api/auth/facebook/callback
  ↓
Exchange code for access_token
  ↓
加密存储到 PostgreSQL
  ↓
返回前端并显示「已连接」
```

### 4.2 Passport.js 策略配置

```typescript
// facebook.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get('FACEBOOK_APP_ID'),
      clientSecret: configService.get('FACEBOOK_APP_SECRET'),
      callbackURL: 'http://localhost:3000/api/auth/facebook/callback',
      scope: ['pages_show_list', 'pages_manage_posts', 'pages_manage_engagement'],
      profileFields: ['id', 'displayName', 'emails'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    // 存储 token 到数据库
    return {
      provider: 'facebook',
      providerId: profile.id,
      accessToken,
      refreshToken,
    };
  }
}
```

### 4.3 Token 加密存储

```typescript
// token-encryption.service.ts
import * as crypto from 'crypto';

@Injectable()
export class TokenEncryptionService {
  private algorithm = 'aes-256-gcm';
  private key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // 格式：iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedData: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

### 4.4 Token 刷新机制

```typescript
// token-refresh.service.ts
@Injectable()
export class TokenRefreshService {
  async refreshIfNeeded(connection: PlatformConnection): Promise<string> {
    const now = new Date();
    const expiresAt = connection.tokenExpiresAt;

    // 提前 1 小时刷新
    if (expiresAt && expiresAt.getTime() - now.getTime() < 3600000) {
      const newToken = await this.refreshToken(connection);
      await this.updateToken(connection.id, newToken);
      return newToken;
    }

    return connection.accessToken;
  }

  private async refreshToken(connection: PlatformConnection): Promise<string> {
    switch (connection.platform) {
      case 'facebook':
        return this.refreshFacebookToken(connection.refreshToken);
      case 'twitter':
        return this.refreshTwitterToken(connection.refreshToken);
      // ... 其他平台
    }
  }
}
```

---

## 五、定时发布系统设计

### 5.1 BullMQ 架构

```
用户设定排程（2024-12-25 09:00）
  ↓
创建延迟任务到 Redis
  ↓
时间到达时，Worker 处理任务
  ↓
调用各平台 API 发文
  ↓
更新数据库状态
  ↓
通知用户（可选）
```

### 5.2 任务队列实现

```typescript
// post-scheduler.service.ts
import { Queue, Worker } from 'bullmq';

@Injectable()
export class PostSchedulerService {
  private queue: Queue;
  private worker: Worker;

  constructor(
    private platformService: PlatformService,
    private postRepository: PostRepository,
  ) {
    // 初始化队列
    this.queue = new Queue('scheduled-posts', {
      connection: { host: 'localhost', port: 6379 },
    });

    // 初始化 Worker
    this.worker = new Worker('scheduled-posts', async (job) => {
      return this.processScheduledPost(job.data);
    }, {
      connection: { host: 'localhost', port: 6379 },
      concurrency: 5,  // 并发处理 5 个任务
    });
  }

  // 添加排程
  async schedulePost(postId: string, scheduledAt: Date) {
    const delay = scheduledAt.getTime() - Date.now();

    await this.queue.add('publish-post',
      { postId },
      {
        delay,  // 延迟毫秒数
        attempts: 3,  // 重试 3 次
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      }
    );
  }

  // 处理发文任务
  private async processScheduledPost(data: { postId: string }) {
    const post = await this.postRepository.findOne(data.postId);

    // 调用各平台 API
    const results = await Promise.allSettled(
      post.platforms.map(platform =>
        this.platformService.publish(platform, post.content, post.media)
      )
    );

    // 更新数据库
    await this.postRepository.update(data.postId, {
      status: 'published',
      publishedAt: new Date(),
      results: results.map(r => r.status === 'fulfilled' ? r.value : r.reason),
    });
  }

  // 取消排程
  async cancelSchedule(postId: string) {
    const jobs = await this.queue.getJobs(['delayed', 'waiting']);
    const job = jobs.find(j => j.data.postId === postId);
    if (job) await job.remove();
  }
}
```

### 5.3 Cron 任务（定期清理）

```typescript
// cleanup.service.ts
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CleanupService {
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldPosts() {
    // 删除 90 天前的已发布贴文
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    await this.postRepository.deleteMany({
      status: 'published',
      publishedAt: { $lt: cutoffDate },
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupFailedJobs() {
    // 清理失败的任务
    const queue = new Queue('scheduled-posts');
    await queue.clean(3600000, 100, 'failed');  // 清理 1 小时前的失败任务
  }
}
```

---

## 六、媒体文件处理

### 6.1 上传流程

```
用户上传图片/视频
  ↓
Multer 接收文件（限制 100MB）
  ↓
验证文件类型和尺寸
  ↓
压缩/调整尺寸（Sharp）
  ↓
保存到本地 /uploads
  ↓
返回文件 URL
```

### 6.2 文件上传端点

```typescript
// media.controller.ts
@Controller('api/media')
export class MediaController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/media',
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('不支持的文件类型'), false);
      }
    },
    limits: { fileSize: 100 * 1024 * 1024 },  // 100MB
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    // 图片处理
    if (file.mimetype.startsWith('image/')) {
      await this.processImage(file.path);
    }

    return {
      url: `/uploads/media/${file.filename}`,
      type: file.mimetype,
      size: file.size,
    };
  }

  private async processImage(filePath: string) {
    const sharp = require('sharp');
    const metadata = await sharp(filePath).metadata();

    // Instagram 最大 1440px
    if (metadata.width! > 1440) {
      await sharp(filePath)
        .resize(1440, null, { withoutEnlargement: true })
        .toFile(filePath.replace(/(\.\w+)$/, '-resized$1'));
    }
  }
}
```

### 6.3 各平台媒体要求

| 平台 | 图片格式 | 图片尺寸限制 | 视频格式 | 视频大小限制 |
|------|---------|-------------|---------|-------------|
| Facebook | JPG, PNG, GIF | 最小 200x200 | MP4, MOV | 10GB |
| Instagram | JPG, PNG | 320-1440px, 4:5 到 1.91:1 | MP4 | 100MB, 60秒 |
| Twitter | JPG, PNG, GIF, WEBP | 最大 5MB | MP4, MOV | 512MB, 140秒 |
| Threads | JPG, PNG | 同 Instagram | MP4 | 同 Instagram |

### 6.4 媒体上传到平台

```typescript
// platform.service.ts
@Injectable()
export class PlatformService {
  async uploadMedia(platform: string, filePath: string): Promise<string> {
    switch (platform) {
      case 'facebook':
        return this.uploadToFacebook(filePath);
      case 'instagram':
        return this.uploadToInstagram(filePath);
      case 'twitter':
        return this.uploadToTwitter(filePath);
      case 'threads':
        return this.uploadToThreads(filePath);
    }
  }

  private async uploadToTwitter(filePath: string): Promise<string> {
    const fs = require('fs');
    const FormData = require('form-data');

    const form = new FormData();
    form.append('media', fs.createReadStream(filePath));

    const response = await axios.post(
      'https://upload.twitter.com/1.1/media/upload.json',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    return response.data.media_id_string;
  }
}
```

---

## 七、数据库设计（Prisma Schema）

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 用户表
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())

  connections PlatformConnection[]
  posts       Post[]
}

// 平台连接表（OAuth）
model PlatformConnection {
  id              String   @id @default(cuid())
  userId          String
  platform        String   // 'facebook', 'instagram', 'twitter', 'threads'
  platformUserId  String
  platformUsername String?

  // 加密的 Token
  accessToken     String   @db.Text
  refreshToken    String?  @db.Text
  tokenExpiresAt  DateTime?

  // 额外数据（如 Facebook Page ID）
  metadata        Json?

  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, platform])
  @@index([userId])
}

// 贴文表
model Post {
  id          String   @id @default(cuid())
  userId      String

  // 内容
  content     String   @db.Text
  platforms   String[] // ['facebook', 'twitter', 'instagram', 'threads']

  // 媒体文件
  mediaUrls   String[]
  mediaType   String?  // 'image', 'video', null

  // 排程
  scheduledAt DateTime?
  publishedAt DateTime?
  status      String   @default("draft") // 'draft', 'scheduled', 'publishing', 'published', 'failed'

  // 发布结果
  results     Json?    // { facebook: { postId: "123", url: "..." }, twitter: { error: "..." } }

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, status])
  @@index([scheduledAt])
}

// 发文历史（用于统计）
model PublishLog {
  id         String   @id @default(cuid())
  userId     String
  postId     String
  platform   String
  success    Boolean
  error      String?  @db.Text
  publishedAt DateTime @default(now())

  @@index([userId, platform])
  @@index([publishedAt])
}
```

---

## 八、前端界面设计

### 8.1 页面结构

```
/                        # 首页（登录/注册）
/dashboard               # 主控面板
  /dashboard/compose     # 发文编辑器
  /dashboard/scheduled   # 排程列表
  /dashboard/history     # 发文历史
  /dashboard/settings    # 设置（平台连接）
```

### 8.2 发文编辑器组件

```tsx
// app/dashboard/compose/page.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const postSchema = z.object({
  content: z.string().min(1, '内容不能为空').max(63206),
  platforms: z.array(z.enum(['facebook', 'instagram', 'twitter', 'threads'])).min(1),
  scheduledAt: z.date().optional(),
  mediaFiles: z.array(z.instanceof(File)).max(10).optional(),
});

export default function ComposePage() {
  const [preview, setPreview] = useState<Record<string, string[]>>({});

  const form = useForm({
    resolver: zodResolver(postSchema),
    defaultValues: {
      content: '',
      platforms: [],
      scheduledAt: undefined,
      mediaFiles: [],
    },
  });

  const onSubmit = async (data) => {
    // 1. 上传媒体文件
    const mediaUrls = await uploadMedia(data.mediaFiles);

    // 2. 创建贴文
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: data.content,
        platforms: data.platforms,
        scheduledAt: data.scheduledAt,
        mediaUrls,
      }),
    });

    // 3. 处理结果
    if (response.ok) {
      toast.success('贴文已创建！');
      router.push('/dashboard/scheduled');
    }
  };

  // 实时预览分割结果
  const handleContentChange = async (content: string) => {
    const platforms = form.getValues('platforms');
    const previews: Record<string, string[]> = {};

    for (const platform of platforms) {
      const response = await fetch('/api/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, platform }),
      });
      const { chunks } = await response.json();
      previews[platform] = chunks;
    }

    setPreview(previews);
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* 左侧：编辑器 */}
      <div className="space-y-4">
        <Textarea
          {...form.register('content')}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="输入贴文内容..."
          rows={10}
        />

        <PlatformSelector {...form.register('platforms')} />

        <MediaUploader {...form.register('mediaFiles')} />

        <DateTimePicker {...form.register('scheduledAt')} />

        <Button onClick={form.handleSubmit(onSubmit)}>
          发布
        </Button>
      </div>

      {/* 右侧：预览 */}
      <div className="space-y-4">
        <h3>预览</h3>
        {Object.entries(preview).map(([platform, chunks]) => (
          <Card key={platform}>
            <CardHeader>{platform}</CardHeader>
            <CardContent>
              {chunks.map((chunk, i) => (
                <div key={i} className="p-2 border-b">
                  {chunk}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### 8.3 平台连接设置

```tsx
// app/dashboard/settings/page.tsx
export default function SettingsPage() {
  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: () => fetch('/api/connections').then(r => r.json()),
  });

  const handleConnect = (platform: string) => {
    window.location.href = `/api/auth/${platform}`;
  };

  return (
    <div className="space-y-4">
      {['facebook', 'instagram', 'twitter', 'threads'].map(platform => (
        <Card key={platform}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3>{platform}</h3>
              {connections?.[platform] ? (
                <Badge variant="success">已连接</Badge>
              ) : (
                <Button onClick={() => handleConnect(platform)}>
                  连接
                </Button>
              )}
            </div>
          </CardHeader>
          {connections?.[platform] && (
            <CardContent>
              <p>用户名：{connections[platform].username}</p>
              <p>连接时间：{connections[platform].createdAt}</p>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
```

---

## 九、开发时程规划

### 第 1-2 周：基础架构

- [x] 初始化 Monorepo（pnpm workspace）
- [ ] 配置 Next.js 前端
- [ ] 配置 NestJS 后端
- [ ] 设置 PostgreSQL + Prisma
- [ ] 设置 Redis
- [ ] 实现基础 UI（shadcn/ui）

### 第 3-4 周：OAuth 认证

- [ ] 实现 Facebook OAuth
- [ ] 实现 Instagram OAuth
- [ ] 实现 Twitter OAuth
- [ ] 实现 Threads OAuth
- [ ] Token 加密存储
- [ ] Token 刷新机制

### 第 5-6 周：核心功能

- [ ] 实现 Facebook 发文 API
- [ ] 实现 Instagram 发文 API
- [ ] 实现 Twitter 发文 API
- [ ] 实现 Threads 发文 API
- [ ] 实现智能字数分割算法
- [ ] 实现自动留言功能

### 第 7 周：定时发布

- [ ] 集成 BullMQ
- [ ] 实现排程创建
- [ ] 实现排程取消
- [ ] 实现任务监控

### 第 8 周：媒体处理

- [ ] 实现文件上传
- [ ] 实现图片压缩
- [ ] 实现各平台媒体上传
- [ ] 实现媒体预览

### 第 9-10 周：前端完善

- [ ] 发文编辑器
- [ ] 实时预览
- [ ] 排程管理界面
- [ ] 发文历史
- [ ] 设置页面

### 第 11-12 周：测试与优化

- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能优化
- [ ] 错误处理
- [ ] 文档撰写

---

## 十、成本估算

### 开发成本（自行开发）

| 项目 | 时间 | 说明 |
|------|------|------|
| 基础架构 | 2 周 | Monorepo + Next.js + NestJS |
| OAuth 认证 | 2 周 | 4 个平台 |
| 核心功能 | 2 周 | API 集成 + 字数分割 |
| 定时发布 | 1 周 | BullMQ |
| 媒体处理 | 1 周 | 上传 + 压缩 |
| 前端界面 | 2 周 | 完整 UI |
| 测试优化 | 2 周 | 测试 + 文档 |
| **总计** | **12 周** | 约 3 个月 |

### 运行成本（每月）

| 项目 | 费用 | 说明 |
|------|------|------|
| Twitter API | $0-200 | 免费层 500 条/月；Basic 层 $200/月 |
| VPS 托管 | $5-20 | DigitalOcean / Linode |
| 域名 | $1 | 年费约 $12 |
| PostgreSQL | $0 | 自托管 |
| Redis | $0 | 自托管 |
| 文件存储 | $0 | 本地存储（或 Cloudflare R2 免费 10GB）|
| **总计** | **$6-221/月** | 取决于 Twitter API 使用 |

---

## 十一、风险评估与缓解

### 风险 1：Twitter API 费用过高

**影响**：个人用户难以负担 $200/月

**缓解策略**：
1. 默认使用免费层（500 条/月）
2. 系统内建计数器，接近限额时提醒
3. 提供「跳过 Twitter」选项
4. 考虑使用 Bluesky（去中心化、免费 API）替代

### 风险 2：平台 API 政策变动

**影响**：功能突然失效（如 2023 年 Twitter 废除免费 API）

**缓解策略**：
1. 模块化架构，易于替换平台
2. 关注官方开发者公告
3. 保留备份方案（网页自动化）

### 风险 3：账号被封禁

**影响**：自动化行为可能违反服务条款

**缓解策略**：
1. 遵守各平台速率限制
2. 避免跨多账号发布相同内容
3. 使用官方 API（不用第三方工具）
4. 添加「人工确认」选项

### 风险 4：Token 泄露

**影响**：他人可用你的账号发文

**缓解策略**：
1. AES-256-GCM 加密存储
2. 使用环境变量存储加密密钥
3. 定期轮换密钥
4. 实现 IP 白名单

---

## 十二、后续扩展功能

完成基础功能后，可考虑添加：

1. **Analytics 分析**：
   - 各平台互动数据（赞、评论、分享）
   - 最佳发文时间分析
   - Hashtag 效果追踪

2. **AI 辅助**：
   - 使用 GPT-4 优化文案
   - 自动生成 Hashtag
   - 图片描述生成（alt text）

3. **团队协作**：
   - 多用户支持
   - 审批流程
   - 角色权限管理

4. **更多平台**：
   - LinkedIn（需申请合作伙伴）
   - Discord（完全免费）
   - Telegram
   - Mastodon / Bluesky

5. **进阶排程**：
   - 循环发文（每周一 09:00）
   - 最佳时间推荐
   - 内容队列管理

---

## 总结

本系统采用 **Next.js + NestJS + PostgreSQL + Redis + BullMQ** 的现代技术栈，完全基于各平台官方免费 API（Twitter 除外），核心差异化功能为**智能字数分割算法**。开发时程约 **12 周**，运行成本 **$6-221/月**（取决于 Twitter API 使用）。

关键技术决策：
- ✅ 使用 Postiz 作为参考架构
- ✅ 采用纯 JavaScript 实现字数分割（简化部署）
- ✅ 使用 BullMQ 实现可靠的定时发布
- ✅ AES-256-GCM 加密存储 OAuth tokens
- ✅ 本地文件存储（降低成本）

下一步：开始实现基础架构（Monorepo + Next.js + NestJS）。
