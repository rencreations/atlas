# ADR-1000: Livekit Room Participant Limits

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

A production incident around LiveKit room participant limits forced the decision.

## Decision

We will keep the current design, document its limits, and revisit after measurable load data exists.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because LiveKit room participant limits keeps regressing.
