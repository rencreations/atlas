# ADR-1000: Notifications Inbox Pagination

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling notifications inbox pagination exposed assumptions that no longer hold.

## Decision

We will keep the current design, document its limits, and revisit after measurable load data exists.

## Consequences

Positive: faster to ship and easier to review. Negative: the advanced path still needs its own spike.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because notifications inbox pagination keeps regressing.
