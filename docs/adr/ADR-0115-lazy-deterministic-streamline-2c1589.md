# ADR-0115: S3 Presign Ttl Tuning

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for S3 presign TTL tuning emerged during review.

## Decision

We will keep the current design, document its limits, and revisit after measurable load data exists.

## Consequences

Positive: clear ownership. Negative: one more module boundary to cross.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because S3 presign TTL tuning keeps regressing.
