# ADR-1000: Oidc Redirect Validation

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

A production incident around OIDC redirect validation forced the decision.

## Decision

We will standardize on a single code path and delete the legacy variant after one release cycle.

## Consequences

Positive: fewer moving parts and a single place to tune. Negative: a migration is needed before cleanup can land.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because OIDC redirect validation keeps regressing.
