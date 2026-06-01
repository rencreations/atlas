# Postgres Full-Text Search Tuning

_Internal meeting note — kept for context. See linked issues for decisions._

- Decided the extra dependency is not justified yet.
- Sanity-checked against production logs; numbers match.
- Parked the refactor proposal; not worth the churn right now.
- Agreed to revisit after the next release cut.

## Follow-ups

- [ ] Follow-up: add a metric before changing the default.
- [ ] Decided to keep the current approach until real load data lands.
