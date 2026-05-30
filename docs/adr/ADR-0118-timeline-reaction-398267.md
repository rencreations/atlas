# ADR-0118: Typing Indicator Backpressure

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

The current implementation grew organically and now makes typing indicator backpressure hard to reason about.

## Decision

We will standardize on a single code path and delete the legacy variant after one release cycle.

## Consequences

Positive: faster to ship and easier to review. Negative: the advanced path still needs its own spike.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because typing indicator backpressure keeps regressing.
