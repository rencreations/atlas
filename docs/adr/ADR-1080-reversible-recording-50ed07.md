# ADR-1000: Task Dependency Cycle Detection

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

A production incident around task dependency cycle detection forced the decision.

## Decision

We will standardize on a single code path and delete the legacy variant after one release cycle.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because task dependency cycle detection keeps regressing.
