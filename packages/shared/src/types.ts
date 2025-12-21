/**
 * 支持的社交媒体平台
 */
export type Platform = 'facebook' | 'instagram' | 'twitter' | 'threads';

/**
 * 贴文状态
 */
export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';

/**
 * 媒体类型
 */
export type MediaType = 'image' | 'video';

/**
 * 平台配置
 */
export interface PlatformConfig {
  platform: Platform;
  maxLength: number; // 最大字符数
  maxCommentLength: number; // 最大评论字符数
  supportsImages: boolean;
  supportsVideos: boolean;
  maxImages: number;
  maxVideos: number;
}

/**
 * 平台限制配置
 */
export const PLATFORM_LIMITS: Record<Platform, PlatformConfig> = {
  facebook: {
    platform: 'facebook',
    maxLength: 63206,
    maxCommentLength: 8000,
    supportsImages: true,
    supportsVideos: true,
    maxImages: 10,
    maxVideos: 1,
  },
  instagram: {
    platform: 'instagram',
    maxLength: 2200,
    maxCommentLength: 2200,
    supportsImages: true,
    supportsVideos: true,
    maxImages: 10,
    maxVideos: 1,
  },
  twitter: {
    platform: 'twitter',
    maxLength: 280,
    maxCommentLength: 280,
    supportsImages: true,
    supportsVideos: true,
    maxImages: 4,
    maxVideos: 1,
  },
  threads: {
    platform: 'threads',
    maxLength: 500,
    maxCommentLength: 500,
    supportsImages: true,
    supportsVideos: true,
    maxImages: 10,
    maxVideos: 1,
  },
};

/**
 * OAuth 连接信息
 */
export interface PlatformConnection {
  id: string;
  userId: string;
  platform: Platform;
  platformUserId: string;
  platformUsername?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 贴文
 */
export interface Post {
  id: string;
  userId: string;
  content: string;
  platforms: Platform[];
  mediaUrls?: string[];
  mediaType?: MediaType;
  scheduledAt?: Date;
  publishedAt?: Date;
  status: PostStatus;
  results?: PlatformPublishResult;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 平台发布结果
 */
export interface PlatformPublishResult {
  [platform: string]: {
    postId?: string;
    url?: string;
    error?: string;
  };
}

/**
 * 创建贴文请求
 */
export interface CreatePostDto {
  content: string;
  platforms: Platform[];
  mediaUrls?: string[];
  mediaType?: MediaType;
  scheduledAt?: Date;
}

/**
 * 文本分割结果
 */
export interface SplitResult {
  platform: Platform;
  chunks: string[];
  needsSplitting: boolean;
}
