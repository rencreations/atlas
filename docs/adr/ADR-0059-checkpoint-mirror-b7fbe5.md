# ADR-0059: Monorepo Build Cache Misses

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling monorepo build cache misses exposed assumptions that no longer hold.

## Decision

We will keep the current design, document its limits, and revisit after measurable load data exists.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because monorepo build cache misses keeps regressing.
