import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Token 加密服务
 * 使用 AES-256-GCM 加密存储 OAuth tokens
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    
    if (!encryptionKey) {
      throw new Error(
        'ENCRYPTION_KEY environment variable is required but not set.\n' +
        'Please set it in your deployment environment.\n' +
        'Generate a secure key with: openssl rand -hex 32\n' +
        'For Zeabur: Add ENCRYPTION_KEY to your environment variables in the service settings.',
      );
    }
    
    if (encryptionKey.length !== 64) {
      throw new Error(
        `ENCRYPTION_KEY must be exactly 64 characters (32 bytes in hex format), but got ${encryptionKey.length} characters.\n` +
        'Generate a new key with: openssl rand -hex 32',
      );
    }
    
    // Validate that the key is a valid hex string
    if (!/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
      throw new Error(
        'ENCRYPTION_KEY must contain only hexadecimal characters (0-9, a-f, A-F).\n' +
        'Generate a new key with: openssl rand -hex 32',
      );
    }
    
    this.key = Buffer.from(encryptionKey, 'hex');
  }

  /**
   * 加密文本
   * @param text 要加密的文本
   * @returns 加密后的字符串（格式：iv:authTag:encrypted）
   */
  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // 格式：iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * 解密文本
   * @param encryptedData 加密的字符串
   * @returns 解密后的原始文本
   */
  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * 生成随机 state 参数（用于 CSRF 防护）
   */
  generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 生成 PKCE code verifier
   */
  generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * 生成 PKCE code challenge
   */
  generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }
}
