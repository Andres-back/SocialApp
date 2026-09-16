CREATE TABLE "FeatureVisibility" (
    "key" VARCHAR(80) NOT NULL,
    "enabledForSocialWorker" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "FeatureVisibility_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "CampaignAiReport" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "generalResults" TEXT NOT NULL,
    "observations" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "limitations" TEXT NOT NULL,
    "model" VARCHAR(120) NOT NULL,
    "promptVersion" INTEGER NOT NULL DEFAULT 1,
    "sourceHash" VARCHAR(64) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "CampaignAiReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CampaignAiReport_campaignId_generatedAt_idx" ON "CampaignAiReport"("campaignId", "generatedAt");
CREATE INDEX "CampaignAiReport_deletedAt_idx" ON "CampaignAiReport"("deletedAt");
ALTER TABLE "CampaignAiReport" ADD CONSTRAINT "CampaignAiReport_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ScreeningCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "FeatureVisibility" ("key", "enabledForSocialWorker", "updatedAt") VALUES
('athletes', true, CURRENT_TIMESTAMP),
('social-work', true, CURRENT_TIMESTAMP),
('campaigns', true, CURRENT_TIMESTAMP),
('instruments', true, CURRENT_TIMESTAMP),
('reports', true, CURRENT_TIMESTAMP),
('catalogs', true, CURRENT_TIMESTAMP),
('sync', true, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
