import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SplitResult } from '../platform/platform.service';

@Controller('posts')
export class PostController {
  constructor(private postService: PostService) {}

  /**
   * 建立新貼文（草稿或排程）
   */
  @Post()
  async createPost(@CurrentUser() user: any, @Body() dto: CreatePostDto) {
    return this.postService.createPost(user.id, dto);
  }

  /**
   * 立即釋出貼文
   */
  @Post(':id/publish')
  async publishPost(@CurrentUser() user: any, @Param('id') postId: string) {
    return this.postService.publishPost(user.id, postId);
  }

  /**
   * 更新排程時間
   */
  @Put(':id/schedule')
  async updateSchedule(
    @CurrentUser() user: any,
    @Param('id') postId: string,
    @Body() body: { scheduledAt: string },
  ) {
    return this.postService.updateSchedule(user.id, postId, new Date(body.scheduledAt));
  }

  /**
   * 取消排程
   */
  @Delete(':id/schedule')
  async cancelSchedule(@CurrentUser() user: any, @Param('id') postId: string) {
    return this.postService.cancelSchedule(user.id, postId);
  }

  /**
   * 獲取排程狀態
   */
  @Get(':id/schedule-status')
  async getScheduleStatus(@Param('id') postId: string) {
    return this.postService.getScheduleStatus(postId);
  }

  /**
   * 獲取使用者的所有貼文
   */
  @Get()
  async getUserPosts(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.postService.getUserPosts(user.id, status);
  }

  /**
   * 獲取單個貼文
   */
  @Get(':id')
  async getPost(@CurrentUser() user: any, @Param('id') postId: string) {
    return this.postService.getPost(user.id, postId);
  }

  /**
   * 刪除貼文
   */
  @Delete(':id')
  async deletePost(@CurrentUser() user: any, @Param('id') postId: string) {
    return this.postService.deletePost(user.id, postId);
  }

  /**
   * 預覽分割結果
   */
  @Post('preview-split')
  async previewSplit(
    @Body() body: { content: string; platforms: string[] },
  ): Promise<SplitResult[]> {
    return this.postService.previewSplit(body.content, body.platforms);
  }
}
