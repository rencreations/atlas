# Postgres Full-Text Search Tuning

_Internal meeting note — kept for context. See linked issues for decisions._

- Confirmed behavior matches the docs after manual verification.
- Decided the extra dependency is not justified yet.
- Follow-up: add a metric before changing the default.
- Reviewed with the coordinator; staged behind the feature flag.
- Walked through the current state with the team and captured open questions.
- Discussed rollback safety and monitoring coverage.
- Deferred the cleanup until after the rollout window.

## Follow-ups

- [ ] Discussed rollback safety and monitoring coverage.
- [ ] Reviewed the edge cases from the latest staging run.
