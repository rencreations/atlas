# Changelog

All notable changes to Atlas — the web app and the API — are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Pre-1.0, minor versions may contain breaking changes.

## [0.1.3](https://github.com/rencreations/atlas/compare/v0.1.2...v0.1.3) (2026-09-05)


### Features

* 'For me' personal work overview ([614dd40](https://github.com/rencreations/atlas/commit/614dd406b6c4fb80d845359ab9951bb6ff37492b))
* **api:** godmode control plane, dynamic settings, and relaxed boot requirements ([14e9aaa](https://github.com/rencreations/atlas/commit/14e9aaa815a66fdaf8616c3a761297819c1ed02f))
* **api:** pluggable authentication — local, OTP, magic link, OAuth, OIDC, SAML ([966ee49](https://github.com/rencreations/atlas/commit/966ee499c13460fa718af7631f6fcd5e266dc0e7))
* **api:** role-based IAM — permission guard, dynamic admins, admin provisioning ([6b57347](https://github.com/rencreations/atlas/commit/6b573476040726b501af3a4e22dddb7d6d9983ac))
* **api:** WebAuthn passkeys as a godmode second factor ([989a676](https://github.com/rencreations/atlas/commit/989a6760aa3cdbc8ce52dd024aa87ecde88a8d68))
* **chat:** Discord-style server rail and universal search ([b556aff](https://github.com/rencreations/atlas/commit/b556aff617fa61fd27a4361aaf384e295dfeaf50))
* **chat:** per-channel unread badges in the channel list sidebar ([b1a4bf4](https://github.com/rencreations/atlas/commit/b1a4bf4cc6f11130d58ee8ced65b4f21545b15d5))
* **chat:** server settings menu, persistent rail during voice, camera fallback fix ([41843a3](https://github.com/rencreations/atlas/commit/41843a3db0a4d9d2d46dbff299a4c5cbd1abeb10))
* consolidate Discover, contributor deep-links, chat server avatars, stability fixes ([d35613b](https://github.com/rencreations/atlas/commit/d35613bc57309e902b6bb4c7f211f5a01e97a081))
* **demo:** deterministic high-volume demo dataset for testing and demos ([3f5878b](https://github.com/rencreations/atlas/commit/3f5878be4a0e9bd93b35d22a3ffd08bcbdfc0666))
* godmode editor sticky dirty state, tenant SSO directories, storage providers with background migration ([888a3a4](https://github.com/rencreations/atlas/commit/888a3a44e2f3a1f5a6846df9ada6b78c22e2b90a))
* **godmode:** Authentication grouping, provider-aware settings, account moderation, custom roles ([bc471b7](https://github.com/rencreations/atlas/commit/bc471b7ba316b3d6ec692debd6b02b3530e90847))
* **godmode:** provider cards, secret popups, sticky sidebar, live theme preview, Klipy GIFs ([5dbd4c8](https://github.com/rencreations/atlas/commit/5dbd4c8e3d7aacca006c870bda8183cecc23edc1))
* **godmode:** real brand icons, sticky roles editor, scrollable dialogs, gradual onboarding ([308d1c1](https://github.com/rencreations/atlas/commit/308d1c1168616ee870d81e4550df6c9be5e379d7))
* restrict project creation to authorized roles, expand admin user management ([a5e842a](https://github.com/rencreations/atlas/commit/a5e842afef1833b652ad6d2349aff0a1bb035b4d))
* **themes:** 24-theme token registry, generated CSS, and WCAG contrast gate ([204c5eb](https://github.com/rencreations/atlas/commit/204c5eb64579c47d1f1db337d5fb9833352bcbcd))
* **themes:** per-user theme + instance default via godmode ([289c36b](https://github.com/rencreations/atlas/commit/289c36bdb701d3d7c755725a77e5d1d6c010388c))
* **themes:** single primary color for all branding + minimal animated footer ([809492c](https://github.com/rencreations/atlas/commit/809492c5ff293431e253ddf5a7b0fe8343955f1f))
* **ui:** godmode guidance polish, live celebration, animated icons ([4a1fcef](https://github.com/rencreations/atlas/commit/4a1fceffed04bcfad9586ad9c38f1c4b10496ce8))
* **voice:** draggable, corner-snapping floating call widget ([ecff1a5](https://github.com/rencreations/atlas/commit/ecff1a5bf09e29ed400139309a97bd6b07d5f396))
* **voice:** screen share, deafen, and open-chat on the floating widget ([df52517](https://github.com/rencreations/atlas/commit/df52517abb5767e2ace60104d8fb752fd3c53740))
* **web:** godmode control-plane dashboard at /godmode ([aac62de](https://github.com/rencreations/atlas/commit/aac62de43a7a2a2a250c50dd440aee1bdfddd26f))
* **web:** multi-auth login surface and account flow pages ([ce18685](https://github.com/rencreations/atlas/commit/ce186857bcf6251e62b4d636172b2321d4cd3a62))
* **web:** user profile & settings, theme support, legal pages ([b84d934](https://github.com/rencreations/atlas/commit/b84d9344dbd7896965cf68ace8497edcca15d6ed))


### Bug Fixes

* **api:** harden the avatar upload path and restore the e2e suite ([efe00b9](https://github.com/rencreations/atlas/commit/efe00b9714602e807488d54f6b4ba1b65555dc39))
* **auth:** lazy-load openid-client to stop OIDC crashing boot ([f1e11e6](https://github.com/rencreations/atlas/commit/f1e11e6096911f324359a782ffaef20f82a88f76))
* **avatar:** keep avatarUrl current everywhere, not just the profile page ([e87e4ac](https://github.com/rencreations/atlas/commit/e87e4ac0cb9f756ccaba383e88e83a36609d8a9d))
* **backend:** declare express as a direct dependency ([dc99fcf](https://github.com/rencreations/atlas/commit/dc99fcffdcae8ec4ff7201b97842676f57b7e063))
* chat window not filling the viewport, pin panel close button offscreen ([557a513](https://github.com/rencreations/atlas/commit/557a5138ac5255f56691b25ffe775fa8e0535369))
* **docker:** copy/run frontend standalone output at its nested path ([4418e01](https://github.com/rencreations/atlas/commit/4418e01ced663990984e26f1c820c7fde8cf0a27))
* **docker:** drop pnpm BuildKit cache mount, keep Dockerfiles portable ([7b74104](https://github.com/rencreations/atlas/commit/7b7410420bb4357a972cfa0f5a103a03d237f278))
* **docker:** drop pnpm cache mount id for Railway builder compatibility ([6eaa8ff](https://github.com/rencreations/atlas/commit/6eaa8fffe1f264a6da14ee0273065bbd4b25e27e))
* **docker:** keep backend node_modules nested so prisma's bin resolves ([f0bd270](https://github.com/rencreations/atlas/commit/f0bd270f52d550b35dc8de6d748ef5ffbaad38d6))
* **docker:** set CI=true in backend build to skip pnpm prune prompt ([f011398](https://github.com/rencreations/atlas/commit/f011398379bcc8d33a0f2907164ea7c1c904e2f5))
* **docker:** upgrade corepack before pnpm prepare ([80c4d40](https://github.com/rencreations/atlas/commit/80c4d4054a80c5b3108185279961fa22ac60a98a))
* forced password change failed with a missing Authorization header ([9561c2f](https://github.com/rencreations/atlas/commit/9561c2f042215a379daccdc8e0342d70e1157121))
* **frontend:** comprehensive UX audit sweep — error states, titles, a11y ([a49c34a](https://github.com/rencreations/atlas/commit/a49c34a991a693264163ad628ba4b72b3be74773))
* **godmode:** keep TOTP out of the generic Advanced editor ([ce66f40](https://github.com/rencreations/atlas/commit/ce66f4054d4089b29158ddee9b52a6a10cc52fa0))
* **godmode:** settings edits reverted instantly — reset effect keyed on array identity ([48daacf](https://github.com/rencreations/atlas/commit/48daacf22fc3a0dfdb6216b03f76f0f14ee86603))
* **godmode:** theme icon stacking, dialog UX, multi-passphrase credentials ([e1e69f9](https://github.com/rencreations/atlas/commit/e1e69f9aca5a91c7c641fe675a6ae8c822df33e9))
* onboarding clarity, unreachable settings, a11y and confirm dialogs ([e351b7e](https://github.com/rencreations/atlas/commit/e351b7e9ccfe8de298ba1066591a8d9aa055e3ad))
* pinned-messages panel anchored as a fixed overlay, never overflows ([b94460e](https://github.com/rencreations/atlas/commit/b94460e59e7c55752c2dcce91830a6993f6c948b))
* rejoin-prompt tracking and header avatar cache freshness ([e2b1c56](https://github.com/rencreations/atlas/commit/e2b1c568e3e5a61a10358c939d676a592d831ad8))
* search anchored right, hidden rail scrollbars, inline chat avatar edit, no PMO back icon ([2798937](https://github.com/rencreations/atlas/commit/279893708ff4b06bbb705f756bdbd507e413b641))
* **settings:** replace placeholder legal text with the bundled templates ([825f772](https://github.com/rencreations/atlas/commit/825f77250fdd39718e998abebc3d1cb8ec74f459))
* task-key collisions, redirect loop, avatar flicker, workspace scroll ([1b6f138](https://github.com/rencreations/atlas/commit/1b6f1389d9f7083b317f9d90b17dc6007a97f01d))
* **ui:** label the note editor while the Yjs provider connects ([b922543](https://github.com/rencreations/atlas/commit/b922543e42c39a61aa810e5e3b40c99cc5bfca86))
* **ui:** mobile chat drawer, scrollable tabs, and remaining touch targets ([b55209d](https://github.com/rencreations/atlas/commit/b55209df579b3caa74879c4eb7fa445d3f7761d5))
* **ui:** PMO files cards and note editor accessibility ([a693133](https://github.com/rencreations/atlas/commit/a6931337d6ebbbceacd876fdd9e09f1cd226e80b))
* **ui:** project back link and tab drag handle hit areas ([5b1c308](https://github.com/rencreations/atlas/commit/5b1c30820a89046d23f2a120caa61cebb67088e9))
* **ui:** reachable touch targets, and reveal a hover-only control ([2fdca8e](https://github.com/rencreations/atlas/commit/2fdca8e54a074c587b3558127ca1f42c0b0cf416))
* **ui:** responsive header, touch targets, and a11y across the audit matrix ([04bcfea](https://github.com/rencreations/atlas/commit/04bcfeaa915b4cdd351e4b6ab5adfb8eb48f0dbd))
* voice leave not disconnecting on-page, add rejoin button, live header avatar ([fb877f4](https://github.com/rencreations/atlas/commit/fb877f41ea01e7cede5cdd39e478ab333d174890))
* **voice,avatar:** remove fake voice participants, fix upload/avatar bugs ([9bf2ee5](https://github.com/rencreations/atlas/commit/9bf2ee5ab4a087b9c557fb37061eb2f3acfb570e))
* **voice:** dedicated open-call button on the floating widget ([059b24f](https://github.com/rencreations/atlas/commit/059b24ff14f53ddfbef416a29db133e2b186b64a))
* **voice:** harden against hearing your own mic, add mirror toggle ([47a4105](https://github.com/rencreations/atlas/commit/47a4105d9bdfe4d5eb2fd22bddbfffb47bd9689f))
* **voice:** remote audio playback, screen share, layout gap, halo, nav ([f728dd7](https://github.com/rencreations/atlas/commit/f728dd7ddf9e5150e3ddf211f58b49d9bdcdf4fe))

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
