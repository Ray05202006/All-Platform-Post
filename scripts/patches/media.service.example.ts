import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { join, extname } from 'path';
import { existsSync, unlinkSync, statSync } from 'fs';
import * as sharp from 'sharp';
import { fileTypeFromFile } from 'file-type';

// ... (其他 interfaces 和 constants 保持不變)

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly uploadDir = join(process.cwd(), 'uploads', 'media');

  // ============================================
  // 🔒 Security Enhancement: 文件類型白名單
  // ============================================
  private readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ];

  private readonly ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/quicktime', // .mov
  ];

  /**
   * 處理上傳的圖片（增強版 - 添加魔術數字驗證）
   */
  async processImage(file: Express.Multer.File): Promise<ProcessedMedia> {
    const filePath = file.path;
    let processedPath = filePath;
    let needsResize = false;

    try {
      // ============================================
      // 🔒 Security: 魔術數字驗證
      // ============================================
      const detectedType = await fileTypeFromFile(filePath);

      if (!detectedType) {
        throw new BadRequestException('Unable to determine file type');
      }

      // 驗證是否為圖片
      if (!detectedType.mime.startsWith('image/')) {
        throw new BadRequestException('File is not a valid image');
      }

      // 白名單驗證
      if (!this.ALLOWED_IMAGE_TYPES.includes(detectedType.mime)) {
        throw new BadRequestException(
          `Image type ${detectedType.mime} is not allowed. Allowed types: ${this.ALLOWED_IMAGE_TYPES.join(', ')}`,
        );
      }

      // MIME type 與擴展名一致性檢查
      const expectedExt = detectedType.ext;
      const actualExt = extname(file.originalname).toLowerCase().slice(1);
      if (expectedExt !== actualExt && !(expectedExt === 'jpg' && actualExt === 'jpeg')) {
        this.logger.warn(
          `File extension mismatch: expected .${expectedExt}, got .${actualExt} for ${file.originalname}`,
        );
      }

      // ============================================
      // 原有的圖片處理邏輯
      // ============================================
      const image = sharp(filePath);
      const metadata = await image.metadata();

      let width = metadata.width;
      let height = metadata.height;

      // 如果圖片過大，進行壓縮
      needsResize = (width && width > 1440) || (height && height > 1440);
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

        // 獲取調整後的尺寸
        const resizedMetadata = await sharp(processedPath).metadata();
        width = resizedMetadata.width;
        height = resizedMetadata.height;

        this.logger.log(`Resized image from ${metadata.width}x${metadata.height} to ${width}x${height}`);
      }

      // 生成縮略圖
      const thumbnailFilename = this.getThumbnailFilename(file.filename);
      const thumbnailPath = join(this.uploadDir, thumbnailFilename);
      const thumbnailImage = sharp(processedPath).resize(200, 200, { fit: 'cover' });
      const ext = extname(file.filename).toLowerCase();
      if (ext === '.png') {
        await thumbnailImage.png().toFile(thumbnailPath);
      } else if (ext === '.webp') {
        await thumbnailImage.webp({ quality: 70 }).toFile(thumbnailPath);
      } else {
        await thumbnailImage.jpeg({ quality: 70 }).toFile(thumbnailPath);
      }

      // 只有所有處理都成功後才刪除原始文件
      if (needsResize && filePath !== processedPath && existsSync(filePath)) {
        unlinkSync(filePath);
      }

      const finalFilename = needsResize ? this.getResizedFilename(file.filename) : file.filename;
      const stats = statSync(processedPath);

      return {
        filename: finalFilename,
        originalname: file.originalname,
        mimetype: detectedType.mime, // 使用檢測到的 MIME type
        size: stats.size,
        path: processedPath,
        url: `/uploads/media/${finalFilename}`,
        width,
        height,
        thumbnail: `/uploads/media/${thumbnailFilename}`,
      };
    } catch (error) {
      // Clean up any partially created files on error
      if (needsResize && processedPath !== filePath && existsSync(processedPath)) {
        unlinkSync(processedPath);
      }
      const thumbnailFilename = this.getThumbnailFilename(file.filename);
      const thumbnailPath = join(this.uploadDir, thumbnailFilename);
      if (existsSync(thumbnailPath)) {
        unlinkSync(thumbnailPath);
      }
      this.logger.error(`Failed to process image: ${error.message}`);
      throw error;
    }
  }

  /**
   * 處理上傳的視頻（增強版 - 添加魔術數字驗證）
   */
  async processVideo(file: Express.Multer.File): Promise<ProcessedMedia> {
    // ============================================
    // 🔒 Security: 魔術數字驗證
    // ============================================
    const detectedType = await fileTypeFromFile(file.path);

    if (!detectedType) {
      throw new BadRequestException('Unable to determine file type');
    }

    // 驗證是否為視頻
    if (!detectedType.mime.startsWith('video/')) {
      throw new BadRequestException('File is not a valid video');
    }

    // 白名單驗證
    if (!this.ALLOWED_VIDEO_TYPES.includes(detectedType.mime)) {
      throw new BadRequestException(
        `Video type ${detectedType.mime} is not allowed. Allowed types: ${this.ALLOWED_VIDEO_TYPES.join(', ')}`,
      );
    }

    // 視頻大小驗證
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      throw new BadRequestException(`Video size exceeds maximum limit of ${maxSize / 1024 / 1024}MB`);
    }

    return {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: detectedType.mime, // 使用檢測到的 MIME type
      size: file.size,
      path: file.path,
      url: `/uploads/media/${file.filename}`,
    };
  }

  // ... (其他方法保持不變)
}
