# ADR-1000: Sentry Sampling Budget

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling Sentry sampling budget exposed assumptions that no longer hold.

## Decision

We will extract the behavior into a dedicated module with explicit boundaries.

## Consequences

Positive: faster to ship and easier to review. Negative: the advanced path still needs its own spike.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because Sentry sampling budget keeps regressing.
