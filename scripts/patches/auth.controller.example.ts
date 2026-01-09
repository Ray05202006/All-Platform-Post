// 在 AuthController 中對敏感端點加強速率限制
import { Controller, Get, Post, UseGuards, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ============================================
  // 🔒 Security: 嚴格的速率限制（60秒5次）
  // ============================================
  @Public()
  @Throttle({ strict: { limit: 5, ttl: 60000 } })
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuth(@Req() req) {
    // Facebook OAuth 會自動處理
  }

  @Public()
  @Throttle({ strict: { limit: 5, ttl: 60000 } })
  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuthRedirect(@Req() req, @Res() res) {
    return this.authService.handleOAuthCallback(req, res, 'facebook');
  }

  // 其他認證端點同樣添加 @Throttle 裝飾器
  // ...
}
