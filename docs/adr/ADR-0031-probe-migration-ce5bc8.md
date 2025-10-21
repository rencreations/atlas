# ADR-0031: Cdn Cache Headers For Media

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling CDN cache headers for media exposed assumptions that no longer hold.

## Decision

We will extract the behavior into a dedicated module with explicit boundaries.

## Consequences

Positive: fewer moving parts and a single place to tune. Negative: a migration is needed before cleanup can land.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because CDN cache headers for media keeps regressing.
