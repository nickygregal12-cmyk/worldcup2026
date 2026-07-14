> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-READINESS-1 — Public Signup Implementation Readiness

## Status

Recorded as the governing docs/audit-only contract for the final readiness step before any public signup implementation.

This stage records the product target only. It does not open public signup and does not implement runtime Auth/UI changes.

## Scope markers

The implementation readiness target must cover:

- public signup gates mapped to owner decisions;
- email confirmation ON expectations;
- support/contact-admin flow;
- 250-user / 20-league capacity guardrails;
- conservative privacy wording;
- display-name moderation expectations;
- low-cost/free hosting assumptions;
- exact “still closed until implementation” wording;
- explicit checks before any Auth config change;
- public signup remains closed until implementation gates are complete;

## Required user-facing outcomes

The product must keep public signup remains closed until implementation gates are complete until a later implementation stage explicitly scopes and verifies the actual public registration change.

The readiness target must connect public signup gates to recorded owner decisions, including support/contact-admin flow, email confirmation ON expectations, 250-user / 20-league capacity guardrails, conservative privacy wording, display-name moderation expectations and low-cost/free hosting assumptions.

## Safety boundaries

- No runtime UI changes in this stage.
- No route changes in this stage.
- No Auth configuration change in this stage.
- No Supabase schema, RPC, RLS, service-role or browser write change.
- No scoring engine change.
- No resolver behaviour change.
- No official result-entry change.
- No fake-result writes.
- No league writes.
- No Migration 019.

## Acceptance

This stage is accepted when the contract is recorded, the live roadmap/ledger/register mention the stage, `audit:public-signup-implementation-readiness` is wired into `npm run check`, active migrations remain 18 and Migration 019 is not created.
