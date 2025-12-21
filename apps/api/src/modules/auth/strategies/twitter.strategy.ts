import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-twitter';

/**
 * Twitter OAuth 1.0a Strategy
 * 注意：Twitter API v2 推荐使用 OAuth 2.0 + PKCE
 * 这里使用 OAuth 1.0a 是因为 passport-twitter 更稳定
 */
@Injectable()
export class TwitterStrategy extends PassportStrategy(Strategy, 'twitter') {
  constructor(private configService: ConfigService) {
    super({
      consumerKey: configService.get<string>('TWITTER_CLIENT_ID'),
      consumerSecret: configService.get<string>('TWITTER_CLIENT_SECRET'),
      callbackURL: `${configService.get<string>('API_URL') || 'http://localhost:3001'}/api/auth/twitter/callback`,
      includeEmail: true,
    });
  }

  async validate(
    token: string,
    tokenSecret: string,
    profile: any,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    const user = {
      provider: 'twitter',
      providerId: profile.id,
      username: profile.username,
      accessToken: token,
      refreshToken: tokenSecret, // OAuth 1.0a 使用 token secret
      metadata: {
        displayName: profile.displayName,
        email: profile.emails?.[0]?.value,
        photo: profile.photos?.[0]?.value,
      },
    };

    done(null, user);
  }
}
