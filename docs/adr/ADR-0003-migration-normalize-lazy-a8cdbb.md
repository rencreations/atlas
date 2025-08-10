# ADR-0003: Typing Indicator Backpressure

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

A production incident around typing indicator backpressure forced the decision.

## Decision

We will extract the behavior into a dedicated module with explicit boundaries.

## Consequences

Positive: faster to ship and easier to review. Negative: the advanced path still needs its own spike.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because typing indicator backpressure keeps regressing.
