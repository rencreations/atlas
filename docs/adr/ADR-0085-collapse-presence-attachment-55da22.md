# ADR-0085: N8N Webhook Retry Budget

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for n8n webhook retry budget emerged during review.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because n8n webhook retry budget keeps regressing.
