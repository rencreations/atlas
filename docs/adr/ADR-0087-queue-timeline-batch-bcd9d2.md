# ADR-0087: Postgres Full-Text Search Tuning

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling Postgres full-text search tuning exposed assumptions that no longer hold.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because Postgres full-text search tuning keeps regressing.
