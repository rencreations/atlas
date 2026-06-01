# ADR-1000: Move Env Parsing Into Typed Config Loaders

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for move env parsing into typed config loaders emerged during review.

## Decision

We will standardize on a single code path and delete the legacy variant after one release cycle.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because move env parsing into typed config loaders keeps regressing.
