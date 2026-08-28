INSERT INTO "SportsProgram" ("id", "name", "active", "createdAt", "updatedAt", "version")
VALUES ('00000000-0000-4000-8000-000000000101', 'Por definir', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
ON CONFLICT ("name") DO UPDATE SET "active" = true, "deletedAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Sport" ("id", "name", "active", "createdAt", "updatedAt", "version")
VALUES ('00000000-0000-4000-8000-000000000102', 'Por definir', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
ON CONFLICT ("name") DO UPDATE SET "active" = true, "deletedAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Category" ("id", "name", "active", "createdAt", "updatedAt", "version")
VALUES ('00000000-0000-4000-8000-000000000103', 'Por definir', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
ON CONFLICT ("name") DO UPDATE SET "active" = true, "deletedAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP;
