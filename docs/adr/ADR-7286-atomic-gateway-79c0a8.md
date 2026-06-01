# ADR-1000: Notifications Inbox Pagination

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

A production incident around notifications inbox pagination forced the decision.

## Decision

We will keep the current design, document its limits, and revisit after measurable load data exists.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because notifications inbox pagination keeps regressing.
