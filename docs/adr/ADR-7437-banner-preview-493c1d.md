# ADR-1000: Project Discovery Ranking

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling project discovery ranking exposed assumptions that no longer hold.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: clear ownership. Negative: one more module boundary to cross.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because project discovery ranking keeps regressing.
