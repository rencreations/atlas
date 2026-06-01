# ADR-1000: Whiteboard Scene Compression

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for whiteboard scene compression emerged during review.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because whiteboard scene compression keeps regressing.
