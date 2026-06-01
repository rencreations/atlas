# ADR-1000: Project Discovery Ranking

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

The current implementation grew organically and now makes project discovery ranking hard to reason about.

## Decision

We will extract the behavior into a dedicated module with explicit boundaries.

## Consequences

Positive: faster to ship and easier to review. Negative: the advanced path still needs its own spike.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because project discovery ranking keeps regressing.
