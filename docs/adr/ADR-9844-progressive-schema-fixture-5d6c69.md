# ADR-1000: Contribution Request Review Queue

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

A production incident around contribution request review queue forced the decision.

## Decision

We will extract the behavior into a dedicated module with explicit boundaries.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because contribution request review queue keeps regressing.
