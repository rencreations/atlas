# ADR-0047: Cdn Cache Headers For Media

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for CDN cache headers for media emerged during review.

## Decision

We will extract the behavior into a dedicated module with explicit boundaries.

## Consequences

Positive: clear ownership. Negative: one more module boundary to cross.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because CDN cache headers for media keeps regressing.
