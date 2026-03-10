import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../api/src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';

// Singleton NestJS app for warm starts
let nestApp: any = null;
let expressApp: express.Express | null = null;

async function getNestApp() {
  if (nestApp) return { nestApp, expressApp };

  expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  nestApp = await NestFactory.create(AppModule, adapter, { logger: ['error', 'warn'] });

  nestApp.enableCors({
    origin: process.env.NEXT_PUBLIC_APP_URL || 'https://Ray05202006.github.io',
    credentials: true,
  });

  nestApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  nestApp.setGlobalPrefix('api');
  await nestApp.init();

  return { nestApp, expressApp };
}

// Main HTTP trigger — catches all routes
app.http('api', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '{*route}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const { expressApp } = await getNestApp();

    return new Promise((resolve) => {
      // Convert Azure Functions request to Express-compatible
      const req = Object.assign(Object.create(request as any), {
        url: '/' + (request.params['route'] || ''),
        method: request.method,
        headers: Object.fromEntries(request.headers),
        body: request.body,
        query: Object.fromEntries(new URL(request.url).searchParams),
      });

      const chunks: Buffer[] = [];
      const res = {
        statusCode: 200,
        headers: {} as Record<string, string>,
        status(code: number) { this.statusCode = code; return this; },
        setHeader(name: string, value: string) { this.headers[name] = value; return this; },
        getHeader(name: string) { return this.headers[name]; },
        end(body?: any) {
          resolve({
            status: this.statusCode,
            headers: this.headers,
            body: body || Buffer.concat(chunks).toString(),
          });
        },
        json(data: any) {
          this.headers['Content-Type'] = 'application/json';
          this.end(JSON.stringify(data));
        },
        send(data: any) { this.end(data); },
        write(chunk: Buffer | string) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        },
      };

      (expressApp as any)(req, res, (err: any) => {
        if (err) {
          resolve({ status: 500, body: 'Internal Server Error' });
        }
      });
    });
  },
});
