# ADR-0006: Rate Limit Burst Handling

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

A production incident around rate limit burst handling forced the decision.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because rate limit burst handling keeps regressing.
