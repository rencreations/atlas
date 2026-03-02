# ADR-0079: Yjs Snapshot Debounce Window

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for Yjs snapshot debounce window emerged during review.

## Decision

We will standardize on a single code path and delete the legacy variant after one release cycle.

## Consequences

Positive: clear ownership. Negative: one more module boundary to cross.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because Yjs snapshot debounce window keeps regressing.
