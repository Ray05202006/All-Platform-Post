import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { TwitterStrategy } from './strategies/twitter.strategy';
import { ThreadsStrategy } from './strategies/threads.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenRefreshService } from './token-refresh.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '7d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EncryptionService,
    FacebookStrategy,
    TwitterStrategy,
    ThreadsStrategy,
    GoogleStrategy,
    JwtStrategy,
    TokenRefreshService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: parseInt(configService.get<string>('REDIS_PORT') || '6379'),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [AuthService, EncryptionService],
})
export class AuthModule {}
