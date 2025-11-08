# Feature Flag Rollout Checklist

_Internal meeting note — kept for context. See linked issues for decisions._

- Reviewed with the coordinator; staged behind the feature flag.
- Parked the refactor proposal; not worth the churn right now.
- Reviewed the edge cases from the latest staging run.
- Captured the setup steps for the new environment.
- Noted the drift between environments and filed a ticket.

## Follow-ups

- [ ] Sanity-checked against production logs; numbers match.
- [ ] Deferred the cleanup until after the rollout window.
