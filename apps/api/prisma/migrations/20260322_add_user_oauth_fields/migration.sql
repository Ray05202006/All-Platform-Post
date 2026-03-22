-- AlterTable
ALTER TABLE "users" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "users" ADD COLUMN "provider" TEXT;
ALTER TABLE "users" ADD COLUMN "providerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_provider_providerId_key" ON "users"("provider", "providerId");
