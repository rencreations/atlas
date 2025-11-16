# ADR-0043: Web Push Subscription Pruning

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling web push subscription pruning exposed assumptions that no longer hold.

## Decision

We will standardize on a single code path and delete the legacy variant after one release cycle.

## Consequences

Positive: fewer moving parts and a single place to tune. Negative: a migration is needed before cleanup can land.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because web push subscription pruning keeps regressing.
