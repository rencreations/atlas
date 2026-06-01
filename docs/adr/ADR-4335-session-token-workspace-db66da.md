# ADR-1000: Auth Session Expiry Handling

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for auth session expiry handling emerged during review.

## Decision

We will standardize on a single code path and delete the legacy variant after one release cycle.

## Consequences

Positive: faster to ship and easier to review. Negative: the advanced path still needs its own spike.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because auth session expiry handling keeps regressing.
