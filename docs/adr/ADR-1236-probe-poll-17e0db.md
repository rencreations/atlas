# ADR-1000: Split The Realtime Adapter Into Per-Namespace Modules

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for split the realtime adapter into per-namespace modules emerged during review.

## Decision

We will keep the current design, document its limits, and revisit after measurable load data exists.

## Consequences

Positive: faster to ship and easier to review. Negative: the advanced path still needs its own spike.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because split the realtime adapter into per-namespace modules keeps regressing.
