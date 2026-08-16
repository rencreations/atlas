# Security Policy

## Reporting a vulnerability

**Please report security vulnerabilities privately** — do not open public
issues. Use the GitHub private vulnerability reporting flow on the
[Security tab](https://github.com/shirasakaren/atlas/security).

Include what you can: affected endpoint/page/component, reproduction steps,
impact assessment, and whether you believe it is exploitable in the production
deployment.

**What happens next**

1. You'll get an acknowledgement within 48 hours.
2. The team triages severity and keeps you posted as fixes land.
3. Once a fix ships, we publish a security advisory crediting you (unless you
   prefer to stay anonymous).

## Scope

In scope:

- This monorepo's code: the API, its auth/session handling, access-control
  guards, S3 presign flow, webhook signing, and the Socket.IO gateways
  (`apps/backend`); plus XSS and content-injection surfaces (chat markdown,
  rich text, link previews), session handling in the browser (localStorage),
  the OAuth callback route, the service worker and push handling
  (`apps/frontend`).

Out of scope:

- Vulnerabilities in upstream software (Keycloak, LiveKit, PostgreSQL, n8n,
  Next.js) — report those upstream.
- Volumetric denial-of-service and rate-limit exhaustion findings.
- Social engineering of team members.
- Findings that require a previously compromised account or device.

## Supported versions

Only the latest release and `main` are supported. The live deployment
(atlas.labmgm.org) tracks `main`.
