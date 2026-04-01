import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService, OAuthProfile } from './auth.service';
import { ThreadsStrategy } from './strategies/threads.strategy';
import { EncryptionService } from '../../common/services/encryption.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private threadsStrategy: ThreadsStrategy,
    private encryptionService: EncryptionService,
    private configService: ConfigService,
  ) {}

  // ==================== Current User ====================

  @Get('me')
  async getMe(@CurrentUser() user: any) {
    return this.authService.getCurrentUser(user.id);
  }

  /**
   * 開發用：獲取臨時 JWT token
   */
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Get('dev-token')
  async getDevToken() {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
    const user = await this.authService.getOrCreateDevUser();
    const token = this.authService.generateJwtToken(user.id, user.email);
    return { token, user };
  }

  // ==================== Google OAuth ====================

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Passport 會自動重定向到 Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const profile = req.user as {
        provider: string;
        providerId: string;
        email: string;
        name: string;
        avatarUrl: string;
        accessToken: string;
      };

      const user = await this.authService.findOrCreateUserByOAuth(
        profile.provider,
        profile.providerId,
        profile.email,
        profile.name,
        profile.avatarUrl,
      );

      const token = this.authService.generateJwtToken(user.id, user.email);
      const frontendUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL');
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Google OAuth error:', error);
      const frontendUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL');
      res.redirect(`${frontendUrl}/auth/callback?error=google_failed`);
    }
  }

  // ==================== Facebook OAuth ====================

  @Public()
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuth() {
    // Passport 會自動重定向到 Facebook
  }

  @Public()
  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const profile = req.user as OAuthProfile;

      // 獲取或建立開發使用者（正式環境應從 session 獲取）
      const user = await this.authService.getOrCreateDevUser();

      await this.authService.handleOAuthCallback(user.id, profile);

      // 重定向回前端設定頁面
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
    // Passport 會自動重定向到 Twitter
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
    // TODO: store state in DB or signed cookie for CSRF validation
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
      // TODO: 驗證 state 引數

      // 交換授權碼
      const { accessToken } =
        await this.threadsStrategy.exchangeCodeForToken(code);

      // 獲取長期 token
      const longLivedToken =
        await this.threadsStrategy.getLongLivedToken(accessToken);

      // 獲取使用者資料
      const profile = await this.threadsStrategy.getUserProfile(
        longLivedToken.accessToken,
      );

      // 獲取開發使用者
      const user = await this.authService.getOrCreateDevUser();

      // 儲存連線
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
  // Instagram 使用 Facebook OAuth，透過 Facebook Pages 關聯

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

      // 儲存為 Instagram 連線（透過 Facebook 獲取 Instagram Business Account）
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

  // ==================== 連線管理 ====================

  @Get('connections')
  async getConnections(@CurrentUser() user: any) {
    return this.authService.getUserConnections(user.id);
  }

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
