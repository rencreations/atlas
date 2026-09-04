-- Restores two raw-SQL constructs that 1_godmode_selfhost accidentally
-- dropped during the monorepo consolidation (they're invisible to
-- schema.prisma, so a schema diff read their absence as intentional).
-- ChatSearchService's raw query against "searchVector" has been failing
-- with Prisma error P2010 ever since; this is a functional fix, not
-- just a performance one.

ALTER TABLE "ChatMessage"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce("markdown", ''))) STORED;

CREATE INDEX "ChatMessage_searchVector_idx"
  ON "ChatMessage" USING GIN ("searchVector");

CREATE INDEX "Sticker_keywords_idx" ON "Sticker" USING GIN ("keywords");
