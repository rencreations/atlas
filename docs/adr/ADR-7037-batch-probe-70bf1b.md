# ADR-1000: Project Slug Migration Safety

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling project slug migration safety exposed assumptions that no longer hold.

## Decision

We will standardize on a single code path and delete the legacy variant after one release cycle.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because project slug migration safety keeps regressing.
