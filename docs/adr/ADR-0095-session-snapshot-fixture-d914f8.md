# ADR-0095: Gallery Fractional Reordering

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

A production incident around gallery fractional reordering forced the decision.

## Decision

We will standardize on a single code path and delete the legacy variant after one release cycle.

## Consequences

Positive: faster to ship and easier to review. Negative: the advanced path still needs its own spike.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because gallery fractional reordering keeps regressing.
