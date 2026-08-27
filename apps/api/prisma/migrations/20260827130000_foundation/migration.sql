CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED');
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'DENIED', 'ERROR');
CREATE TYPE "SyncReceiptStatus" AS ENUM ('ACCEPTED', 'REJECTED', 'CONFLICT');

CREATE TABLE "User" ("id" UUID NOT NULL, "email" VARCHAR(254) NOT NULL, "displayName" VARCHAR(160) NOT NULL, "passwordHash" TEXT NOT NULL, "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE', "lastLoginAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "createdBy" UUID, "updatedBy" UUID, "deletedAt" TIMESTAMP(3), "version" INTEGER NOT NULL DEFAULT 1, CONSTRAINT "User_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Role" ("id" UUID NOT NULL, "code" VARCHAR(60) NOT NULL, "name" VARCHAR(100) NOT NULL, "description" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "createdBy" UUID, "updatedBy" UUID, "deletedAt" TIMESTAMP(3), "version" INTEGER NOT NULL DEFAULT 1, CONSTRAINT "Role_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Permission" ("id" UUID NOT NULL, "code" VARCHAR(100) NOT NULL, "name" VARCHAR(120) NOT NULL, "description" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "createdBy" UUID, "updatedBy" UUID, "deletedAt" TIMESTAMP(3), "version" INTEGER NOT NULL DEFAULT 1, CONSTRAINT "Permission_pkey" PRIMARY KEY ("id"));
CREATE TABLE "UserRole" ("userId" UUID NOT NULL, "roleId" UUID NOT NULL, "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "assignedBy" UUID, CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId"));
CREATE TABLE "RolePermission" ("roleId" UUID NOT NULL, "permissionId" UUID NOT NULL, CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId"));
CREATE TABLE "RefreshToken" ("id" UUID NOT NULL, "userId" UUID NOT NULL, "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "userAgent" TEXT, "ipAddress" VARCHAR(64), CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AuditLog" ("id" UUID NOT NULL, "actorUserId" UUID, "action" VARCHAR(100) NOT NULL, "resourceType" VARCHAR(100), "resourceId" UUID, "outcome" "AuditOutcome" NOT NULL DEFAULT 'SUCCESS', "ipAddress" VARCHAR(64), "userAgent" TEXT, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"));
CREATE TABLE "SyncMutationReceipt" ("id" UUID NOT NULL, "mutationId" UUID NOT NULL, "userId" UUID NOT NULL, "entityType" VARCHAR(100) NOT NULL, "entityId" UUID NOT NULL, "operation" VARCHAR(20) NOT NULL, "status" "SyncReceiptStatus" NOT NULL, "serverVersion" INTEGER, "message" TEXT, "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "SyncMutationReceipt_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_status_deletedAt_idx" ON "User"("status", "deletedAt");
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");
CREATE INDEX "RefreshToken_userId_expiresAt_idx" ON "RefreshToken"("userId", "expiresAt");
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");
CREATE UNIQUE INDEX "SyncMutationReceipt_mutationId_key" ON "SyncMutationReceipt"("mutationId");
CREATE INDEX "SyncMutationReceipt_userId_receivedAt_idx" ON "SyncMutationReceipt"("userId", "receivedAt");

ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SyncMutationReceipt" ADD CONSTRAINT "SyncMutationReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
