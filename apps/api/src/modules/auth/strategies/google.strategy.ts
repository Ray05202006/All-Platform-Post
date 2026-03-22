import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');

    if (!clientID || !clientSecret) {
      throw new Error(
        'Google OAuth is not configured: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set.',
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL: `${configService.get<string>('API_URL') || 'http://localhost:3001'}/api/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const user = {
      provider: 'google',
      providerId: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
    };

    done(null, user);
  }
}
