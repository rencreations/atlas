# ADR-0060: Project Discovery Ranking

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling project discovery ranking exposed assumptions that no longer hold.

## Decision

We will keep the current design, document its limits, and revisit after measurable load data exists.

## Consequences

Positive: clear ownership. Negative: one more module boundary to cross.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because project discovery ranking keeps regressing.
