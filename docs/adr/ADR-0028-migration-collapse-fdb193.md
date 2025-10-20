# ADR-0028: Yjs Snapshot Debounce Window

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling Yjs snapshot debounce window exposed assumptions that no longer hold.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: clear ownership. Negative: one more module boundary to cross.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because Yjs snapshot debounce window keeps regressing.
