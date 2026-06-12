import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  default: {
    systemLog: {
      create: vi.fn(),
    },
  },
}));

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const mockCreate = vi.mocked(prisma.systemLog.create);

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({} as any);
    // Mock console methods to avoid cluttering test outputs
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('logging levels', () => {
    it('creates an info level log entry', async () => {
      // Temporarily change NODE_ENV to production/staging so it writes to DB
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      await logger.info('api', 'User logged in', { userId: 'u1', traceId: 't1' });
      
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          level: 'info',
          category: 'api',
          message: 'User logged in',
          userId: 'u1',
          traceId: 't1',
          version: '1.0.0',
          context: undefined,
          error: undefined,
        },
      });

      process.env.NODE_ENV = origEnv;
    });

    it('creates a warn level log entry with context', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const context = { method: 'GET', path: '/api/posts' };
      await logger.warn('api', 'Slow query warning', { context });

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          level: 'warn',
          category: 'api',
          message: 'Slow query warning',
          userId: undefined,
          traceId: undefined,
          version: '1.0.0',
          context,
          error: undefined,
        },
      });

      process.env.NODE_ENV = origEnv;
    });

    it('creates an error level log with Error object', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Database connection reset');
      error.stack = 'MockStack';
      
      await logger.error('database', 'Query failed', { error });

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          level: 'error',
          category: 'database',
          message: 'Query failed',
          userId: undefined,
          traceId: undefined,
          version: '1.0.0',
          context: undefined,
          error: {
            type: 'Error',
            message: 'Database connection reset',
            stackTrace: 'MockStack',
            innerException: undefined,
          },
        },
      });

      process.env.NODE_ENV = origEnv;
    });
  });

  describe('privacy-safe sensitive masking', () => {
    it('masks passwords and access tokens in context data', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const context = {
        username: 'testuser',
        password: 'my-super-secret-password-123',
        auth: {
          accessToken: 'ghp_secretTokenHere',
          refreshToken: 'refresh-token-data',
        },
      };

      await logger.info('auth', 'Login details processed', { context });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          context: {
            username: 'testuser',
            password: '********',
            auth: {
              accessToken: '********',
              refreshToken: '********',
            },
          },
        }),
      });

      process.env.NODE_ENV = origEnv;
    });
  });
});
