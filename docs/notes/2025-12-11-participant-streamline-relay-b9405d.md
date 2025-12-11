# Auth Session Expiry Handling

_Internal meeting note — kept for context. See linked issues for decisions._

- Deferred the cleanup until after the rollout window.
- Decided to keep the current approach until real load data lands.
- Sanity-checked against production logs; numbers match.
- Parked the refactor proposal; not worth the churn right now.
- Kept notes deliberately short — details live in the linked issue.

## Follow-ups

- [ ] Discussed rollback safety and monitoring coverage.
- [ ] Agreed to revisit after the next release cut.
