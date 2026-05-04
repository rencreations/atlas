# ADR-0109: Notification Preference Defaults

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

The current implementation grew organically and now makes notification preference defaults hard to reason about.

## Decision

We will standardize on a single code path and delete the legacy variant after one release cycle.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because notification preference defaults keeps regressing.
