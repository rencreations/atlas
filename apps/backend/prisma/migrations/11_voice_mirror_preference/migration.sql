-- Mirror-my-camera preference, on by default (matches the existing
-- unconditional mirroring behavior it replaces).
ALTER TABLE "VoiceUserPreferences" ADD COLUMN "mirrorSelfView" BOOLEAN NOT NULL DEFAULT true;
