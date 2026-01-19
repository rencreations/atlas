# ADR-0065: Soundboard Clip Upload Size

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

The current implementation grew organically and now makes soundboard clip upload size hard to reason about.

## Decision

We will keep the current design, document its limits, and revisit after measurable load data exists.

## Consequences

Positive: clear ownership. Negative: one more module boundary to cross.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because soundboard clip upload size keeps regressing.
