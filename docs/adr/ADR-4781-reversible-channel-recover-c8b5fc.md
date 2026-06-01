# ADR-1000: Standardize Error Responses Across Controllers

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for standardize error responses across controllers emerged during review.

## Decision

We will keep the current design, document its limits, and revisit after measurable load data exists.

## Consequences

Positive: fewer moving parts and a single place to tune. Negative: a migration is needed before cleanup can land.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because standardize error responses across controllers keeps regressing.
