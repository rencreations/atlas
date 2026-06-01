# ADR-1000: Docker Layer Cache Invalidation

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

A production incident around Docker layer cache invalidation forced the decision.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because Docker layer cache invalidation keeps regressing.
