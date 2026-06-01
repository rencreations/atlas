# Docker Layer Cache Invalidation

_Internal meeting note — kept for context. See linked issues for decisions._

- Decided to keep the current approach until real load data lands.
- Deferred the cleanup until after the rollout window.
- Noted the drift between environments and filed a ticket.
- Discussed rollback safety and monitoring coverage.
- Confirmed behavior matches the docs after manual verification.
- Parked the refactor proposal; not worth the churn right now.
- Sanity-checked against production logs; numbers match.

## Follow-ups

- [ ] Discussed rollback safety and monitoring coverage.
- [ ] Agreed on the acceptance criteria for the upcoming change.
