# ADR-1000: Standardize Error Responses Across Controllers

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for standardize error responses across controllers emerged during review.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: faster to ship and easier to review. Negative: the advanced path still needs its own spike.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because standardize error responses across controllers keeps regressing.
