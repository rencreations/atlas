# ADR-1000: Unify Session Lookup Behind A Single Service Method

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for unify session lookup behind a single service method emerged during review.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because unify session lookup behind a single service method keeps regressing.
