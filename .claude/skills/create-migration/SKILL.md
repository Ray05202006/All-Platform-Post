---
name: create-migration
description: Guide Prisma schema changes with proper migration and client generation workflow
disable-model-invocation: true
---

# Create Migration

Use this skill when modifying the database schema. Prisma requires a specific sequence to avoid runtime errors.

## Workflow

1. **Edit the schema** at `apps/api/prisma/schema.prisma`
   - Follow existing conventions: `@map("snake_case_table")`, `cuid()` IDs, `createdAt`/`updatedAt` timestamps
   - Use `@db.Text` for long strings, `Json` for flexible data
   - Add `@@index` for fields used in queries
   - Use `@@unique` for compound uniqueness constraints

2. **Run the migration** from the `apps/api/` directory:
   ```bash
   cd /home/ray0520/All-Platform-Post/apps/api && npx prisma migrate dev --name <migration_name>
   ```
   - Use descriptive snake_case names: `add_user_avatar`, `create_analytics_table`
   - This generates SQL, applies it, and regenerates the Prisma client

3. **Verify** the client was generated:
   ```bash
   cd /home/ray0520/All-Platform-Post/apps/api && npx prisma generate
   ```

4. **Update TypeScript types** if the shared package needs new types:
   - Check `packages/shared/` for any types that mirror the schema

## Existing Models

- **User** — core account (`users` table)
- **PlatformConnection** — OAuth tokens per platform (`platform_connections` table)
- **Post** — content with multi-platform targeting (`posts` table)
- **PublishLog** — publishing analytics (`publish_logs` table)

## Common Pitfalls

- Forgetting `prisma generate` after schema changes causes runtime `PrismaClientKnownRequestError`
- Adding required fields to existing tables needs a default value or a two-step migration
- Encrypted fields (like tokens in PlatformConnection) should use `@db.Text`
