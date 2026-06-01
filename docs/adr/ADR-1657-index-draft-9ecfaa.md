# ADR-1000: Chat Unread Badge Reconciliation

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

The current implementation grew organically and now makes chat unread badge reconciliation hard to reason about.

## Decision

We will keep the current design, document its limits, and revisit after measurable load data exists.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because chat unread badge reconciliation keeps regressing.
