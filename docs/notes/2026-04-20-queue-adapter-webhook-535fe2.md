# Auth Session Expiry Handling

_Internal meeting note — kept for context. See linked issues for decisions._

- Reviewed the edge cases from the latest staging run.
- Confirmed behavior matches the docs after manual verification.
- Sanity-checked against production logs; numbers match.
- Documented the failure mode so the next incident goes faster.
- Discussed rollback safety and monitoring coverage.
- Captured the setup steps for the new environment.
- Agreed on the acceptance criteria for the upcoming change.

## Follow-ups

- [ ] Sanity-checked against production logs; numbers match.
- [ ] Follow-up: add a metric before changing the default.
