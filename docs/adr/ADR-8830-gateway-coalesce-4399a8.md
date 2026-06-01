# ADR-1000: Sentry Sampling Budget

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling Sentry sampling budget exposed assumptions that no longer hold.

## Decision

We will keep the current design, document its limits, and revisit after measurable load data exists.

## Consequences

Positive: fewer moving parts and a single place to tune. Negative: a migration is needed before cleanup can land.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because Sentry sampling budget keeps regressing.
