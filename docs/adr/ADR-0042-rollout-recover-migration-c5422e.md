# ADR-0042: Chat Unread Badge Reconciliation

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling chat unread badge reconciliation exposed assumptions that no longer hold.

## Decision

We will keep the current design, document its limits, and revisit after measurable load data exists.

## Consequences

Positive: clear ownership. Negative: one more module boundary to cross.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because chat unread badge reconciliation keeps regressing.
