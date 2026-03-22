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
   * 处理 OAuth 回调，创建或更新平台连接
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

    // 创建或更新平台连接
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
   * 获取用户的所有平台连接
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
   * 获取解密后的平台 access token
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

    // 检查 token 是否过期
    if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
      // TODO: 实现 token 刷新逻辑
      throw new UnauthorizedException(
        `${platform} token has expired. Please reconnect.`,
      );
    }

    return this.encryptionService.decrypt(connection.accessToken);
  }

  /**
   * 断开平台连接
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
   * 同步验证 JWT token 字符串，返回 payload
   */
  validateJwtTokenSync(token: string): JwtPayload {
    return this.jwtService.verify<JwtPayload>(token);
  }

  /**
   * 验证 JWT token
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
   * 获取或创建用户（简化版，用于开发）
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
   * 通过 OAuth 信息查找或创建用户（用于登入）
   */
  async findOrCreateUserByOAuth(
    provider: string,
    providerId: string,
    email: string,
    name?: string,
    avatarUrl?: string,
  ) {
    // 先按 provider + providerId 查找
    let user = await this.prisma.user.findFirst({
      where: { provider, providerId },
    });

    if (!user) {
      // 按 email 查找（关联已有帐号）
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
   * 获取当前用户资料
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
   * 生成 OAuth state（用于平台连接时传递用户身份）
   * 签发一个短期 JWT (5分钟)，包含 userId
   */
  generateOAuthState(userId: string): string {
    return this.jwtService.sign(
      { sub: userId, nonce: crypto.randomUUID(), purpose: 'oauth_state' },
      { expiresIn: '5m' },
    );
  }

  /**
   * 从 OAuth state 中提取 userId
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
