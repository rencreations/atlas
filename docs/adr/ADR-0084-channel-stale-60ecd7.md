# ADR-0084: Contribution Request Review Queue

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling contribution request review queue exposed assumptions that no longer hold.

## Decision

We will standardize on a single code path and delete the legacy variant after one release cycle.

## Consequences

Positive: faster to ship and easier to review. Negative: the advanced path still needs its own spike.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because contribution request review queue keeps regressing.
