# ADR-0080: Web Push Subscription Pruning

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

The current implementation grew organically and now makes web push subscription pruning hard to reason about.

## Decision

We will standardize on a single code path and delete the legacy variant after one release cycle.

## Consequences

Positive: clear ownership. Negative: one more module boundary to cross.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because web push subscription pruning keeps regressing.
