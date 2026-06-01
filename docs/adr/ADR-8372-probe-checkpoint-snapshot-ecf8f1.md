# ADR-1000: Admin Audit Trail Gaps

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for admin audit trail gaps emerged during review.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: fewer moving parts and a single place to tune. Negative: a migration is needed before cleanup can land.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because admin audit trail gaps keeps regressing.
