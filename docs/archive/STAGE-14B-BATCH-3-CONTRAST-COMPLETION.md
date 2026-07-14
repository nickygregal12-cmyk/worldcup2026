> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# EURO 2028 PREDICTOR
## Stage 14B Batch 3 — Contrast completion
### Start checkpoint: `8e11edd` · 15 migrations

## Purpose

Close the four remaining light-theme WCAG contrast exceptions with the smallest token-only corrections and complete Stage 14B architecture enforcement.

## Ledger row moved

- WCAG token contrast audit: `PARTIAL` to `FUNCTIONAL` once all 58 light/dark pairs pass without an exception.

## Exact corrections

### Muted text

- previous light token: `--text-muted: #718096`;
- corrected light token: `--text-muted: #627085`.

The corrected value preserves the same muted blue-grey character while meeting the 4.5:1 normal-text threshold against every registered light surface:

- surface page: approximately 4.54:1;
- raised surface: approximately 5.03:1;
- soft surface: approximately 4.81:1.

The prior values were approximately 3.62:1, 4.01:1 and 3.83:1 respectively.

### Joker text

- previous light token: `--joker: #a66b00`;
- corrected light token: `--joker: #9c6500`.

The corrected value preserves the gold/brown joker identity while increasing contrast against `--joker-soft` from approximately 4.08:1 to approximately 4.52:1.

## Boundaries

- light-theme token values only;
- no dark-theme token change;
- no layout or component change;
- no selector or stylesheet ownership change;
- no scoring, joker behaviour, privacy, navigation, route or database change;
- no Migration 016.

## Enforcement

- every temporary contrast exception is removed from `scripts/architecture-policy.mjs`;
- future exceptions require an explicit approved Charter amendment;
- `npm run audit:design-tokens` must report zero exceptions;
- the full repository gate must remain green.

## Stage 14B completion

After owner acceptance and commit, Stage 14B closes with:

- Charter Section 11 restored and enforced;
- every active JSX file at or below the 400-line hard cap;
- zero temporary component caps;
- frozen global compatibility ceilings;
- dependency and fixture-import boundaries enforced;
- all registered light/dark contrast pairs passing;
- zero contrast exceptions;
- 15 migrations and no Migration 016.

## Next stage

Stage 13F-0 audits and implements the site-wide information architecture and access contract before new player-experience features are added.
