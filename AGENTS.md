# Repository Guidelines

## Project Structure & Module Organization

This repository contains the All-Platform-Post application. Main source lives in `src/`: `app/` contains Next.js pages and API routes, `components/` contains shared React components, and `lib/` contains platform clients, auth, storage, publishing, encryption, and text-splitting utilities. Tests are colocated in `__tests__/`, such as `src/lib/__tests__/splitter.test.ts`. Prisma schema lives in `prisma/schema.prisma`; the Azure timer trigger is in `timer-function/`.

## Build, Test, and Development Commands

Install dependencies with `pnpm install`.

- `pnpm dev` starts the Next.js dev server.
- `pnpm build` builds the Next.js app.
- `pnpm start` runs the built app.
- `pnpm lint` runs the Next.js ESLint checks.
- `pnpm test` runs Vitest once.
- `pnpm test:watch` starts Vitest watch mode.
- `pnpm test:cov` runs coverage.
- `npx prisma db push`, `npx prisma generate`, and `npx prisma studio` run Prisma commands.

## Coding Style & Naming Conventions

Use TypeScript, React function components, and Next.js App Router conventions. Keep route handlers in `route.ts`, pages in `page.tsx`, and layouts in `layout.tsx`. Use 2-space indentation and single-purpose modules. Platform clients belong in `src/lib/platforms/` with lowercase filenames matching the platform, for example `twitter.ts`. Prefer Tailwind utilities for styling and keep global rules in `src/app/globals.css`.

## Testing Guidelines

Vitest is the test runner. Add tests beside the implementation in `__tests__/` and name files `*.test.ts` or `*.test.tsx`. Focus coverage on platform behavior, API route decisions, encryption, scheduling, and text splitting. Run `pnpm test` before opening a PR; use `pnpm test:cov` for shared library or publishing changes.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit-style messages such as `feat(twitter): ...`, `fix(api): ...`, `debug(twitter): ...`, and `chore: ...`. Keep commit subjects imperative, scoped when useful, and concise.

PRs should include a short description, linked issue when available, test results, and screenshots for dashboard or login UI changes. Note any required environment variables, Prisma migrations, Azure configuration changes, or OAuth callback changes.

## Security & Configuration Tips

Do not commit real secrets. Use `.env.example` as the template and keep local values in `.env`. Regenerate Prisma client after schema edits. Treat OAuth tokens, `ENCRYPTION_KEY`, `NEXTAUTH_SECRET`, storage connection strings, and `SCHEDULER_API_KEY` as sensitive.
