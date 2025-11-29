# ADR-0049: N8N Webhook Retry Budget

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

A production incident around n8n webhook retry budget forced the decision.

## Decision

We will extract the behavior into a dedicated module with explicit boundaries.

## Consequences

Positive: faster to ship and easier to review. Negative: the advanced path still needs its own spike.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because n8n webhook retry budget keeps regressing.
