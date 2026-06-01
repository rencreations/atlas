# ADR-1000: Move Env Parsing Into Typed Config Loaders

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

A production incident around move env parsing into typed config loaders forced the decision.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: faster to ship and easier to review. Negative: the advanced path still needs its own spike.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because move env parsing into typed config loaders keeps regressing.
