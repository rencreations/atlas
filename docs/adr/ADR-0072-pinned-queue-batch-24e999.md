# ADR-0072: Voice Recording Retention Sweep

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for voice recording retention sweep emerged during review.

## Decision

We will extract the behavior into a dedicated module with explicit boundaries.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because voice recording retention sweep keeps regressing.
