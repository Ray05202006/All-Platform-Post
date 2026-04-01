import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  /**
   * 上傳單個檔案
   */
  @Post('upload')

  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const processed = await this.mediaService.processUpload(file);
    return {
      success: true,
      file: processed,
    };
  }

  /**
   * 上傳多個檔案
   */
  @Post('upload-multiple')

  @UseInterceptors(FilesInterceptor('files', 10)) // 最多 10 個檔案
  async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const processed = await this.mediaService.processMultipleUploads(files);
    return {
      success: true,
      files: processed,
    };
  }

  /**
   * 驗證檔案是否符合平臺要求
   */
  @Post('validate')

  async validateMedia(
    @Body() body: { filename: string; platforms: string[] },
  ) {
    const media = await this.mediaService.getMediaInfo(body.filename);
    if (!media) {
      throw new BadRequestException('File not found');
    }

    const validation = this.mediaService.validateForPlatforms(media, body.platforms);
    return {
      ...validation,
      file: media,
    };
  }

  /**
   * 獲取檔案資訊
   */
  @Get(':filename/info')

  async getMediaInfo(@Param('filename') filename: string) {
    const media = await this.mediaService.getMediaInfo(filename);
    if (!media) {
      throw new BadRequestException('File not found');
    }
    return media;
  }

  /**
   * 刪除檔案
   */
  @Delete(':filename')

  async deleteMedia(@Param('filename') filename: string) {
    await this.mediaService.deleteMedia(filename);
    return { success: true };
  }

  /**
   * 提供靜態檔案訪問（開發用）
   * 生產環境應該由 Nginx 或 CDN 提供
   */
  @Get(':filename')

  async serveMedia(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Sanitize filename to prevent path traversal attacks
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    if (!sanitizedFilename || sanitizedFilename !== filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const uploadsDir = resolve(process.cwd(), 'uploads', 'media');
    const filePath = join(uploadsDir, sanitizedFilename);
    
    // Ensure the resolved path is within the uploads directory
    const resolvedPath = resolve(filePath);
    if (!resolvedPath.startsWith(uploadsDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    return res.sendFile(resolvedPath);
  }
}
