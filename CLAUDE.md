# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

pnpm **monorepo** (pnpm 10.13.1, Node ≥ 20.11):

- `apps/frontend` — Next.js 15 web app, dev server on port **3001**.
- `apps/backend` — NestJS 10 API on port **3000**, Prisma 5 + PostgreSQL.
- Root `package.json` — workspace scripts (`pnpm dev` runs both apps).

## Commands

```bash
pnpm install                  # whole workspace (run at the repo root)
pnpm dev                      # both apps in watch mode (:3000 API, :3001 web)
pnpm dev:frontend             # web only
pnpm dev:backend              # API only
pnpm build                    # production builds for both apps
pnpm lint                     # ESLint across the workspace
pnpm typecheck                # frontend tsc --noEmit (CI gates on this)
pnpm test                     # backend Jest suite (coverage gate)
pnpm db:migrate               # apply the consolidated migration (deploy)
pnpm db:migrate:dev           # dev migrations
pnpm db:seed                  # 30 tags + 12 collaboration roles
```

Per-app scripts keep their original names behind `pnpm --filter @atlas/frontend …`
/ `pnpm --filter @atlas/backend …` (e.g. `--filter @atlas/frontend typecheck`,
`--filter @atlas/backend prisma:generate`).

CI is path-filtered: `ci-frontend.yml` runs typecheck + lint on
`apps/frontend/**` PRs; `ci-backend.yml` runs lint + build + tests + e2e on
`apps/backend/**` PRs; `ci-docs.yml` handles docs-only PRs.

## Frontend (`apps/frontend`)

A thin client over the backend at `NEXT_PUBLIC_API_URL`
(default `https://atlas.labmgm.org/api/v1`).

### Auth — read this before touching anything session-related

1. `/login` builds a Keycloak OAuth URL client-side via `buildKeycloakAuthUrl()` in `src/lib/auth-client.ts` and redirects there.
2. Keycloak returns to `src/app/api/auth/callback/route.ts`, which exchanges the code for tokens, extracts identity claims from the ID token (falling back to `/userinfo`), and POSTs them to the **backend's** `/auth/login`. The backend returns a `sessionId` + user blob.
3. The route hands the session blob back to the SPA by redirecting to `/?session=<json>`. `src/lib/hooks/use-auth-callback.ts` parses it from the URL and calls `storeSession()` to put it in **localStorage** (keys: `atlas_session`, `atlas_tokens`).
4. Every API call sends `Authorization: Bearer <sessionId>` — the backend, not the frontend, validates sessions.
5. Route protection is **client-side only**: `src/app/(authenticated)/layout.tsx` reads `getStoredSession()` and `router.push('/login')` via `useEffect` if missing. `src/middleware.ts` is a no-op pass-through despite its name.

Consequences:

- **There is no Auth.js / NextAuth.** Don't import from `next-auth` even though it's still in `package.json` — it's dead weight pending removal.
- **There are no httpOnly cookies.** Session lives in `localStorage`, accessible only to client code.
- **`src/lib/api/server.ts` is partially broken by design today.** It calls `getSessionId()` from `auth-client.ts`, which is gated on `typeof window !== 'undefined'` and therefore returns `null` whenever it runs on the server. Any RSC fetch through `api()` / `apiGet()` will go out unauthenticated and the backend will 401.
- **Prefer client fetching (`@/lib/api/client` + TanStack Query)** for any data that needs the user's session.

### Data layer

- `src/lib/api/client.ts` — browser fetch wrapper, pulls session from localStorage, throws `ApiError` (`src/lib/api/error.ts`) on non-2xx.
- `src/lib/api/server.ts` — RSC fetch wrapper with the caveat above. Uses `React.cache` for per-request dedupe via `apiGet`.
- `src/lib/api/paths.ts` — **single source of truth for every backend route**. Always add new endpoints here rather than inlining path strings.
- `src/lib/api/queries.ts` — centralized TanStack Query keys + the `ProjectListFilters` type.
- `src/lib/types.ts` — types mirroring the backend; treat as authoritative for shapes received from the API.
- TanStack Query defaults (in `src/app/providers.tsx`): `staleTime: 30s`, no refetch-on-focus, no retries on 4xx, max 2 retries on 5xx.

### Routing

- Path alias `@/*` → `src/*`.
- `experimental.typedRoutes` is **on** (`next.config.mjs`). Dynamic hrefs the type-checker can't statically prove sometimes need `as never` — copy that pattern, don't fight it.
- `outputFileTracingRoot` is set to the workspace root (monorepo standalone tracing).

### Design system — non-negotiable

- **Use design tokens, not literals.** `tailwind.config.ts` defines all colors, type ramps, radii, shadows, motion durations and easings. Never hand-roll hex values or custom transitions.
- **One leading brand color per surface.** The only place all four appear together is inside the geometric pattern (`<PatternCorner>` / `<PatternDado>` in `components/brand/`).
- **Stroke icons only.** Lucide, `strokeWidth={2.25}`.
- **Restrained motion.** `prefers-reduced-motion` is respected via `globals.css`.

### Environment

`NEXT_PUBLIC_*` vars are **baked into the build** via Docker `--build-arg`. Changing them requires a rebuild, not just a restart. Server-only vars (`KEYCLOAK_CLIENT_SECRET`, `AUTH_*`) come from the `.env` file on the deploy host. Copy the root `.env.example` for local dev.

## Backend (`apps/backend`)

NestJS 10 with 15 feature modules under `src/modules/`, namespaced config in
`src/config/`, and a lazy-connect PrismaService in `src/prisma/`.

- **Path alias** `@/*` → `src/*` (resolved by `tsc-alias` at build).
- **Auth** — `passport-custom` strategy (historically named `JwtStrategy`) looks up opaque session UUIDs in the DB per request; Keycloak tokens are only consumed at `POST /auth/login`.
- **Feature flags** — `PMO_ENABLED` / `VOICE_ENABLED` gate whole modules; both default off and the API must boot fine with them off. New env vars land in the root `.env.example` with safe defaults and a comment.
- **Migrations** — one consolidated migration lives at `apps/backend/prisma/migrations/0_init/`. It is the dependency-ordered single source; keep future migrations **additive** (production auto-runs `migrate deploy` on boot). Regenerate the client with `pnpm --filter @atlas/backend prisma:generate` after schema changes.
- **Sidecars** — `services/livekit/livekit.yaml` (SFU config) and `services/y-websocket/` (Yjs relay, own image) are part of the root `docker-compose.yml`; the backend boots without them.

## Deploy

- PRs → `staging-frontend/backend.yml` → staging image builds (path-filtered).
- `main` → `production-frontend/backend.yml` → immutable tags, gated `:latest` promotion, converge + verify.
- Deploy jobs are inert until Docker Hub / Tailscale / SSH vars and secrets are configured — see `docs/deploy-converge-setup.md`.
