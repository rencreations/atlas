# ADR-1000: Attachment Deduplication

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

A production incident around attachment deduplication forced the decision.

## Decision

We will keep the current design, document its limits, and revisit after measurable load data exists.

## Consequences

Positive: fewer moving parts and a single place to tune. Negative: a migration is needed before cleanup can land.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because attachment deduplication keeps regressing.
