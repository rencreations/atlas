# ADR-0048: E2E Flakiness Triage

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

A production incident around e2e flakiness triage forced the decision.

## Decision

We will keep the current design, document its limits, and revisit after measurable load data exists.

## Consequences

Positive: faster to ship and easier to review. Negative: the advanced path still needs its own spike.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because e2e flakiness triage keeps regressing.
