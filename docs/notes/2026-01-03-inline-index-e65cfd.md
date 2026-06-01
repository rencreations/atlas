# Rate Limit Burst Handling

_Internal meeting note — kept for context. See linked issues for decisions._

- Decided the extra dependency is not justified yet.
- Discussed rollback safety and monitoring coverage.
- Documented the failure mode so the next incident goes faster.
- Confirmed behavior matches the docs after manual verification.
- Parked the refactor proposal; not worth the churn right now.
- Noted the drift between environments and filed a ticket.

## Follow-ups

- [ ] Reviewed with the coordinator; staged behind the feature flag.
- [ ] Documented the failure mode so the next incident goes faster.
