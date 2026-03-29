# ADR-0093: Kanban Drag Reorder Latency

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for kanban drag reorder latency emerged during review.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because kanban drag reorder latency keeps regressing.
