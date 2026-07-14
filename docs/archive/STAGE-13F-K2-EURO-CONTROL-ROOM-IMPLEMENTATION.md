> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# Stage 13F-K2 — Euro Control-Room Implementation

## Status

Implementation package from verified checkpoint `0e4d5b7`. Stage 13F-K3 remains the deployed role walkthrough and close-out gate.

## Purpose

Stage 13F-K2 connects the accepted Migration 018 operations to the protected Euro control room without expanding database scope. It completes the normal owner-facing fixture and scoring recovery surfaces, consolidates readiness, provides the approved Tournament Picks hand-off, and makes append-only evidence easier to inspect.

## Implemented surfaces

### Fixture schedule operations

Owners can update only scheduled date, active tournament venue, venue-local kick-off and schedule status. The client sends the persisted `fixture_revision`; stale writes fail closed. Results administrators can inspect scheduling but receive no edit action. Participant identity, match numbering, fixture code, group allocation and resolver slots remain non-editable.

### Whole-tournament scoring recovery

Owners receive a note-gated confirmation control that calls the canonical complete replacement reconciliation. It does not add manual points and does not merge Original Predictor and KO Predictor totals. Results administrators receive no reconciliation action.

### Operational readiness

One read-only summary groups fixture schedule, participant, result, scoring, Team Profile and safeguard evidence from the protected control-room RPC. It describes actionable gaps without inventing tournament data.

### Tournament Picks readiness

The control room now has one home for total goals, top scorer and highest-scoring team. It records 20 points each, one Original Predictor global lock, no joker and no KO points. No outcome-entry control exists before Stage 17A supplies persistence, official player references and executable scoring.

### Append-only audit inspection

The timeline loads up to 200 existing events, supports read-only category filters and exposes actor, target, match, timestamp, before/after fixture snapshots and scoring-run identifiers. It cannot mutate or delete evidence.

## Architecture and responsive evidence

`AdminOperations.jsx` is reduced below the 400-line cap by moving result operations and every new surface into focused components. New model/service tests cover role visibility, timezone conversion, optimistic payload construction, readiness, Tournament Picks boundaries and audit filtering. Six light/dark structural baselines cover 380, 768 and 1200 pixel targets. Stage 13F-K3 still requires normal-browser deployed review.

## Explicit exclusions

This batch adds no Migration 019, participant assignment, resolver rule, scoring value, manual point edit, tournament-pick persistence, official player data, external provider, new Admin role, global-lock action or invented shared-staging kick-off.

## Acceptance boundary

Stage 13F-K2 is implementation-complete only after the package audit, architecture audit, full repository gate, clean commit/push and deployed app-shell verification pass. Stage 13F-K3 then proves owner/results-admin behaviour on Euro staging and formally closes the complete Admin operations backbone before Stage 13G-A.
