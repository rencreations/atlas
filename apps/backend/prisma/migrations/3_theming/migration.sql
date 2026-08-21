-- Multi-theme support: a catalog theme id per user plus an explicit
-- light/dark/system mode column.
--
-- The legacy `theme` column stored the mode preference only; carry it
-- into `themeMode` before dropping it. `themeId` starts null for
-- everyone — the instance default (`appearance.defaultTheme`) applies.
ALTER TABLE "User" ADD COLUMN "themeId" TEXT;
ALTER TABLE "User" ADD COLUMN "themeMode" TEXT NOT NULL DEFAULT 'system';

UPDATE "User" SET "themeMode" = "theme" WHERE "theme" IN ('light', 'dark');

ALTER TABLE "User" DROP COLUMN "theme";
