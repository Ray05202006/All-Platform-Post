import prisma from '@/lib/db';

export type LogLevel = 'info' | 'warn' | 'error';
export type LogCategory = 'auth' | 'api' | 'database' | 'publisher' | 'scheduler' | 'frontend';

interface LogOptions {
  userId?: string;
  traceId?: string;
  context?: Record<string, any>;
  error?: any;
}

function formatError(err: unknown) {
  if (err instanceof Error) {
    return {
      type: err.name,
      message: err.message,
      stackTrace: err.stack || '',
      innerException: (err as any).cause ? String((err as any).cause) : undefined,
    };
  } else if (err && typeof err === 'object') {
    return {
      type: (err as any).name || 'UnknownError',
      message: (err as any).message || String(err),
      stackTrace: (err as any).stack || '',
    };
  } else if (err) {
    return {
      type: 'RawError',
      message: String(err),
    };
  }
  return undefined;
}

// Mask sensitive keys to comply with cybersecurity/privacy rules (like Huntress recommendation)
function maskSensitiveData(data: any): any {
  if (!data) return data;
  if (typeof data !== 'object') return data;
  
  const sensitiveKeys = [
    'password', 'accessToken', 'refreshToken', 'token', 'secret', 
    'key', 'credential', 'clientSecret', 'api_key', 'access_token',
    'connection_string', 'connectionstring'
  ];
  
  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item));
  }
  
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const isSensitive = sensitiveKeys.some(sKey => key.toLowerCase().includes(sKey.toLowerCase()));
    if (isSensitive && typeof value === 'string') {
      result[key] = '********';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = maskSensitiveData(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Global logger functions
export const logger = {
  async log(level: LogLevel, category: LogCategory, message: string, options: LogOptions = {}) {
    const { userId, traceId, context, error } = options;
    const formattedError = error ? formatError(error) : undefined;

    // 1. Console Output (formatted and safe)
    const timestamp = new Date().toISOString();
    const logPrefix = `[${timestamp}] [${level.toUpperCase()}] [${category.toUpperCase()}]`;
    const traceInfo = traceId ? ` [Trace: ${traceId}]` : '';
    const userInfo = userId ? ` [User: ${userId}]` : '';
    
    // Mask sensitive details (passwords, tokens, etc.) in console log context
    const cleanContext = context ? maskSensitiveData(context) : undefined;
    const cleanError = formattedError ? maskSensitiveData(formattedError) : undefined;

    const consoleMessage = `${logPrefix}${traceInfo}${userInfo} ${message}`;
    
    if (level === 'error') {
      console.error('%s', consoleMessage, cleanContext ? JSON.stringify(cleanContext) : '', cleanError ? JSON.stringify(cleanError) : '');
    } else if (level === 'warn') {
      console.warn('%s', consoleMessage, cleanContext ? JSON.stringify(cleanContext) : '');
    } else {
      console.log('%s', consoleMessage, cleanContext ? JSON.stringify(cleanContext) : '');
    }

    // 2. Database Output (Safe write)
    if (process.env.NODE_ENV === 'test') {
      // Don't write to DB in tests unless needed
      return;
    }

    try {
      await prisma.systemLog.create({
        data: {
          level,
          category,
          message,
          userId,
          traceId,
          version: '1.0.0',
          context: cleanContext as any,
          error: cleanError as any,
        },
      });
    } catch (dbError) {
      // Don't let database logging failures crash the app
      console.error('[LOGGER_FAILED_TO_WRITE_TO_DB] %s', dbError);
    }
  },

  async info(category: LogCategory, message: string, options: Omit<LogOptions, 'error'> = {}) {
    return this.log('info', category, message, options);
  },

  async warn(category: LogCategory, message: string, options: Omit<LogOptions, 'error'> = {}) {
    return this.log('warn', category, message, options);
  },

  async error(category: LogCategory, message: string, options: LogOptions = {}) {
    return this.log('error', category, message, options);
  },
};
