# Deployment Guide

This guide helps you deploy All-Platform-Post to various hosting platforms.

## Prerequisites

Before deploying, ensure you have:

1. **Required Environment Variables**:
   - `ENCRYPTION_KEY` - 64-character hex string (generate with `pnpm generate-keys`)
   - `JWT_SECRET` - 64-character hex string (generate with `pnpm generate-keys`)
   - `DATABASE_URL` - PostgreSQL connection string
   - `REDIS_HOST` and `REDIS_PORT` - Redis connection details

2. **Platform API Credentials** (if using OAuth):
   - Facebook App ID and Secret
   - Twitter/X Client ID and Secret
   - Twitter/X API Key and Secret

## Generating Security Keys

Run this command to generate secure keys:

```bash
pnpm generate-keys
```

Or manually:

```bash
openssl rand -hex 32  # For ENCRYPTION_KEY
openssl rand -hex 32  # For JWT_SECRET
```

**Important**: Each key must be exactly 64 hexadecimal characters (32 bytes).

## Zeabur Deployment

### Step 1: Prepare Your Repository

Ensure your code is pushed to GitHub.

### Step 2: Create Services

1. Go to [Zeabur Dashboard](https://zeabur.com)
2. Create a new project
3. Add the following services:
   - PostgreSQL database
   - Redis
   - Your API (from GitHub repository)
   - Your Web app (from GitHub repository)

### Step 3: Configure Environment Variables

In your API service settings, add these environment variables:

**Required Variables**:
```
ENCRYPTION_KEY=<your-64-char-hex-key>
JWT_SECRET=<your-64-char-hex-key>
DATABASE_URL=${POSTGRES_CONNECTION_STRING}
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
```

**Application URLs**:
```
NEXT_PUBLIC_APP_URL=https://your-web-app.zeabur.app
API_URL=https://your-api.zeabur.app
```

**Platform API Keys** (optional, configure when needed):
```
FACEBOOK_APP_ID=<your-facebook-app-id>
FACEBOOK_APP_SECRET=<your-facebook-app-secret>
TWITTER_CLIENT_ID=<your-twitter-client-id>
TWITTER_CLIENT_SECRET=<your-twitter-client-secret>
TWITTER_API_KEY=<your-twitter-api-key>
TWITTER_API_SECRET=<your-twitter-api-secret>
```

### Step 4: Deploy

Push your code to GitHub. Zeabur will automatically build and deploy.

### Step 5: Run Database Migrations

After first deployment, run migrations:

```bash
# Connect to your API service terminal in Zeabur
npx prisma migrate deploy
```

## Vercel Deployment (Web App Only)

Vercel is suitable for the Next.js web app. You'll need to deploy the API separately.

### Step 1: Install Vercel CLI

```bash
npm i -g vercel
```

### Step 2: Deploy Web App

```bash
cd apps/web
vercel
```

### Step 3: Configure Environment Variables

In Vercel dashboard, add:

```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
API_URL=https://your-api-url.com
```

## Railway Deployment

### Step 1: Create Services

1. Go to [Railway](https://railway.app)
2. Create a new project
3. Add PostgreSQL and Redis from the marketplace
4. Deploy your API from GitHub

### Step 2: Configure Environment Variables

Similar to Zeabur, add all required environment variables in the Railway dashboard.

### Step 3: Deploy

Railway will automatically deploy on git push.

## Render Deployment

### Step 1: Create Web Service

1. Go to [Render Dashboard](https://render.com)
2. Create a new Web Service from your GitHub repository
3. Select the API directory

### Step 2: Add Database and Redis

1. Create a PostgreSQL database
2. Create a Redis instance
3. Link them to your web service

### Step 3: Configure Environment Variables

Add all required environment variables in the Render dashboard.

## Docker Deployment (Self-Hosted)

### Option 1: Using Docker Compose

```bash
# Clone the repository
git clone https://github.com/yourusername/All-Platform-Post.git
cd All-Platform-Post

# Generate keys
pnpm generate-keys

# Create .env file with all required variables
cp .env.example .env
nano .env

# Start services
docker-compose up -d

# Run migrations
docker exec -it <api-container> npx prisma migrate deploy
```

### Option 2: Build Custom Docker Images

Create a `Dockerfile` for the API:

```dockerfile
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/text-splitter/package.json ./packages/text-splitter/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma Client
RUN cd apps/api && npx prisma generate

# Build
RUN pnpm build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built files
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/apps/api/prisma ./prisma

# Expose port
EXPOSE 3001

# Start application
CMD ["node", "dist/main.js"]
```

## Troubleshooting

### ENCRYPTION_KEY Error

**Error**: `ENCRYPTION_KEY must be a 64-character hex string`

**Solution**:
1. Generate a key: `pnpm generate-keys`
2. Ensure the key is exactly 64 hexadecimal characters
3. Set it in your deployment platform's environment variables
4. Redeploy the application

### Database Connection Error

**Error**: Cannot connect to database

**Solution**:
1. Check `DATABASE_URL` format: `postgresql://user:password@host:port/database`
2. Ensure the database service is running
3. Verify network access between services
4. Check database credentials

### Redis Connection Error

**Error**: Cannot connect to Redis

**Solution**:
1. Verify `REDIS_HOST` and `REDIS_PORT` are correct
2. Ensure Redis service is running
3. Check network access between services

### Migration Errors

**Error**: Prisma migration failed

**Solution**:
1. Run migrations manually: `npx prisma migrate deploy`
2. Check database permissions
3. Verify `DATABASE_URL` is correct
4. Check migration history: `npx prisma migrate status`

## Security Best Practices

1. **Never commit secrets**: Don't commit `.env` files or secrets to version control
2. **Use strong keys**: Always generate keys with `pnpm generate-keys` or `openssl rand -hex 32`
3. **Separate keys per environment**: Use different keys for development, staging, and production
4. **Rotate keys regularly**: Update `ENCRYPTION_KEY` and `JWT_SECRET` periodically
5. **Use environment variables**: Store all secrets as environment variables, not in code
6. **Enable HTTPS**: Always use HTTPS in production
7. **Restrict CORS**: Configure CORS to only allow your frontend domain

## Monitoring and Maintenance

### Health Checks

Implement health check endpoints:

```
GET /api/health - Application health
GET /api/health/db - Database connection
GET /api/health/redis - Redis connection
```

### Logging

- Use structured logging in production
- Monitor error logs for issues
- Set up alerts for critical errors

### Backups

- Regular database backups (daily recommended)
- Test backup restoration procedures
- Store backups securely off-site

## Getting Help

If you encounter issues:

1. Check the [DEVELOPMENT.md](./DEVELOPMENT.md) for common problems
2. Review the [README.md](./README.md) FAQ section
3. Open an issue on GitHub with:
   - Error message (redact any secrets)
   - Deployment platform
   - Steps to reproduce
   - Environment details

## Next Steps

After successful deployment:

1. Configure platform OAuth apps (Facebook, Twitter)
2. Test social media connections
3. Create your first post
4. Set up monitoring and alerts
5. Configure backups

Enjoy your self-hosted social media posting system! 🚀
