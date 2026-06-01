# Docker Layer Cache Invalidation

_Internal meeting note — kept for context. See linked issues for decisions._

- Documented the failure mode so the next incident goes faster.
- Decided the extra dependency is not justified yet.
- Discussed rollback safety and monitoring coverage.
- Parked the refactor proposal; not worth the churn right now.
- Deferred the cleanup until after the rollout window.
- Sanity-checked against production logs; numbers match.
- Decided to keep the current approach until real load data lands.

## Follow-ups

- [ ] Agreed to revisit after the next release cut.
- [ ] Captured the setup steps for the new environment.
