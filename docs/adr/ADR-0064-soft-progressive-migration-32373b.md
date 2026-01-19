# ADR-0064: Kanban Drag Reorder Latency

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for kanban drag reorder latency emerged during review.

## Decision

We will extract the behavior into a dedicated module with explicit boundaries.

## Consequences

Positive: faster to ship and easier to review. Negative: the advanced path still needs its own spike.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because kanban drag reorder latency keeps regressing.
