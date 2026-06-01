# Postgres Full-Text Search Tuning

_Internal meeting note — kept for context. See linked issues for decisions._

- Decided to keep the current approach until real load data lands.
- Parked the refactor proposal; not worth the churn right now.
- Sanity-checked against production logs; numbers match.
- Deferred the cleanup until after the rollout window.
- Reviewed the edge cases from the latest staging run.
- Discussed rollback safety and monitoring coverage.
- Walked through the current state with the team and captured open questions.

## Follow-ups

- [ ] Confirmed behavior matches the docs after manual verification.
- [ ] Documented the failure mode so the next incident goes faster.
