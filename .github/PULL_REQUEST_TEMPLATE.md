<!-- Title must follow Conventional Commits, e.g. `feat(chat): message threads` -->

## Summary

<!-- What does this PR do, and why? One or two sentences. -->

Closes #

## Type of change

- [ ] `feat` — new functionality
- [ ] `fix` / `hotfix` — bug fix
- [ ] `refactor` / `chore` — no behavior change
- [ ] `docs` — documentation only

## How was this tested?

<!-- Pages exercised / curl calls made, browsers checked, states covered (loading/empty/error). -->

- [ ] Verified on staging (for risky changes)

## Screenshots / API samples

<!-- REQUIRED for any UI change: before/after, light backgrounds, real data shapes. -->

## Checklist

- [ ] PR title follows Conventional Commits
- [ ] `pnpm lint` and `pnpm build` pass locally for every app touched
- [ ] **No secrets, internal hostnames, or infrastructure details** anywhere
- [ ] Frontend: design tokens only — no literal hex values, durations, or shadows
- [ ] Frontend: behaves correctly with `NEXT_PUBLIC_PMO_ENABLED` / `NEXT_PUBLIC_VOICE_ENABLED` off
- [ ] Backend: database migrations are **additive and reversible** (production auto-runs `migrate deploy` on boot)
- [ ] Backend: boots cleanly with `PMO_ENABLED=false`, `VOICE_ENABLED=false`, and optional integrations unset
- [ ] New env vars added to `.env.example` with safe defaults and comments
- [ ] README / docs updated if behavior changed
