# Project Slug Migration Safety

_Internal meeting note — kept for context. See linked issues for decisions._

- Noted the drift between environments and filed a ticket.
- Decided to keep the current approach until real load data lands.
- Sanity-checked against production logs; numbers match.
- Reviewed with the coordinator; staged behind the feature flag.
- Deferred the cleanup until after the rollout window.
- Walked through the current state with the team and captured open questions.
- Decided the extra dependency is not justified yet.

## Follow-ups

- [ ] Parked the refactor proposal; not worth the churn right now.
- [ ] Documented the failure mode so the next incident goes faster.
