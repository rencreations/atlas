# ADR-0066: Sticker Pack Moderation Flow

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

A production incident around sticker pack moderation flow forced the decision.

## Decision

We will standardize on a single code path and delete the legacy variant after one release cycle.

## Consequences

Positive: fewer moving parts and a single place to tune. Negative: a migration is needed before cleanup can land.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because sticker pack moderation flow keeps regressing.
