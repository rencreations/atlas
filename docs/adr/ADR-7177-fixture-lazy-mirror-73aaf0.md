# ADR-1000: Notification Preference Defaults

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling notification preference defaults exposed assumptions that no longer hold.

## Decision

We will keep the current design, document its limits, and revisit after measurable load data exists.

## Consequences

Positive: faster to ship and easier to review. Negative: the advanced path still needs its own spike.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because notification preference defaults keeps regressing.
