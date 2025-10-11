# ADR-0024: Email Template Localization

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

A production incident around email template localization forced the decision.

## Decision

We will adopt the simpler option now and add the richer mechanism behind the feature flag.

## Consequences

Positive: fewer moving parts and a single place to tune. Negative: a migration is needed before cleanup can land.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because email template localization keeps regressing.
