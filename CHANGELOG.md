# Changelog

All notable changes to Atlas — the web app and the API — are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Pre-1.0, minor versions may contain breaking changes.

## [0.1.3](https://github.com/rencreations/atlas/compare/v0.1.2...v0.1.3) (2026-08-21)


### Features

* 'For me' personal work overview ([614dd40](https://github.com/rencreations/atlas/commit/614dd406b6c4fb80d845359ab9951bb6ff37492b))
* **api:** godmode control plane, dynamic settings, and relaxed boot requirements ([14e9aaa](https://github.com/rencreations/atlas/commit/14e9aaa815a66fdaf8616c3a761297819c1ed02f))
* **api:** pluggable authentication — local, OTP, magic link, OAuth, OIDC, SAML ([966ee49](https://github.com/rencreations/atlas/commit/966ee499c13460fa718af7631f6fcd5e266dc0e7))
* **api:** role-based IAM — permission guard, dynamic admins, admin provisioning ([6b57347](https://github.com/rencreations/atlas/commit/6b573476040726b501af3a4e22dddb7d6d9983ac))
* **api:** WebAuthn passkeys as a godmode second factor ([989a676](https://github.com/rencreations/atlas/commit/989a6760aa3cdbc8ce52dd024aa87ecde88a8d68))
* **themes:** 24-theme token registry, generated CSS, and WCAG contrast gate ([204c5eb](https://github.com/rencreations/atlas/commit/204c5eb64579c47d1f1db337d5fb9833352bcbcd))
* **themes:** per-user theme + instance default via godmode ([289c36b](https://github.com/rencreations/atlas/commit/289c36bdb701d3d7c755725a77e5d1d6c010388c))
* **themes:** single primary color for all branding + minimal animated footer ([809492c](https://github.com/rencreations/atlas/commit/809492c5ff293431e253ddf5a7b0fe8343955f1f))
* **web:** godmode control-plane dashboard at /godmode ([aac62de](https://github.com/rencreations/atlas/commit/aac62de43a7a2a2a250c50dd440aee1bdfddd26f))
* **web:** multi-auth login surface and account flow pages ([ce18685](https://github.com/rencreations/atlas/commit/ce186857bcf6251e62b4d636172b2321d4cd3a62))
* **web:** user profile & settings, theme support, legal pages ([b84d934](https://github.com/rencreations/atlas/commit/b84d9344dbd7896965cf68ace8497edcca15d6ed))


### Bug Fixes

* **api:** harden the avatar upload path and restore the e2e suite ([efe00b9](https://github.com/rencreations/atlas/commit/efe00b9714602e807488d54f6b4ba1b65555dc39))
* **frontend:** comprehensive UX audit sweep — error states, titles, a11y ([a49c34a](https://github.com/rencreations/atlas/commit/a49c34a991a693264163ad628ba4b72b3be74773))

## [0.1.2](https://github.com/shirasakaren/atlas/compare/v0.1.1...v0.1.2) (2026-08-15)

### Changed

* rename the project to Atlas and re-attribute to Shirasaka Ren
  ([aa67780](https://github.com/shirasakaren/atlas/commit/aa67780))

### Fixed

* fix release-please config for the monorepo and align the frontend
  install mode
  ([bfda8a2](https://github.com/shirasakaren/atlas/commit/bfda8a2))

### Removed

* drop the auto-generated placeholder ADRs, notes, and ops helper scripts
  that were imported in bulk; real documentation replaces them

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
- **Design system** — locked Atlas identity: brand tokens, type ramp, radii, motion tokens, geometric pattern components, Lucide stroke icons.

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

[Unreleased]: https://github.com/shirasakaren/atlas/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/shirasakaren/atlas/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/shirasakaren/atlas/releases/tag/v0.1.0
