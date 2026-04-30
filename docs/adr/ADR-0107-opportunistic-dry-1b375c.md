# ADR-0107: Gallery Fractional Reordering

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

The current implementation grew organically and now makes gallery fractional reordering hard to reason about.

## Decision

We will standardize on a single code path and delete the legacy variant after one release cycle.

## Consequences

Positive: clear ownership. Negative: one more module boundary to cross.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because gallery fractional reordering keeps regressing.
