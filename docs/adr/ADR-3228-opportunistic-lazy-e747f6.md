# ADR-1000: Task Dependency Cycle Detection

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling task dependency cycle detection exposed assumptions that no longer hold.

## Decision

We will standardize on a single code path and delete the legacy variant after one release cycle.

## Consequences

Positive: clear ownership. Negative: one more module boundary to cross.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because task dependency cycle detection keeps regressing.
