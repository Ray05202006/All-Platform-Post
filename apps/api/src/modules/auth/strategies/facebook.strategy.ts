import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';

/**
 * Facebook OAuth 2.0 Strategy
 * 用于连接 Facebook Pages 和 Instagram Business Accounts
 */
@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('FACEBOOK_APP_ID'),
      clientSecret: configService.get<string>('FACEBOOK_APP_SECRET'),
      callbackURL: `${configService.get<string>('API_URL') || 'http://localhost:3001'}/api/auth/facebook/callback`,
      scope: [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'pages_manage_engagement',
        'instagram_basic',
        'instagram_content_publish',
      ],
      profileFields: ['id', 'displayName', 'emails', 'photos'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    const user = {
      provider: 'facebook',
      providerId: profile.id,
      username: profile.displayName,
      accessToken,
      refreshToken,
      // Facebook tokens 有 60 天有效期
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      metadata: {
        email: profile.emails?.[0]?.value,
        photo: profile.photos?.[0]?.value,
      },
    };

    done(null, user);
  }
}
