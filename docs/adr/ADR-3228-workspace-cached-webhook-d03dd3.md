# ADR-1000: Split The Realtime Adapter Into Per-Namespace Modules

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

The current implementation grew organically and now makes split the realtime adapter into per-namespace modules hard to reason about.

## Decision

We will extract the behavior into a dedicated module with explicit boundaries.

## Consequences

Positive: faster to ship and easier to review. Negative: the advanced path still needs its own spike.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because split the realtime adapter into per-namespace modules keeps regressing.
