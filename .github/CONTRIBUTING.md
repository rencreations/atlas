# Contributing to MGM Atlas

Thanks for your interest in MGM Atlas! This monorepo holds the whole product —
the Next.js web app in [`apps/frontend`](../apps/frontend) and the NestJS API in
[`apps/backend`](../apps/backend) — so one checklist covers both sides.

> [!IMPORTANT]
> Atlas is **proprietary, source-visible** (Estella Solusi Digital Proprietary
> License v1.0). Code contributions are limited to active MGM Laboratory
> members. Everyone is welcome to read, open
> [issues](https://github.com/shirasakaren/rement/issues), and participate in
> [discussions](https://github.com/shirasakaren/rement/discussions).

## Ways to help

- 🐛 **Found a bug?** Open a [bug report](https://github.com/shirasakaren/rement/issues/new/choose) — screenshots welcome.
- 💡 **Have an idea?** Start a [Discussion](https://github.com/shirasakaren/rement/discussions) or file a feature request.
- 📚 **Docs?** PRs that clarify README/docs are always welcome.

## Development setup

Prerequisites: Node ≥ 20.11, pnpm ≥ 9. For full end-to-end work you also need a
reachable PostgreSQL, an S3-compatible bucket, and a Keycloak realm (ask the
coordinator for dev realm credentials).

```bash
pnpm install                  # installs the whole workspace
cp .env.example .env          # fill DATABASE_*, KEYCLOAK_*, AWS_*, NEXT_PUBLIC_*
pnpm db:migrate:dev           # apply the consolidated migration
pnpm db:seed                  # 30 tags + 12 collaboration roles
pnpm dev                      # API → http://localhost:3000/api/v1 · web → http://localhost:3001
```

Useful targets:

- `pnpm dev:frontend` / `pnpm dev:backend` — one app at a time
- `pnpm build` — production builds for both apps
- `pnpm lint` — ESLint across the workspace
- `pnpm --filter @atlas/frontend typecheck` — frontend typecheck (CI gates on this)
- `pnpm test` — backend Jest suite (with coverage gate)
- `pnpm db:studio` — browse the database

Before pushing: `pnpm lint && pnpm build` — CI gates on exactly these (plus
typecheck for the frontend).

## Branch model & commit style

- Branch from `main` as `feat/<slug>`, `fix/<slug>`, or `docs/<slug>`.
- Conventional Commits, with the app as scope where it matters:

  ```
  feat: workspace-global chat channels + return-to-URL login redirect
  fix(pmo): auto-recover notes + whiteboards from JSON projection
  fix(pmo-notes): don't save empty doc before Yjs initial sync finishes
  feat(chat): workspace-global chat channels, lobby voice threads
  hotfix(yjs-sidecar): skip flush on last client disconnect
  ```

- Keep subjects imperative and scoped; the PR title follows the same convention.

## Code style & ground rules

- **Formatting** — Prettier (100-char lines, single quotes). Run `pnpm format`.
- **Frontend design tokens, not literals** — colors, type ramp, radii, shadows,
  durations, easings come from `apps/frontend/tailwind.config.ts`. See
  [docs/design-system.md](../docs/design-system.md) for the five laws (one
  leading brand color per surface, Lucide stroke 2.25, restrained motion).
- **Backend** — NestJS modules with namespaced config in
  `apps/backend/src/config/`; new env vars land in `.env.example` with safe
  defaults and a comment; migrations stay additive and reversible.
- **No secrets, internal hostnames, or infrastructure details** in code,
  comments, or docs.

## PR review checklist

CI runs per-app (path-filtered), so a docs-only PR gets the fast docs check.
Merge when: CI is green, the PR template checklist is complete, and at least
one maintainer has reviewed for risky changes.
