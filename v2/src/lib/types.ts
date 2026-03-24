export type Platform = 'facebook' | 'instagram' | 'twitter' | 'threads';

export type PostStatus =
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'partial';

export interface PlatformResult {
  postId?: string;
  url?: string;
  error?: string;
}

export interface SplitResult {
  platform: string;
  chunks: string[];
  needsSplitting: boolean;
}

export const PLATFORM_LIMITS: Record<Platform, number> = {
  facebook: 63206,
  instagram: 2200,
  twitter: 280,
  threads: 500,
};
