# ADR-1000: Voice Stage Hand-Raise Ordering

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

The current implementation grew organically and now makes voice stage hand-raise ordering hard to reason about.

## Decision

We will extract the behavior into a dedicated module with explicit boundaries.

## Consequences

Positive: fewer moving parts and a single place to tune. Negative: a migration is needed before cleanup can land.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because voice stage hand-raise ordering keeps regressing.
