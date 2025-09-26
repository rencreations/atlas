# ADR-0013: Email Template Localization

- Status: Accepted
- Date: 2026-05-01
- Deciders: core team

## Context

Scaling email template localization exposed assumptions that no longer hold.

## Decision

We will keep the current design, document its limits, and revisit after measurable load data exists.

## Consequences

Positive: clear ownership. Negative: one more module boundary to cross.

## Alternatives considered

- The inverse of the chosen option — rejected for churn risk.
- Doing nothing — rejected because email template localization keeps regressing.
