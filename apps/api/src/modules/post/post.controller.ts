import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostController {
  constructor(private postService: PostService) {}

  /**
   * 创建新贴文（草稿或排程）
   */
  @Post()
  async createPost(@CurrentUser() user: any, @Body() dto: CreatePostDto) {
    return this.postService.createPost(user.id, dto);
  }

  /**
   * 立即发布贴文
   */
  @Post(':id/publish')
  async publishPost(@CurrentUser() user: any, @Param('id') postId: string) {
    return this.postService.publishPost(user.id, postId);
  }

  /**
   * 更新排程时间
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
   * 获取排程状态
   */
  @Get(':id/schedule-status')
  async getScheduleStatus(@Param('id') postId: string) {
    return this.postService.getScheduleStatus(postId);
  }

  /**
   * 获取用户的所有贴文
   */
  @Get()
  async getUserPosts(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.postService.getUserPosts(user.id, status);
  }

  /**
   * 获取单个贴文
   */
  @Get(':id')
  async getPost(@CurrentUser() user: any, @Param('id') postId: string) {
    return this.postService.getPost(user.id, postId);
  }

  /**
   * 删除贴文
   */
  @Delete(':id')
  async deletePost(@CurrentUser() user: any, @Param('id') postId: string) {
    return this.postService.deletePost(user.id, postId);
  }

  /**
   * 预览分割结果
   */
  @Post('preview-split')
  async previewSplit(
    @Body() body: { content: string; platforms: string[] },
  ) {
    return this.postService.previewSplit(body.content, body.platforms);
  }
}
