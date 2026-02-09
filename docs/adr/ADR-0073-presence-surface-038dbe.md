# ADR-0073: Collaboration Role Catalog Sync

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for collaboration role catalog sync emerged during review.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: fewer moving parts and a single place to tune. Negative: a migration is needed before cleanup can land.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because collaboration role catalog sync keeps regressing.
