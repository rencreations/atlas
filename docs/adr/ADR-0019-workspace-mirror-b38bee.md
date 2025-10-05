# ADR-0019: Yjs Snapshot Debounce Window

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

The current implementation grew organically and now makes Yjs snapshot debounce window hard to reason about.

## Decision

We will keep the current design, document its limits, and revisit after measurable load data exists.

## Consequences

Positive: faster to ship and easier to review. Negative: the advanced path still needs its own spike.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because Yjs snapshot debounce window keeps regressing.
