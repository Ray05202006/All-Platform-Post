import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformService, SplitResult } from '../platform/platform.service';
import { CreatePostDto } from './dto/create-post.dto';
import { SchedulerService } from '../scheduler/scheduler.service';

@Injectable()
export class PostService {
  private schedulerService: SchedulerService | null = null;

  constructor(
    private prisma: PrismaService,
    private platformService: PlatformService,
  ) {}

  /**
   * 設定 SchedulerService（避免迴圈依賴）
   */
  setSchedulerService(schedulerService: SchedulerService) {
    this.schedulerService = schedulerService;
  }

  /**
   * 建立新貼文
   */
  async createPost(userId: string, dto: CreatePostDto) {
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;

    const post = await this.prisma.post.create({
      data: {
        userId,
        content: dto.content,
        platforms: dto.platforms,
        mediaUrls: dto.mediaUrls || [],
        mediaType: dto.mediaType,
        scheduledAt,
        status: scheduledAt ? 'scheduled' : 'draft',
      },
    });

    // 如果是排程貼文，新增到任務佇列
    if (scheduledAt) {
      if (!this.schedulerService) {
        throw new BadRequestException('Scheduler service is not available');
      }
      await this.schedulerService.schedulePost(post.id, userId, scheduledAt);
    }

    return post;
  }

  /**
   * 更新排程時間
   */
  async updateSchedule(userId: string, postId: string, newScheduledAt: Date) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, userId },
    });

    if (!post) {
      throw new BadRequestException('Post not found');
    }

    if (post.status !== 'scheduled' && post.status !== 'draft') {
      throw new BadRequestException('Cannot reschedule a post that is already published or publishing');
    }

    // 更新資料庫
    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        scheduledAt: newScheduledAt,
        status: 'scheduled',
      },
    });

    // 更新任務佇列
    if (!this.schedulerService) {
      throw new BadRequestException('Scheduler service is not available');
    }
    await this.schedulerService.reschedulePost(postId, userId, newScheduledAt);

    return updatedPost;
  }

  /**
   * 取消排程
   */
  async cancelSchedule(userId: string, postId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, userId },
    });

    if (!post) {
      throw new BadRequestException('Post not found');
    }

    if (post.status !== 'scheduled') {
      throw new BadRequestException('Post is not scheduled');
    }

    // 更新資料庫
    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        scheduledAt: null,
        status: 'draft',
      },
    });

    // 從任務佇列移除
    if (!this.schedulerService) {
      throw new BadRequestException('Scheduler service is not available');
    }
    await this.schedulerService.cancelSchedule(postId);

    return updatedPost;
  }

  /**
   * 獲取排程狀態
   */
  async getScheduleStatus(postId: string) {
    if (!this.schedulerService) {
      return { exists: false };
    }
    return this.schedulerService.getJobStatus(postId);
  }

  /**
   * 立即釋出貼文
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

    // 更新狀態為釋出中
    await this.prisma.post.update({
      where: { id: postId },
      data: { status: 'publishing' },
    });

    try {
      // 釋出到各平臺
      const results = await this.platformService.publishToMultiplePlatforms(
        userId,
        post.content,
        post.platforms,
        post.mediaUrls,
        post.mediaType,
      );

      // 更新發布結果
      const successCount = Object.values(results).filter((r: any) => !r.error).length;
      const failCount = Object.values(results).filter((r: any) => r.error).length;
      const status = failCount === 0 ? 'published' : successCount === 0 ? 'failed' : 'partial';
      const updatedPost = await this.prisma.post.update({
        where: { id: postId },
        data: {
          status,
          publishedAt: failCount === 0 ? new Date() : undefined,
          results,
        },
      });

      // 記錄釋出日誌
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
      // 釋出失敗，更新狀態
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
   * 獲取使用者的所有貼文
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
   * 獲取單個貼文
   */
  async getPost(userId: string, postId: string) {
    return this.prisma.post.findFirst({
      where: { id: postId, userId },
    });
  }

  /**
   * 刪除貼文
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
   * 預覽分割結果
   */
  async previewSplit(content: string, platforms: string[]): Promise<SplitResult[]> {
    return this.platformService.previewSplit(content, platforms);
  }
}
