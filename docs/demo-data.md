# Demo data

Atlas includes a deterministic, high-volume demo seed for feature testing and product demos.

## Run it

Apply migrations, then seed the isolated demo namespace:

```bash
pnpm db:migrate
pnpm db:seed:demo
```

The command accepts local PostgreSQL hosts by default. To target an intentionally isolated remote demo database, set `ALLOW_DEMO_SEED_NON_LOCAL=true` explicitly.

## What it creates

- 500 verified users with `@creations.ren` email addresses and local password identities
- 60 richly described projects, 180 cover/gallery visuals, tags, members, contribution requests, invites, bookmarks, and featured projects
- More than 17,000 project/workspace/voice-thread chat messages with replies, forwards, edits, attachments, reactions, pins, unread state, link previews, and stickers
- 1,800 PMO tasks plus assignees, dependencies, 5,400 comments, activity, attachments, lists, statuses, and tabs
- Project files, notes, revision history, Yjs snapshots, whiteboards, and undo history
- Voice channels, stage rooms, participant history, recordings, preferences, and soundboard clips
- 6,000 notifications and webhook delivery history

The demo seed uses stable UUIDs so every API mutation path can be tested. Rerunning it removes and recreates only records identified by the exact generated actor IDs, `demo-` project slugs, demo creator relationships, and deterministic document keys, preserving unrelated local data. It refuses to remove a matching demo email if the account is not one of the expected deterministic actors.

Ephemeral or externally actionable records—real push endpoints, active OTP codes, magic-link tokens, and godmode credentials—are intentionally excluded.

Important login actors and their shared local-only password are stored in the repository root at `.demo-actors.local.md`. That file is gitignored.
