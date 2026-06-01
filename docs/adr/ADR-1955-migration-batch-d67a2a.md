# ADR-1000: Attachment Deduplication

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling attachment deduplication exposed assumptions that no longer hold.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: clear ownership. Negative: one more module boundary to cross.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because attachment deduplication keeps regressing.
