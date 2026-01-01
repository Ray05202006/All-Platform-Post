import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformService } from '../platform/platform.service';
import { CreatePostDto } from './dto/create-post.dto';
import { SplitResult } from '../platform/platform.service';

@Injectable()
export class PostService {
  constructor(
    private prisma: PrismaService,
    private platformService: PlatformService,
  ) {}

  /**
   * 创建新贴文
   */
  async createPost(userId: string, dto: CreatePostDto) {
    const post = await this.prisma.post.create({
      data: {
        userId,
        content: dto.content,
        platforms: dto.platforms,
        mediaUrls: dto.mediaUrls || [],
        mediaType: dto.mediaType,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: dto.scheduledAt ? 'scheduled' : 'draft',
      },
    });

    return post;
  }

  /**
   * 立即发布贴文
   */
  async publishPost(userId: string, postId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, userId },
    });

    if (!post) {
      throw new BadRequestException('Post not found');
    }

    if (post.status === 'published') {
      throw new BadRequestException('Post already published');
    }

    // 更新状态为发布中
    await this.prisma.post.update({
      where: { id: postId },
      data: { status: 'publishing' },
    });

    try {
      // 发布到各平台
      const results = await this.platformService.publishToMultiplePlatforms(
        userId,
        post.content,
        post.platforms,
        post.mediaUrls,
        post.mediaType,
      );

      // 更新发布结果
      const hasError = Object.values(results).some((r: any) => r.error);
      const updatedPost = await this.prisma.post.update({
        where: { id: postId },
        data: {
          status: hasError ? 'failed' : 'published',
          publishedAt: new Date(),
          results,
        },
      });

      // 记录发布日志
      for (const [platform, result] of Object.entries(results)) {
        await this.prisma.publishLog.create({
          data: {
            userId,
            postId,
            platform,
            success: !(result as any).error,
            error: (result as any).error || null,
          },
        });
      }

      return updatedPost;
    } catch (error) {
      // 发布失败，更新状态
      await this.prisma.post.update({
        where: { id: postId },
        data: {
          status: 'failed',
          results: { error: error.message },
        },
      });
      throw error;
    }
  }

  /**
   * 获取用户的所有贴文
   */
  async getUserPosts(userId: string, status?: string) {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    return this.prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取单个贴文
   */
  async getPost(userId: string, postId: string) {
    return this.prisma.post.findFirst({
      where: { id: postId, userId },
    });
  }

  /**
   * 删除贴文
   */
  async deletePost(userId: string, postId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, userId },
    });

    if (!post) {
      throw new BadRequestException('Post not found');
    }

    if (post.status === 'published') {
      throw new BadRequestException('Cannot delete published post');
    }

    return this.prisma.post.delete({
      where: { id: postId },
    });
  }

  /**
   * 预览分割结果
   */
  async previewSplit(content: string, platforms: string[]) {
    return this.platformService.previewSplit(content, platforms);
  }
}
