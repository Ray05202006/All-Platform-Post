---
name: platform-service
description: Scaffold a new social media platform integration following existing NestJS module patterns
disable-model-invocation: true
---

# Platform Service Scaffold

Use this skill when adding support for a new social media platform (e.g., LinkedIn, TikTok, Mastodon).

## Files to Create/Modify

### 1. OAuth Strategy
Create `apps/api/src/modules/auth/strategies/<platform>.strategy.ts`
- Extend Passport strategy for the platform
- Follow the pattern in `facebook.strategy.ts` or `twitter.strategy.ts`
- Handle token exchange and user profile extraction
- Store encrypted tokens via the auth service

### 2. Platform Service
Create `apps/api/src/modules/platform/services/<platform>.service.ts`
- Implement `publishPost(connection, content, mediaUrls?)` method
- Handle platform-specific API calls (post creation, media upload)
- Return result object: `{ postId, url, error }`
- Follow error handling patterns from existing services (facebook.service.ts)

### 3. Register in Platform Module
Edit `apps/api/src/modules/platform/platform.module.ts`
- Add new service to providers and exports

### 4. Register in Auth Module
Edit `apps/api/src/modules/auth/auth.module.ts`
- Add new strategy to providers
- Add OAuth callback route in `auth.controller.ts`

### 5. Update Auth Controller
Edit `apps/api/src/modules/auth/auth.controller.ts`
- Add `/auth/<platform>` and `/auth/<platform>/callback` endpoints

### 6. Add Platform to Text Splitter
Edit `packages/text-splitter/` if the platform has unique character limits
- Add platform config with char limit, CJK handling, URL/hashtag rules

### 7. Add to Shared Types
Update `packages/shared/` with the new platform enum value

### 8. Frontend Integration
- Add OAuth connect button in settings page
- Add platform toggle in post creation form
- Add platform icon/branding

## Environment Variables Needed
```
<PLATFORM>_CLIENT_ID=
<PLATFORM>_CLIENT_SECRET=
<PLATFORM>_CALLBACK_URL=http://localhost:3001/auth/<platform>/callback
```
Add to both `.env.example` and document in CLAUDE.md.

## Verification Checklist
- [ ] OAuth flow works (connect → callback → token stored)
- [ ] Token is encrypted with AES-256-GCM before storage
- [ ] Publishing works with text-only content
- [ ] Publishing works with media attachments
- [ ] Text splitter handles platform character limits
- [ ] Frontend shows connection status
- [ ] Error handling returns meaningful messages
