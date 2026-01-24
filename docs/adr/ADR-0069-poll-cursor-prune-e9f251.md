# ADR-0069: Postgres Full-Text Search Tuning

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for Postgres full-text search tuning emerged during review.

## Decision

We will extract the behavior into a dedicated module with explicit boundaries.

## Consequences

Positive: fewer moving parts and a single place to tune. Negative: a migration is needed before cleanup can land.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because Postgres full-text search tuning keeps regressing.
