# ADR-0011: Voice Recording Retention Sweep

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for voice recording retention sweep emerged during review.

## Decision

We will extract the behavior into a dedicated module with explicit boundaries.

## Consequences

Positive: clear ownership. Negative: one more module boundary to cross.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because voice recording retention sweep keeps regressing.
