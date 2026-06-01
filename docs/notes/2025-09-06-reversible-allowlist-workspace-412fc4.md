# Postgres Full-Text Search Tuning

_Internal meeting note — kept for context. See linked issues for decisions._

- Decided the extra dependency is not justified yet.
- Discussed rollback safety and monitoring coverage.
- Noted the drift between environments and filed a ticket.
- Confirmed behavior matches the docs after manual verification.
- Reviewed the edge cases from the latest staging run.

## Follow-ups

- [ ] Documented the failure mode so the next incident goes faster.
- [ ] Kept notes deliberately short — details live in the linked issue.
