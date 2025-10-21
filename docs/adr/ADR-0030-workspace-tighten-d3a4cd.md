# ADR-0030: Dashboard Loading Skeletons

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling dashboard loading skeletons exposed assumptions that no longer hold.

## Decision

We will standardize on a single code path and delete the legacy variant after one release cycle.

## Consequences

Positive: clear ownership. Negative: one more module boundary to cross.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because dashboard loading skeletons keeps regressing.
