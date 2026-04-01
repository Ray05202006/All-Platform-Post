import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';

export interface OAuthProfile {
  provider: string;
  providerId: string;
  username?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private encryptionService: EncryptionService,
  ) {}

  /**
   * 處理 OAuth 回撥，建立或更新平臺連線
   */
  async handleOAuthCallback(
    userId: string,
    profile: OAuthProfile,
  ): Promise<{ success: boolean; connection: any }> {
    // 加密 tokens
    const encryptedAccessToken = this.encryptionService.encrypt(
      profile.accessToken,
    );
    const encryptedRefreshToken = profile.refreshToken
      ? this.encryptionService.encrypt(profile.refreshToken)
      : null;

    // 建立或更新平臺連線
    const connection = await this.prisma.platformConnection.upsert({
      where: {
        userId_platform: {
          userId,
          platform: profile.provider,
        },
      },
      create: {
        userId,
        platform: profile.provider,
        platformUserId: profile.providerId,
        platformUsername: profile.username,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: profile.expiresAt,
        metadata: profile.metadata || {},
        isActive: true,
      },
      update: {
        platformUserId: profile.providerId,
        platformUsername: profile.username,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: profile.expiresAt,
        metadata: profile.metadata || {},
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return { success: true, connection };
  }

  /**
   * 獲取使用者的所有平臺連線
   */
  async getUserConnections(userId: string) {
    const connections = await this.prisma.platformConnection.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        platform: true,
        platformUsername: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return connections;
  }

  /**
   * 獲取解密後的平臺 access token
   */
  async getDecryptedToken(
    userId: string,
    platform: string,
  ): Promise<string | null> {
    const connection = await this.prisma.platformConnection.findUnique({
      where: {
        userId_platform: { userId, platform },
      },
    });

    if (!connection || !connection.isActive) {
      return null;
    }

    // 檢查 token 是否過期
    if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
      // TODO: 實現 token 重新整理邏輯
      throw new UnauthorizedException(
        `${platform} token has expired. Please reconnect.`,
      );
    }

    return this.encryptionService.decrypt(connection.accessToken);
  }

  /**
   * 斷開平臺連線
   */
  async disconnectPlatform(userId: string, platform: string) {
    await this.prisma.platformConnection.update({
      where: {
        userId_platform: { userId, platform },
      },
      data: {
        isActive: false,
        accessToken: '',
        refreshToken: null,
      },
    });

    return { success: true };
  }

  /**
   * 生成 JWT token
   */
  generateJwtToken(userId: string, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }

  /**
   * 同步驗證 JWT token 字串，返回 payload
   */
  validateJwtTokenSync(token: string): JwtPayload {
    return this.jwtService.verify<JwtPayload>(token);
  }

  /**
   * 驗證 JWT token
   */
  async validateJwtToken(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * 獲取或建立使用者（簡化版，用於開發）
   */
  async getOrCreateDevUser(email: string = 'dev@example.com') {
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: 'Developer',
        },
      });
    }

    return user;
  }

  /**
   * 透過 OAuth 資訊查詢或建立使用者（用於登入）
   */
  async findOrCreateUserByOAuth(
    provider: string,
    providerId: string,
    email: string,
    name?: string,
    avatarUrl?: string,
  ) {
    // 先按 provider + providerId 查詢
    let user = await this.prisma.user.findFirst({
      where: { provider, providerId },
    });

    if (!user) {
      // 按 email 查詢（關聯已有帳號）
      user = await this.prisma.user.findUnique({ where: { email } });

      if (user) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { provider, providerId, avatarUrl },
        });
      } else {
        user = await this.prisma.user.create({
          data: { email, name, provider, providerId, avatarUrl },
        });
      }
    }

    return user;
  }

  /**
   * 獲取當前使用者資料
   */
  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, avatarUrl: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * 生成 OAuth state（用於平臺連線時傳遞使用者身份）
   * 簽發一個短期 JWT (5分鐘)，包含 userId
   */
  generateOAuthState(userId: string): string {
    return this.jwtService.sign(
      { sub: userId, nonce: crypto.randomUUID(), purpose: 'oauth_state' },
      { expiresIn: '5m' },
    );
  }

  /**
   * 從 OAuth state 中提取 userId
   */
  extractUserIdFromState(state: string): string | null {
    try {
      const payload = this.jwtService.verify(state);
      if (payload.purpose !== 'oauth_state') return null;
      return payload.sub;
    } catch {
      this.logger.warn('Failed to extract userId from OAuth state');
      return null;
    }
  }
}
