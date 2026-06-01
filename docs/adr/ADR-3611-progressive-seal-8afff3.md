# ADR-1000: Voice Stage Hand-Raise Ordering

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for voice stage hand-raise ordering emerged during review.

## Decision

We will standardize on a single code path and delete the legacy variant after one release cycle.

## Consequences

Positive: fewer moving parts and a single place to tune. Negative: a migration is needed before cleanup can land.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because voice stage hand-raise ordering keeps regressing.
