# ADR-0092: Soundboard Clip Upload Size

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for soundboard clip upload size emerged during review.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: clear ownership. Negative: one more module boundary to cross.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because soundboard clip upload size keeps regressing.
