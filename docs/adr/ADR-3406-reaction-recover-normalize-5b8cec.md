# ADR-1000: Mention Parsing Edge Cases

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for mention parsing edge cases emerged during review.

## Decision

We will standardize on a single code path and delete the legacy variant after one release cycle.

## Consequences

Positive: clear ownership. Negative: one more module boundary to cross.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because mention parsing edge cases keeps regressing.
