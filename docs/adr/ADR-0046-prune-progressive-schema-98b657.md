# ADR-0046: Monorepo Build Cache Misses

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for monorepo build cache misses emerged during review.

## Decision

We will extract the behavior into a dedicated module with explicit boundaries.

## Consequences

Positive: faster to ship and easier to review. Negative: the advanced path still needs its own spike.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because monorepo build cache misses keeps regressing.
