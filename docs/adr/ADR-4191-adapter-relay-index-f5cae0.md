# ADR-1000: Gallery Fractional Reordering

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

A production incident around gallery fractional reordering forced the decision.

## Decision

We will extract the behavior into a dedicated module with explicit boundaries.

## Consequences

Positive: fewer moving parts and a single place to tune. Negative: a migration is needed before cleanup can land.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because gallery fractional reordering keeps regressing.
