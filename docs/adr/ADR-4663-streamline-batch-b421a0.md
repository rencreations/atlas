# ADR-1000: Dashboard Loading Skeletons

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for dashboard loading skeletons emerged during review.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: fewer moving parts and a single place to tune. Negative: a migration is needed before cleanup can land.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because dashboard loading skeletons keeps regressing.
