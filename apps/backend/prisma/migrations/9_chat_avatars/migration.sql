-- Discord-style server avatars for the chat rail. Keyed rows: 'workspace'
-- for the workspace server, 'project:<id>' per project. Null fields mean
-- "use the derived default" (random emoji + background for the key).
CREATE TABLE "ChatAvatar" (
    "key" TEXT NOT NULL,
    "emoji" TEXT,
    "color" TEXT,
    "imageUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "ChatAvatar_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "ChatAvatar" ADD CONSTRAINT "ChatAvatar_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
