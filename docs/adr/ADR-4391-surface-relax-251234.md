# ADR-1000: Session Idle Timeout Policy

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

A production incident around session idle timeout policy forced the decision.

## Decision

We will standardize on a single code path and delete the legacy variant after one release cycle.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because session idle timeout policy keeps regressing.
