CREATE TABLE "SystemInstrumentConfiguration" (
    "id" UUID NOT NULL,
    "kind" VARCHAR(80) NOT NULL,
    "questions" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "SystemInstrumentConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SystemInstrumentConfiguration_kind_key"
ON "SystemInstrumentConfiguration"("kind");
