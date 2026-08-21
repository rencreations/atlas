# ADR-0001: Self-hostable configuration via the Godmode control plane

- Status: Accepted
- Date: 2026-08-21
- Deciders: Shirasaka Ren

## Context

Atlas was originally built as a single-tenant deployment for one
organization. Identity was hard-wired to one Keycloak realm, "admin" was a
boolean flag seeded from `BOOTSTRAP_ADMIN_EMAIL`, and every integration
(S3, SMTP, GIF keys, n8n, VAPID, feature toggles) was configured through
environment variables that required a redeploy to change.

Atlas is now an open-source, self-hostable platform. The operator who
deploys it should be able to configure every non-critical aspect of the
instance from the browser — without SSH access, without editing `.env`,
and without restarting containers. Only the handful of variables needed to
*boot* (database URL, internal signing secret, the godmode passphrase,
public URLs) may stay in `.env`.

## Decision

Introduce a **Godmode control plane** — a superadmin dashboard at
`/godmode` on the frontend backed by a `godmode` module on the API.

1. **Critical vs. dynamic configuration.**
   - `.env` keeps only boot-critical values: `DATABASE_URL`, `PORT`,
     `APP_BASE_URL`, `API_GLOBAL_PREFIX`, `CORS_ORIGINS`,
     `INTERNAL_JWT_SECRET`, and `GODMODE_PASSPHRASE`.
   - Everything else (auth methods, OAuth/SAML credentials, SMTP/SMS
     providers, storage, GIF keys, webhooks, VAPID, feature gates,
     branding, registration policy) lives in a new database-backed
     settings store and is edited in Godmode.

2. **Settings store.** A single `AppSetting` table (key → typed JSON
   value) with a code-defined registry that supplies defaults, types,
   labels, and secret flags. Secrets (client secrets, API keys) are
   encrypted at rest with AES-256-GCM under a key derived from
   `INTERNAL_JWT_SECRET`. The resolution order is: database value →
   registry default → legacy env fallback. The godmode UI renders the
   registry, so new settings only need a registry entry plus the code
   that consumes them.

3. **Godmode authentication.**
   - `POST /godmode/unlock` checks the `GODMODE_PASSPHRASE` from `.env`
     in constant time and issues a short-lived, DB-backed godmode session
     (opaque token). Rate-limited.
   - Optional second factor for godmode sign-in: TOTP and WebAuthn
     passkeys, both configured inside godmode (secrets stored in the
     encrypted settings store).
   - Any visitor may attempt to unlock godmode with the passphrase
     (single-operator deployments have no other bootstrap path), which is
     why 2FA/passkeys are first-class options.

4. **First-run onboarding.** A `system.configured` flag flips true when
   the first godmode onboarding completes. Until then:
   - `GET /public-config` reports `configured: false` (the frontend never
     exposes which settings are missing).
   - Visiting any frontend route renders a "this instance is not
     configured" screen with a CTA to `/godmode`, which explains where
     the passphrase lives (`.env`, `GODMODE_PASSPHRASE`).
   - The API boots and health checks still pass; unauthenticated
     endpoints keep working.

5. **Pluggable identity.** Authentication methods become a registry of
   providers (local password, phone OTP, magic link, passphrase, OAuth2
   presets, generic OIDC, SAML), each with enable toggles and credentials
   in the settings store. `POST /auth/login` variants mint the same
   opaque DB sessions as before; the `Session` model and the
   bearer-session-id strategy are unchanged, so every existing module
   keeps working. User identity links move to a `UserAuthIdentity`
   table (provider + provider id) instead of the single `keycloakId`
   column.

6. **Dynamic RBAC.** `isAdmin` stops being env-seeded. Roles
   (`Role`), a permission catalog (`Permission`), role→permission
   mappings, and per-user role grants (`UserRole`) are stored in the DB
   and managed in godmode. Seeded role templates: superadmin, admin,
   member, developer, visitor. `User.isAdmin` is retained as a
   denormalized flag synced from the `admin`/`superadmin` roles so
   existing guards keep working while new code adopts permission checks.

7. **Modules consult settings, not just env.** Feature gates
   (`pmo.enabled`, `voice.enabled`) and integration keys (GIFs, SMTP,
   storage) resolve through the settings service so a godmode toggle
   takes effect without a redeploy. Env vars remain valid fallbacks for
   operators who prefer them.

## Consequences

Positive:

- One browser surface configures an entire deployment; onboarding a
  fresh instance is a guided wizard instead of a checklist of env edits.
- Redeploys are only needed for boot-critical changes.
- Auth method and provider choices become discoverable, tutorial-linked
  configuration rather than undocumented env vars.

Negative:

- The settings store is a new runtime dependency for many services;
  reads must be cached carefully to avoid a DB hit per request.
- Secret values live in the database (encrypted), which is a different
  threat model than `.env`; backups now carry secrets.

## Alternatives considered

- Keep everything in `.env` and ship a config-generator CLI — rejected:
  still requires host access and a redeploy for every change.
- A separate admin-only service for configuration — rejected: adds an
  ops burden that single-operator self-hosters will not want.
- Store settings as plain columns on a single-row table — rejected:
  one row per setting keeps godmode generic and additive without
  migrations per feature.
