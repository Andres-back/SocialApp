CREATE TABLE "AiRiskReport" (
    "id" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "sourceParticipantId" UUID,
    "riskLevel" VARCHAR(20) NOT NULL,
    "summary" TEXT NOT NULL,
    "riskFactors" JSONB NOT NULL,
    "protectiveFactors" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "urgentActions" JSONB NOT NULL,
    "limitations" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "model" VARCHAR(120) NOT NULL,
    "promptVersion" INTEGER NOT NULL DEFAULT 1,
    "sourceHash" VARCHAR(64) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "AiRiskReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiRiskReport_athleteId_generatedAt_idx" ON "AiRiskReport"("athleteId", "generatedAt");
CREATE INDEX "AiRiskReport_sourceParticipantId_idx" ON "AiRiskReport"("sourceParticipantId");
CREATE INDEX "AiRiskReport_deletedAt_idx" ON "AiRiskReport"("deletedAt");
ALTER TABLE "AiRiskReport" ADD CONSTRAINT "AiRiskReport_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiRiskReport" ADD CONSTRAINT "AiRiskReport_sourceParticipantId_fkey" FOREIGN KEY ("sourceParticipantId") REFERENCES "CampaignParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
