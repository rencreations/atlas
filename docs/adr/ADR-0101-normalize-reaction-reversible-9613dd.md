# ADR-0101: Contribution Request Review Queue

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for contribution request review queue emerged during review.

## Decision

We will standardize on a single code path and delete the legacy variant after one release cycle.

## Consequences

Positive: fewer moving parts and a single place to tune. Negative: a migration is needed before cleanup can land.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because contribution request review queue keeps regressing.
