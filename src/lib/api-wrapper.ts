import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

interface HandlerOptions {
  requireAuth?: boolean;
}

export function withApiHandler(
  category: 'auth' | 'api' | 'database' | 'publisher' | 'scheduler',
  handler: (
    request: Request,
    context: { params: any; userId?: string; traceId: string }
  ) => Promise<Response | NextResponse>,
  options: HandlerOptions = { requireAuth: true }
) {
  return async (request: Request, context?: any) => {
    // Generate a unique trace ID for request tracking and observability
    const traceId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'trace-' + Math.random().toString(36).substring(2, 15);
    let userId: string | undefined = undefined;

    // Resolve params if it's a promise (Next.js 15 routing params are promises)
    let params: any = undefined;
    if (context?.params) {
      params = context.params instanceof Promise ? await context.params : context.params;
    }

    try {
      const session = await getServerSession(authOptions);
      userId = (session?.user as any)?.id;

      if (options.requireAuth && !userId) {
        await logger.warn(category, 'Unauthorized API access attempt', {
          traceId,
          context: {
            path: request.url,
            method: request.method,
          },
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Record API request start (at debug level conceptually, but info level for critical actions)
      if (request.method !== 'GET') {
        await logger.info(category, `API request initiated: ${request.method} ${request.url}`, {
          userId,
          traceId,
          context: {
            method: request.method,
            path: request.url,
            params,
          },
        });
      }

      // Execute request handler
      const response = await handler(request, {
        params,
        userId,
        traceId,
      });

      // Record API success (if not a GET)
      if (request.method !== 'GET' && response.ok) {
        await logger.info(category, `API request succeeded: ${request.method} ${request.url} - Status ${response.status}`, {
          userId,
          traceId,
        });
      }

      return response;
    } catch (error: any) {
      // Global Exception Handler - logs the complete stack trace and error type to the database
      await logger.error(category, `API request crashed: ${request.method} ${request.url} - ${error.message}`, {
        userId,
        traceId,
        error,
        context: {
          path: request.url,
          method: request.method,
          params,
        },
      });

      // Return a clean, user-friendly message without exposing sensitive details (e.g. database schema, token values)
      return NextResponse.json(
        {
          error: 'An unexpected error occurred. Please contact support.',
          traceId,
        },
        { status: 500 }
      );
    }
  };
}
