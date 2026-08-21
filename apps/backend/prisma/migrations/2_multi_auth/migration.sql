-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "ip" TEXT,
ADD COLUMN     "method" TEXT,
ADD COLUMN     "userAgent" TEXT,
ALTER COLUMN "accessToken" DROP NOT NULL;

