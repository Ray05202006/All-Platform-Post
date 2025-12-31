import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { join, extname } from 'path';
import { existsSync, unlinkSync, statSync } from 'fs';
import * as sharp from 'sharp';

export interface MediaFile {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
}

export interface ProcessedMedia extends MediaFile {
  width?: number;
  height?: number;
  thumbnail?: string;
}

// 各平台媒体限制
const PLATFORM_LIMITS = {
  facebook: {
    image: { maxSize: 4 * 1024 * 1024, maxDimension: 4096 },
    video: { maxSize: 10 * 1024 * 1024 * 1024, maxDuration: 240 }, // 10GB, 240min
  },
  instagram: {
    image: { maxSize: 8 * 1024 * 1024, maxDimension: 1440, aspectRatio: { min: 0.8, max: 1.91 } },
    video: { maxSize: 100 * 1024 * 1024, maxDuration: 60 }, // 100MB, 60s
  },
  twitter: {
    image: { maxSize: 5 * 1024 * 1024, maxDimension: 4096 },
    video: { maxSize: 512 * 1024 * 1024, maxDuration: 140 }, // 512MB, 140s
  },
  threads: {
    image: { maxSize: 8 * 1024 * 1024, maxDimension: 1440, aspectRatio: { min: 0.8, max: 1.91 } },
    video: { maxSize: 100 * 1024 * 1024, maxDuration: 60 },
  },
};

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly uploadDir = join(process.cwd(), 'uploads', 'media');

  /**
   * 处理上传的图片
   */
  async processImage(file: Express.Multer.File): Promise<ProcessedMedia> {
    const filePath = file.path;

    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();

      let processedPath = filePath;
      let width = metadata.width;
      let height = metadata.height;

      // 如果图片过大，进行压缩
      const needsResize = (width && width > 1440) || (height && height > 1440);
      if (needsResize) {
        const resizedFilename = this.getResizedFilename(file.filename);
        processedPath = join(this.uploadDir, resizedFilename);

        await image
          .resize(1440, 1440, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85 })
          .toFile(processedPath);

        // 获取调整后的尺寸
        const resizedMetadata = await sharp(processedPath).metadata();
        width = resizedMetadata.width;
        height = resizedMetadata.height;

        // 删除原始文件
        if (filePath !== processedPath && existsSync(filePath)) {
          unlinkSync(filePath);
        }

        this.logger.log(`Resized image from ${metadata.width}x${metadata.height} to ${width}x${height}`);
      }

      // 生成缩略图
      const thumbnailFilename = this.getThumbnailFilename(file.filename);
      const thumbnailPath = join(this.uploadDir, thumbnailFilename);
      await sharp(processedPath)
        .resize(200, 200, { fit: 'cover' })
        .jpeg({ quality: 70 })
        .toFile(thumbnailPath);

      const finalFilename = needsResize ? this.getResizedFilename(file.filename) : file.filename;
      const stats = statSync(processedPath);

      return {
        filename: finalFilename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: stats.size,
        path: processedPath,
        url: `/uploads/media/${finalFilename}`,
        width,
        height,
        thumbnail: `/uploads/media/${thumbnailFilename}`,
      };
    } catch (error) {
      this.logger.error(`Failed to process image: ${error.message}`);
      throw new BadRequestException(`Failed to process image: ${error.message}`);
    }
  }

  /**
   * 处理上传的视频（目前只做基本验证，不做转码）
   */
  async processVideo(file: Express.Multer.File): Promise<ProcessedMedia> {
    // 视频处理暂时只验证大小
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      throw new BadRequestException(`Video size exceeds maximum limit of ${maxSize / 1024 / 1024}MB`);
    }

    return {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      url: `/uploads/media/${file.filename}`,
    };
  }

  /**
   * 处理上传的文件（自动检测类型）
   */
  async processUpload(file: Express.Multer.File): Promise<ProcessedMedia> {
    if (file.mimetype.startsWith('image/')) {
      return this.processImage(file);
    } else if (file.mimetype.startsWith('video/')) {
      return this.processVideo(file);
    } else {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }
  }

  /**
   * 批量处理上传
   */
  async processMultipleUploads(files: Express.Multer.File[]): Promise<ProcessedMedia[]> {
    return Promise.all(files.map((file) => this.processUpload(file)));
  }

  /**
   * 验证媒体文件是否符合平台要求
   */
  validateForPlatform(media: ProcessedMedia, platform: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const limits = PLATFORM_LIMITS[platform as keyof typeof PLATFORM_LIMITS];

    if (!limits) {
      return { valid: true, errors: [] };
    }

    const isImage = media.mimetype.startsWith('image/');
    const isVideo = media.mimetype.startsWith('video/');

    if (isImage && limits.image) {
      if (media.size > limits.image.maxSize) {
        errors.push(`Image size exceeds ${platform} limit of ${limits.image.maxSize / 1024 / 1024}MB`);
      }
      if (media.width && media.width > limits.image.maxDimension) {
        errors.push(`Image width exceeds ${platform} limit of ${limits.image.maxDimension}px`);
      }
      if (media.height && media.height > limits.image.maxDimension) {
        errors.push(`Image height exceeds ${platform} limit of ${limits.image.maxDimension}px`);
      }

      // Instagram/Threads 宽高比检查
      if ('aspectRatio' in limits.image && media.width && media.height) {
        const aspectRatio = media.width / media.height;
        const { min, max } = limits.image.aspectRatio as { min: number; max: number };
        if (aspectRatio < min || aspectRatio > max) {
          errors.push(`Image aspect ratio must be between ${min} and ${max} for ${platform}`);
        }
      }
    }

    if (isVideo && limits.video) {
      if (media.size > limits.video.maxSize) {
        errors.push(`Video size exceeds ${platform} limit of ${limits.video.maxSize / 1024 / 1024}MB`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证媒体文件是否符合所有目标平台要求
   */
  validateForPlatforms(media: ProcessedMedia, platforms: string[]): { valid: boolean; errors: Record<string, string[]> } {
    const allErrors: Record<string, string[]> = {};
    let allValid = true;

    for (const platform of platforms) {
      const result = this.validateForPlatform(media, platform);
      if (!result.valid) {
        allValid = false;
        allErrors[platform] = result.errors;
      }
    }

    return { valid: allValid, errors: allErrors };
  }

  /**
   * 删除媒体文件
   */
  async deleteMedia(filename: string): Promise<void> {
    const filePath = join(this.uploadDir, filename);
    const thumbnailPath = join(this.uploadDir, this.getThumbnailFilename(filename));

    if (existsSync(filePath)) {
      unlinkSync(filePath);
      this.logger.log(`Deleted media file: ${filename}`);
    }

    if (existsSync(thumbnailPath)) {
      unlinkSync(thumbnailPath);
    }
  }

  /**
   * 获取媒体文件信息
   */
  async getMediaInfo(filename: string): Promise<ProcessedMedia | null> {
    const filePath = join(this.uploadDir, filename);

    if (!existsSync(filePath)) {
      return null;
    }

    const stats = statSync(filePath);
    const ext = extname(filename).toLowerCase();

    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    const isVideo = ['.mp4', '.mov'].includes(ext);

    const media: ProcessedMedia = {
      filename,
      originalname: filename,
      mimetype: isImage ? `image/${ext.slice(1)}` : isVideo ? `video/${ext.slice(1)}` : 'application/octet-stream',
      size: stats.size,
      path: filePath,
      url: `/uploads/media/${filename}`,
    };

    if (isImage) {
      const metadata = await sharp(filePath).metadata();
      media.width = metadata.width;
      media.height = metadata.height;
    }

    return media;
  }

  private getResizedFilename(filename: string): string {
    const ext = extname(filename);
    const base = filename.slice(0, -ext.length);
    return `${base}-resized.jpg`;
  }

  private getThumbnailFilename(filename: string): string {
    const ext = extname(filename);
    const base = filename.slice(0, -ext.length);
    return `${base}-thumb.jpg`;
  }
}
