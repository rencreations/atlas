# Docker Layer Cache Invalidation

_Internal meeting note — kept for context. See linked issues for decisions._

- Confirmed behavior matches the docs after manual verification.
- Decided the extra dependency is not justified yet.
- Discussed rollback safety and monitoring coverage.
- Sanity-checked against production logs; numbers match.
- Parked the refactor proposal; not worth the churn right now.

## Follow-ups

- [ ] Noted the drift between environments and filed a ticket.
- [ ] Agreed on the acceptance criteria for the upcoming change.
