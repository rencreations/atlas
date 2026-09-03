-- Background storage-provider migrations (local -> S3, S3 -> R2, ...).
-- The active provider only flips once status reaches COMPLETED.
CREATE TABLE "StorageMigration" (
    "id" TEXT NOT NULL,
    "fromProvider" TEXT NOT NULL,
    "toProvider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "objectCount" INTEGER NOT NULL DEFAULT 0,
    "transferredCount" INTEGER NOT NULL DEFAULT 0,
    "totalBytes" BIGINT NOT NULL DEFAULT 0,
    "transferredBytes" BIGINT NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "StorageMigration_pkey" PRIMARY KEY ("id")
);
