# ADR-1000: Renovate Group Noise

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

A production incident around renovate group noise forced the decision.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because renovate group noise keeps regressing.
