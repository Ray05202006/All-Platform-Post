/**
 * 支援的社交媒體平臺
 */
export type Platform = 'facebook' | 'instagram' | 'twitter' | 'threads';

/**
 * 貼文狀態
 */
export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'partial';

/**
 * 媒體型別
 */
export type MediaType = 'image' | 'video';

/**
 * 平臺配置
 */
export interface PlatformConfig {
  platform: Platform;
  maxLength: number; // 最大字元數
  maxCommentLength: number; // 最大評論字元數
  supportsImages: boolean;
  supportsVideos: boolean;
  maxImages: number;
  maxVideos: number;
}

/**
 * 平臺限制配置
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
 * OAuth 連線資訊
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
 * 貼文
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
 * 平臺釋出結果
 */
export interface PlatformPublishResult {
  [platform: string]: {
    postId?: string;
    url?: string;
    error?: string;
  };
}

/**
 * 建立貼文請求
 */
export interface CreatePostDto {
  content: string;
  platforms: Platform[];
  mediaUrls?: string[];
  mediaType?: MediaType;
  scheduledAt?: Date;
}

/**
 * 文字分割結果
 */
export interface SplitResult {
  platform: Platform;
  chunks: string[];
  needsSplitting: boolean;
}
