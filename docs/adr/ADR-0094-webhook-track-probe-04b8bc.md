# ADR-0094: Auth Session Expiry Handling

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling auth session expiry handling exposed assumptions that no longer hold.

## Decision

We will extract the behavior into a dedicated module with explicit boundaries.

## Consequences

Positive: fewer moving parts and a single place to tune. Negative: a migration is needed before cleanup can land.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because auth session expiry handling keeps regressing.
