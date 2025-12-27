# ADR-0058: Project Slug Migration Safety

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Two competing approaches for project slug migration safety emerged during review.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: predictable behavior everywhere. Negative: short-term churn in callers.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because project slug migration safety keeps regressing.
