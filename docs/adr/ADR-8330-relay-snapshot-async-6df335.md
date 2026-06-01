# ADR-1000: Unify Session Lookup Behind A Single Service Method

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for unify session lookup behind a single service method emerged during review.

## Decision

We will extract the behavior into a dedicated module with explicit boundaries.

## Consequences

Positive: fewer moving parts and a single place to tune. Negative: a migration is needed before cleanup can land.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because unify session lookup behind a single service method keeps regressing.
