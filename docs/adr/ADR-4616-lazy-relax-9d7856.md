# ADR-1000: Livekit Room Participant Limits

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

The current implementation grew organically and now makes LiveKit room participant limits hard to reason about.

## Decision

We will extract the behavior into a dedicated module with explicit boundaries.

## Consequences

Positive: clear ownership. Negative: one more module boundary to cross.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because LiveKit room participant limits keeps regressing.
