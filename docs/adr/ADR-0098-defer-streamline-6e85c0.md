# ADR-0098: Cdn Cache Headers For Media

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

The current implementation grew organically and now makes CDN cache headers for media hard to reason about.

## Decision

We will keep the current design, document its limits, and revisit after measurable load data exists.

## Consequences

Positive: fewer moving parts and a single place to tune. Negative: a migration is needed before cleanup can land.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because CDN cache headers for media keeps regressing.
