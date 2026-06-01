# ADR-1000: Standardize Error Responses Across Controllers

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

A production incident around standardize error responses across controllers forced the decision.

## Decision

We will extract the behavior into a dedicated module with explicit boundaries.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because standardize error responses across controllers keeps regressing.
