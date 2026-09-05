-- Per-user chat mute: workspace-global (one flag per user) and
-- per-project (one flag per membership row). Both default false so
-- existing users/members are unaffected.
ALTER TABLE "User" ADD COLUMN "workspaceChatMuted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProjectMember" ADD COLUMN "chatMuted" BOOLEAN NOT NULL DEFAULT false;
