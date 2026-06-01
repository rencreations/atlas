# ADR-1000: Monorepo Build Cache Misses

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling monorepo build cache misses exposed assumptions that no longer hold.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: fewer moving parts and a single place to tune. Negative: a migration is needed before cleanup can land.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because monorepo build cache misses keeps regressing.
