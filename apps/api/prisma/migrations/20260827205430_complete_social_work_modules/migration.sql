-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AlertLevel" AS ENUM ('GREEN', 'YELLOW', 'RED');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED', 'REFERRED');

-- CreateEnum
CREATE TYPE "FollowUpPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ScreeningParticipantStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ObservationVisibility" AS ENUM ('SOCIAL_WORK_ONLY', 'AUTHORIZED_TEAM', 'INSTITUTIONAL_SUMMARY');

-- CreateTable
CREATE TABLE "SocioeconomicAssessment" (
    "id" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "instrumentVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "housingType" VARCHAR(40) NOT NULL,
    "housingTenure" VARCHAR(40) NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "householdSize" INTEGER NOT NULL,
    "zone" "Zone" NOT NULL,
    "utilities" TEXT[],
    "exclusiveKitchen" BOOLEAN NOT NULL,
    "transportMode" VARCHAR(60) NOT NULL,
    "travelTime" VARCHAR(40) NOT NULL,
    "transportDifficulty" VARCHAR(40) NOT NULL,
    "foodReduction" VARCHAR(40) NOT NULL,
    "foodBeforeTraining" VARCHAR(40) NOT NULL,
    "incomeRange" VARCHAR(60) NOT NULL,
    "dependents" INTEGER NOT NULL,
    "informedObservation" TEXT,
    "professionalAssessment" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SocioeconomicAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "sourceType" VARCHAR(80) NOT NULL,
    "sourceId" UUID,
    "level" "AlertLevel" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',
    "informedData" TEXT,
    "automaticIndicator" TEXT NOT NULL,
    "professionalAssessment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpCase" (
    "id" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "motive" TEXT NOT NULL,
    "priority" "FollowUpPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "FollowUpStatus" NOT NULL DEFAULT 'OPEN',
    "responsible" VARCHAR(160) NOT NULL,
    "nextAction" TEXT,
    "estimatedDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "FollowUpCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpEntry" (
    "id" UUID NOT NULL,
    "followUpCaseId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "situation" TEXT NOT NULL,
    "actions" TEXT NOT NULL,
    "agreements" TEXT NOT NULL,
    "responsible" VARCHAR(160) NOT NULL,
    "nextAction" TEXT,
    "estimatedDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "FollowUpEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalObservation" (
    "id" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "type" VARCHAR(80) NOT NULL,
    "observation" TEXT NOT NULL,
    "visibility" "ObservationVisibility" NOT NULL DEFAULT 'SOCIAL_WORK_ONLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ProfessionalObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Genogram" (
    "id" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "nodes" JSONB NOT NULL,
    "edges" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Genogram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ecomap" (
    "id" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "nodes" JSONB NOT NULL,
    "edges" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Ecomap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningInstrument" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "ageGroup" VARCHAR(80),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ScreeningInstrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningQuestion" (
    "id" UUID NOT NULL,
    "instrumentId" UUID NOT NULL,
    "dimension" VARCHAR(100) NOT NULL,
    "prompt" TEXT NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "options" JSONB NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ScreeningQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningCampaign" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "date" DATE NOT NULL,
    "place" VARCHAR(180) NOT NULL,
    "sportsProgramId" UUID,
    "sportId" UUID,
    "instrumentId" UUID NOT NULL,
    "professionalName" VARCHAR(160) NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ScreeningCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignParticipant" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "status" "ScreeningParticipantStatus" NOT NULL DEFAULT 'PENDING',
    "responses" JSONB NOT NULL DEFAULT '{}',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CampaignParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigurableRule" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "source" VARCHAR(80) NOT NULL,
    "field" VARCHAR(100) NOT NULL,
    "operator" VARCHAR(40) NOT NULL,
    "expectedValue" TEXT NOT NULL,
    "indicator" TEXT NOT NULL,
    "level" "AlertLevel" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ConfigurableRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocioeconomicAssessment_athleteId_updatedAt_idx" ON "SocioeconomicAssessment"("athleteId", "updatedAt");

-- CreateIndex
CREATE INDEX "SocioeconomicAssessment_status_deletedAt_idx" ON "SocioeconomicAssessment"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "Alert_athleteId_status_level_idx" ON "Alert"("athleteId", "status", "level");

-- CreateIndex
CREATE INDEX "Alert_deletedAt_idx" ON "Alert"("deletedAt");

-- CreateIndex
CREATE INDEX "FollowUpCase_athleteId_status_priority_idx" ON "FollowUpCase"("athleteId", "status", "priority");

-- CreateIndex
CREATE INDEX "FollowUpCase_estimatedDate_idx" ON "FollowUpCase"("estimatedDate");

-- CreateIndex
CREATE INDEX "FollowUpEntry_followUpCaseId_date_idx" ON "FollowUpEntry"("followUpCaseId", "date");

-- CreateIndex
CREATE INDEX "ProfessionalObservation_athleteId_date_idx" ON "ProfessionalObservation"("athleteId", "date");

-- CreateIndex
CREATE INDEX "Genogram_athleteId_updatedAt_idx" ON "Genogram"("athleteId", "updatedAt");

-- CreateIndex
CREATE INDEX "Ecomap_athleteId_updatedAt_idx" ON "Ecomap"("athleteId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScreeningInstrument_name_version_key" ON "ScreeningInstrument"("name", "version");

-- CreateIndex
CREATE INDEX "ScreeningQuestion_instrumentId_position_idx" ON "ScreeningQuestion"("instrumentId", "position");

-- CreateIndex
CREATE INDEX "ScreeningCampaign_date_status_idx" ON "ScreeningCampaign"("date", "status");

-- CreateIndex
CREATE INDEX "CampaignParticipant_athleteId_status_idx" ON "CampaignParticipant"("athleteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignParticipant_campaignId_athleteId_key" ON "CampaignParticipant"("campaignId", "athleteId");

-- CreateIndex
CREATE INDEX "ConfigurableRule_source_active_idx" ON "ConfigurableRule"("source", "active");

-- AddForeignKey
ALTER TABLE "SocioeconomicAssessment" ADD CONSTRAINT "SocioeconomicAssessment_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpCase" ADD CONSTRAINT "FollowUpCase_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpEntry" ADD CONSTRAINT "FollowUpEntry_followUpCaseId_fkey" FOREIGN KEY ("followUpCaseId") REFERENCES "FollowUpCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalObservation" ADD CONSTRAINT "ProfessionalObservation_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Genogram" ADD CONSTRAINT "Genogram_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ecomap" ADD CONSTRAINT "Ecomap_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningQuestion" ADD CONSTRAINT "ScreeningQuestion_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "ScreeningInstrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningCampaign" ADD CONSTRAINT "ScreeningCampaign_sportsProgramId_fkey" FOREIGN KEY ("sportsProgramId") REFERENCES "SportsProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningCampaign" ADD CONSTRAINT "ScreeningCampaign_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningCampaign" ADD CONSTRAINT "ScreeningCampaign_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "ScreeningInstrument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignParticipant" ADD CONSTRAINT "CampaignParticipant_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ScreeningCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignParticipant" ADD CONSTRAINT "CampaignParticipant_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
