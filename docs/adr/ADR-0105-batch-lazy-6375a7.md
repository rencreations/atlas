# ADR-0105: Notification Preference Defaults

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for notification preference defaults emerged during review.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because notification preference defaults keeps regressing.
