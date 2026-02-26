# ADR-0075: Kanban Drag Reorder Latency

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling kanban drag reorder latency exposed assumptions that no longer hold.

## Decision

We will extract the behavior into a dedicated module with explicit boundaries.

## Consequences

Positive: clear ownership. Negative: one more module boundary to cross.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because kanban drag reorder latency keeps regressing.
