# ADR-0009: Voice Stage Hand-Raise Ordering

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for voice stage hand-raise ordering emerged during review.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: faster to ship and easier to review. Negative: the advanced path still needs its own spike.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because voice stage hand-raise ordering keeps regressing.
