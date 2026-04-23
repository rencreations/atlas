# ADR-0103: Collaboration Role Catalog Sync

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

A production incident around collaboration role catalog sync forced the decision.

## Decision

We will keep the current design, document its limits, and revisit after measurable load data exists.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because collaboration role catalog sync keeps regressing.
