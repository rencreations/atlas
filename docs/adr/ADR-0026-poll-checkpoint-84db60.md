# ADR-0026: Contribution Request Review Queue

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling contribution request review queue exposed assumptions that no longer hold.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because contribution request review queue keeps regressing.
