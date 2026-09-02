-- Account moderation: superadmins can suspend a user (with a message
-- shown at sign-in) and later unsuspend them. Existing sessions are
-- deleted at suspend time, so the suspension takes effect immediately.
ALTER TABLE "User" ADD COLUMN "suspendedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "suspendedReason" TEXT;
ALTER TABLE "User" ADD COLUMN "suspendedById" TEXT;
