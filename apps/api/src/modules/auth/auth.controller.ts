import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService, OAuthProfile } from './auth.service';
import { ThreadsStrategy } from './strategies/threads.strategy';
import { EncryptionService } from '../../common/services/encryption.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private threadsStrategy: ThreadsStrategy,
    private encryptionService: EncryptionService,
    private configService: ConfigService,
  ) {}

  /**
   * 开发用：获取临时 JWT token
   */
  @Public()
  @Get('dev-token')
  async getDevToken() {
    const user = await this.authService.getOrCreateDevUser();
    const token = this.authService.generateJwtToken(user.id, user.email);
    return { token, user };
  }

  // ==================== Facebook OAuth ====================

  @Public()
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuth() {
    // Passport 会自动重定向到 Facebook
  }

  @Public()
  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const profile = req.user as OAuthProfile;

      // 获取或创建开发用户（正式环境应从 session 获取）
      const user = await this.authService.getOrCreateDevUser();

      await this.authService.handleOAuthCallback(user.id, profile);

      // 重定向回前端设置页面
      const frontendUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL');
      res.redirect(`${frontendUrl}/dashboard/settings?connected=facebook`);
    } catch (error) {
      console.error('Facebook OAuth error:', error);
      const frontendUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL');
      res.redirect(`${frontendUrl}/dashboard/settings?error=facebook_failed`);
    }
  }

  // ==================== Twitter OAuth ====================

  @Public()
  @Get('twitter')
  @UseGuards(AuthGuard('twitter'))
  async twitterAuth() {
    // Passport 会自动重定向到 Twitter
  }

  @Public()
  @Get('twitter/callback')
  @UseGuards(AuthGuard('twitter'))
  async twitterCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const profile = req.user as OAuthProfile;
      const user = await this.authService.getOrCreateDevUser();

      await this.authService.handleOAuthCallback(user.id, profile);

      const frontendUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL');
      res.redirect(`${frontendUrl}/dashboard/settings?connected=twitter`);
    } catch (error) {
      console.error('Twitter OAuth error:', error);
      const frontendUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL');
      res.redirect(`${frontendUrl}/dashboard/settings?error=twitter_failed`);
    }
  }

  // ==================== Threads OAuth ====================

  @Public()
  @Get('threads')
  async threadsAuth(@Res() res: Response) {
    const state = this.encryptionService.generateState();
    // TODO: 将 state 存储在 session 或 Redis 中用于验证
    const authUrl = this.threadsStrategy.getAuthorizationUrl(state);
    res.redirect(authUrl);
  }

  @Public()
  @Get('threads/callback')
  async threadsCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL');

    if (error) {
      console.error('Threads OAuth error:', error);
      return res.redirect(`${frontendUrl}/dashboard/settings?error=threads_denied`);
    }

    try {
      // TODO: 验证 state 参数

      // 交换授权码
      const { accessToken, userId } =
        await this.threadsStrategy.exchangeCodeForToken(code);

      // 获取长期 token
      const longLivedToken =
        await this.threadsStrategy.getLongLivedToken(accessToken);

      // 获取用户资料
      const profile = await this.threadsStrategy.getUserProfile(
        longLivedToken.accessToken,
      );

      // 获取开发用户
      const user = await this.authService.getOrCreateDevUser();

      // 保存连接
      await this.authService.handleOAuthCallback(user.id, {
        provider: 'threads',
        providerId: profile.id,
        username: profile.username,
        accessToken: longLivedToken.accessToken,
        expiresAt: new Date(Date.now() + longLivedToken.expiresIn * 1000),
        metadata: {
          threadsProfilePictureUrl: profile.threadsProfilePictureUrl,
        },
      });

      res.redirect(`${frontendUrl}/dashboard/settings?connected=threads`);
    } catch (err) {
      console.error('Threads OAuth error:', err);
      res.redirect(`${frontendUrl}/dashboard/settings?error=threads_failed`);
    }
  }

  // ==================== Instagram OAuth ====================
  // Instagram 使用 Facebook OAuth，通过 Facebook Pages 关联

  @Public()
  @Get('instagram')
  @UseGuards(AuthGuard('facebook'))
  async instagramAuth() {
    // 使用 Facebook OAuth，scope 包含 instagram_basic
  }

  @Public()
  @Get('instagram/callback')
  @UseGuards(AuthGuard('facebook'))
  async instagramCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const facebookProfile = req.user as OAuthProfile;
      const user = await this.authService.getOrCreateDevUser();

      // 保存为 Instagram 连接（通过 Facebook 获取 Instagram Business Account）
      await this.authService.handleOAuthCallback(user.id, {
        ...facebookProfile,
        provider: 'instagram',
      });

      const frontendUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL');
      res.redirect(`${frontendUrl}/dashboard/settings?connected=instagram`);
    } catch (error) {
      console.error('Instagram OAuth error:', error);
      const frontendUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL');
      res.redirect(`${frontendUrl}/dashboard/settings?error=instagram_failed`);
    }
  }

  // ==================== 连接管理 ====================

  @UseGuards(JwtAuthGuard)
  @Get('connections')
  async getConnections(@CurrentUser() user: any) {
    return this.authService.getUserConnections(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('connections/:platform')
  async disconnectPlatform(
    @CurrentUser() user: any,
    @Param('platform') platform: string,
  ) {
    const validPlatforms = ['facebook', 'instagram', 'twitter', 'threads'];
    if (!validPlatforms.includes(platform)) {
      throw new HttpException('Invalid platform', HttpStatus.BAD_REQUEST);
    }

    return this.authService.disconnectPlatform(user.id, platform);
  }
}
