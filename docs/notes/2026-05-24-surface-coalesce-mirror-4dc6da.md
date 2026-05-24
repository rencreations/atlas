# Pmo File Allowlist Policy

_Internal meeting note — kept for context. See linked issues for decisions._

- Decided to keep the current approach until real load data lands.
- Noted the drift between environments and filed a ticket.
- Decided the extra dependency is not justified yet.
- Deferred the cleanup until after the rollout window.
- Captured the setup steps for the new environment.
- Sanity-checked against production logs; numbers match.
- Reviewed the edge cases from the latest staging run.

## Follow-ups

- [ ] Reviewed with the coordinator; staged behind the feature flag.
- [ ] Parked the refactor proposal; not worth the churn right now.
