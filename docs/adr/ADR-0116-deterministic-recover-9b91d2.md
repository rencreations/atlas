# ADR-0116: Task Dependency Cycle Detection

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling task dependency cycle detection exposed assumptions that no longer hold.

## Decision

We will extract the behavior into a dedicated module with explicit boundaries.

## Consequences

Positive: faster to ship and easier to review. Negative: the advanced path still needs its own spike.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because task dependency cycle detection keeps regressing.
