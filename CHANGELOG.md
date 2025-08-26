# Changelog

All notable changes to MGM Atlas — the web app and the API — are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Pre-1.0, minor versions may contain breaking changes.

## [Unreleased]

- **docs:** added guard for LiveKit room participant limits

- **web:** added guard for email template localization

- **repo:** improved kanban drag reorder latency handling

- **auth:** fixed edge case around gallery fractional reordering

- **api:** added guard for n8n webhook retry budget

- **voice:** added guard for session idle timeout policy

- **search:** pruned dead paths in web push subscription pruning

- **notifications:** improved kanban drag reorder latency handling

- **ci:** hardened task dependency cycle detection

- **api:** improved web push subscription pruning handling

- **repo:** pruned dead paths in rate limit burst handling

- **repo:** fixed edge case around sticker pack moderation flow

- **voice:** hardened Postgres full-text search tuning

- **media:** hardened attachment deduplication

- **auth:** improved Gantt timeline timezone offsets handling

- **voice:** fixed edge case around CDN cache headers for media

- **ci:** added guard for project discovery ranking

- **ci:** improved monorepo build cache misses handling

- **repo:** tuned defaults for link preview cache eviction

- **chat:** tuned defaults for voice recording retention sweep

- **chat:** documented Yjs snapshot debounce window

- **ci:** pruned dead paths in dashboard loading skeletons

## [0.1.1] (2026-05-30)

This release is the first one cut from the monorepo: the frontend and backend
repositories were merged into this single workspace and now release together.

### Features (web app)

- **feature-flags:** `useFeatureFlag` hook + admin toggle UI + maintenance banner (Phase 5, frontend)
- **security:** security response headers on every route + removal of the dead `next-auth` dependency (Phase 11, frontend)

### Features (API)

- **feature-flags:** DB-backed runtime flags + admin CRUD + public eval (Phase 5, backend)
- **observability:** Prometheus metrics + Sentry/GlitchTip SDK, ships dark (Phase 7, backend)

### Bug Fixes (API)

- **auth:** verify Keycloak tokens on login instead of trusting client-supplied identity claims (P0)

## [0.1.0] - 2026-05-29

First tracked release — everything currently powering [atlas.labmgm.org](https://atlas.labmgm.org).

### Added — Web app

- **Discovery & portfolio** — Netflix-style dashboard with featured hero and curated rows; browse with search, tag filters, phases, and recruiting status; project detail pages with media heroes and team rosters; 5-step creation wizard with drag-and-drop S3 gallery uploads.
- **Auth** — Keycloak SSO hand-off with return-to-URL deep-link redirect; client-side session via the backend's opaque session ID.
- **Chat UI** — workspace-global `#general` + per-project channels; replies, reactions, pins, forwarding, GIF picker, stickers, emoji picker, link previews, file attachments, typing indicators, unread badges, full-text search; Tiptap-powered composer.
- **PMO** *(behind `NEXT_PUBLIC_PMO_ENABLED`)* — task lists with custom statuses; drag-and-drop kanban; Gantt timeline; task detail modal route; collaborative notes (BlockNote + Yjs) and whiteboards (Excalidraw + Yjs) with live presence; file manager; website embeds; global <kbd>Cmd</kbd>+<kbd>Z</kbd> server-backed undo; revision history drawer.
- **Voice UI** *(behind `NEXT_PUBLIC_VOICE_ENABLED`)* — voice/video rooms with screen share up to 1080p60; workspace Voice Lobby; push-to-talk and voice-activity modes; per-participant volume; deafen; soundboard; stage channels with hand-raise; moderation menus; recordings; persistent device preferences and rebindable shortcuts.
- **Notifications** — header bell with live unread count; paginated inbox; per-type preference panel; PWA service worker with web push and inline quick-reply.
- **Personal space** — `/me` dashboard (managing / contributing / pending / saved) and bookmarks.
- **Admin console** — tag manager, featured projects, collaboration roles, user management, sticker packs.
- **Design system** — locked MGM identity: brand tokens, type ramp, radii, motion tokens, geometric pattern components, Lucide stroke icons.

### Added — API

- **Portfolio & discovery** — project CRUD with slugs, phases, visibility, tech stacks, internal links; Netflix-style discovery and featured curation; bookmarks and a personal dashboard.
- **Auth & sessions** — Keycloak OIDC login exchange (`POST /auth/login`) with DB-backed opaque sessions; bootstrap admin promotion via `BOOTSTRAP_ADMIN_EMAIL`; project role guards and admin gates.
- **Media** — S3 presigned direct uploads with MIME/size allowlists, thumbnail ordering, and fractional-index reordering.
- **Contributions & team** — request-to-join workflow with approval notes, invites, role management against 12 seeded collaboration roles.
- **Chat** — project channels + workspace-global channels, reactions, pins, forwarding, 24-hour edit window, soft deletes, attachments via S3, GIF search (Tenor/Giphy), admin sticker packs, cached link previews, Postgres full-text search, @mention notifications, Socket.IO `/chat` gateway with optional Redis adapter.
- **PMO** *(feature-flagged via `PMO_ENABLED`)* — task lists with custom statuses, priorities, story points, dependencies, fractional kanban ordering, auto-numbered task keys; comments with mentions; hierarchical files; collaborative notes and whiteboards over Yjs with snapshot persistence, revision history + hourly pruning; server-backed durable undo/redo; hourly due-date scanner.
- **Voice** *(feature-flagged via `VOICE_ENABLED`)* — LiveKit-backed channels (standard + stage with hand-raise), token minting, participant presence, moderation, soundboard clips, persisted user preferences, composite egress recordings to S3 with retention.
- **Notifications** — in-app inbox, unread counts, per-type preferences, web push (VAPID) with inline quick reply, `/notifications` realtime gateway.
- **Integrations** — HMAC-signed webhooks to n8n with delivery log and retries; LiveKit egress callbacks; Terminus health endpoint (DB + S3 probes).
- **Operations** — global throttling, Helmet, strict validation, env validation at boot, multi-stage Docker image that auto-runs `prisma migrate deploy`, seeds for 30 tags and 12 collaboration roles.

[Unreleased]: https://github.com/shirasakaren/rement/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/shirasakaren/rement/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/shirasakaren/rement/releases/tag/v0.1.0
