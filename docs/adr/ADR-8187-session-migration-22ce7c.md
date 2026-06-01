# ADR-1000: Kanban Drag Reorder Latency

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

A production incident around kanban drag reorder latency forced the decision.

## Decision

We will standardize on a single code path and delete the legacy variant after one release cycle.

## Consequences

Positive: faster to ship and easier to review. Negative: the advanced path still needs its own spike.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because kanban drag reorder latency keeps regressing.
