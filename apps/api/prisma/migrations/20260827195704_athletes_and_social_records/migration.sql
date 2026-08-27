-- CreateEnum
CREATE TYPE "AthleteStatus" AS ENUM ('ACTIVE', 'RETIRED', 'SUSPENDED', 'OTHER');

-- CreateEnum
CREATE TYPE "Zone" AS ENUM ('URBAN', 'RURAL');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('FEMALE', 'MALE', 'INTERSEX', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CIVIL_REGISTRY', 'IDENTITY_CARD', 'PASSPORT', 'PERMIT', 'NONE', 'OTHER');

-- CreateEnum
CREATE TYPE "SocialRecordStatus" AS ENUM ('DRAFT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RelationshipQuality" AS ENUM ('CLOSE', 'ADEQUATE', 'DISTANT', 'CONFLICTIVE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "FamilyRelationshipRating" AS ENUM ('VERY_GOOD', 'GOOD', 'REGULAR', 'DIFFICULT');

-- CreateEnum
CREATE TYPE "PrimaryCaregiver" AS ENUM ('MOTHER', 'FATHER', 'BOTH', 'GRANDPARENT', 'OTHER_RELATIVE', 'OTHER');

-- CreateTable
CREATE TABLE "SportsProgram" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SportsProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sport" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coach" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Coach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Athlete" (
    "id" UUID NOT NULL,
    "internalCode" VARCHAR(40) NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "documentNumber" VARCHAR(40),
    "firstNames" VARCHAR(120) NOT NULL,
    "lastNames" VARCHAR(120) NOT NULL,
    "birthDate" DATE NOT NULL,
    "sex" "Sex" NOT NULL,
    "municipality" VARCHAR(120) NOT NULL,
    "zone" "Zone" NOT NULL,
    "sportsProgramId" UUID NOT NULL,
    "sportId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "coachId" UUID,
    "joinedAt" DATE NOT NULL,
    "status" "AthleteStatus" NOT NULL DEFAULT 'ACTIVE',
    "schoolName" VARCHAR(180),
    "schoolGrade" VARCHAR(40),
    "schoolShift" VARCHAR(40),
    "currentlyEnrolled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Athlete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guardian" (
    "id" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "relationship" VARCHAR(80) NOT NULL,
    "phone" VARCHAR(40) NOT NULL,
    "email" VARCHAR(254),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Guardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialRecord" (
    "id" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "instrumentVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "SocialRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "livingWith" TEXT[],
    "primaryCaregiver" "PrimaryCaregiver" NOT NULL,
    "otherCaregiver" VARCHAR(120),
    "familyRelationships" "FamilyRelationshipRating" NOT NULL,
    "supportNetworks" TEXT[],
    "otherSupportNetwork" VARCHAR(160),
    "professionalObservation" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SocialRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdMember" (
    "id" UUID NOT NULL,
    "socialRecordId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "relationship" VARCHAR(80) NOT NULL,
    "approximateAge" INTEGER,
    "livesWithAthlete" BOOLEAN NOT NULL DEFAULT true,
    "occupation" VARCHAR(120),
    "relationshipQuality" "RelationshipQuality" NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "HouseholdMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SportsProgram_name_key" ON "SportsProgram"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Sport_name_key" ON "Sport"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Athlete_internalCode_key" ON "Athlete"("internalCode");

-- CreateIndex
CREATE INDEX "Athlete_firstNames_lastNames_idx" ON "Athlete"("firstNames", "lastNames");

-- CreateIndex
CREATE INDEX "Athlete_sportsProgramId_sportId_status_idx" ON "Athlete"("sportsProgramId", "sportId", "status");

-- CreateIndex
CREATE INDEX "Athlete_deletedAt_idx" ON "Athlete"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Athlete_documentType_documentNumber_key" ON "Athlete"("documentType", "documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Guardian_athleteId_key" ON "Guardian"("athleteId");

-- CreateIndex
CREATE INDEX "SocialRecord_athleteId_updatedAt_idx" ON "SocialRecord"("athleteId", "updatedAt");

-- CreateIndex
CREATE INDEX "SocialRecord_status_deletedAt_idx" ON "SocialRecord"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "HouseholdMember_socialRecordId_deletedAt_idx" ON "HouseholdMember"("socialRecordId", "deletedAt");

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_sportsProgramId_fkey" FOREIGN KEY ("sportsProgramId") REFERENCES "SportsProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guardian" ADD CONSTRAINT "Guardian_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialRecord" ADD CONSTRAINT "SocialRecord_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_socialRecordId_fkey" FOREIGN KEY ("socialRecordId") REFERENCES "SocialRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
