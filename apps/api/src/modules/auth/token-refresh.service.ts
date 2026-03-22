import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';

@Injectable()
export class TokenRefreshService {
  private readonly logger = new Logger(TokenRefreshService.name);

  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
    private configService: ConfigService,
  ) {}

  /**
   * 每天凌晨 2 点检查即将过期的 token 并刷新
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async refreshExpiringTokens() {
    this.logger.log('Checking for tokens that need refreshing...');

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringConnections = await this.prisma.platformConnection.findMany({
      where: {
        isActive: true,
        tokenExpiresAt: {
          not: null,
          lte: sevenDaysFromNow,
          gt: new Date(),
        },
        platform: { in: ['facebook', 'instagram', 'threads'] },
      },
    });

    this.logger.log(
      `Found ${expiringConnections.length} tokens to refresh`,
    );

    for (const connection of expiringConnections) {
      try {
        await this.refreshToken(connection);
        this.logger.log(
          `Refreshed ${connection.platform} token for user ${connection.userId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to refresh ${connection.platform} token for user ${connection.userId}: ${error instanceof Error ? error.message : String(error)}`,
        );
        await this.handleRefreshFailure(connection);
      }
    }
  }

  private async refreshToken(connection: any) {
    const currentToken = this.encryptionService.decrypt(
      connection.accessToken,
    );

    switch (connection.platform) {
      case 'facebook':
      case 'instagram':
        return this.refreshFacebookToken(connection, currentToken);
      case 'threads':
        return this.refreshThreadsToken(connection, currentToken);
    }
  }

  private async refreshFacebookToken(connection: any, currentToken: string) {
    const response = await axios.get(
      'https://graph.facebook.com/v19.0/oauth/access_token',
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.configService.get('FACEBOOK_APP_ID'),
          client_secret: this.configService.get('FACEBOOK_APP_SECRET'),
          fb_exchange_token: currentToken,
        },
      },
    );

    const newToken = response.data.access_token;
    const expiresIn = response.data.expires_in || 60 * 24 * 60 * 60;

    const encryptedToken = this.encryptionService.encrypt(newToken);
    await this.prisma.platformConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: encryptedToken,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      },
    });
  }

  private async refreshThreadsToken(connection: any, currentToken: string) {
    const response = await axios.get(
      'https://graph.threads.net/refresh_access_token',
      {
        params: {
          grant_type: 'th_refresh_token',
          access_token: currentToken,
        },
      },
    );

    const newToken = response.data.access_token;
    const expiresIn = response.data.expires_in;

    const encryptedToken = this.encryptionService.encrypt(newToken);
    await this.prisma.platformConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: encryptedToken,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      },
    });
  }

  private async handleRefreshFailure(connection: any) {
    // If token is already expired, deactivate the connection
    if (
      connection.tokenExpiresAt &&
      connection.tokenExpiresAt < new Date()
    ) {
      await this.prisma.platformConnection.update({
        where: { id: connection.id },
        data: {
          isActive: false,
          metadata: {
            ...((connection.metadata as object) || {}),
            refreshError: 'Token expired and refresh failed',
            deactivatedAt: new Date().toISOString(),
          },
        },
      });
      this.logger.warn(
        `Deactivated ${connection.platform} connection for user ${connection.userId} - token expired and refresh failed`,
      );
    }
  }
}
