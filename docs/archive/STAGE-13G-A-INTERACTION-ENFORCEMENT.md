> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# Stage 13G-A — Interaction Enforcement Close-out

**Starting checkpoint:** `b38ec64`  
**Scope:** final Stage 13G-A enforcement slice  
**Database:** no migration; active migrations remain 18; Migration 019 must not exist.

## Delivered

- Remaining active-surface selectors are routed through the shared `SelectField` primitive.
- Native active-surface `<select>` use is rejected outside the design-system primitive and its tests.
- High-impact Admin actions use the shared `ConfirmDialog` path:
  - irreversible Original Predictor global lock;
  - database-enforced feature-control changes;
  - active grace-window revocation;
  - whole-tournament replacement scoring reconciliation.
- Native `window.confirm` and bare `confirm()` are rejected in active Euro UI roots.
- Ordinary manual refresh controls are removed outside retry/error states.
- `FOUNDATION_CLASS_RATCHET_CAP` records the current active `foundation-*` ceiling so the compatibility class count cannot grow silently.
- `audit:interaction-enforcement` is registered and included in `npm run check`.

## Explicit non-scope

- No database change.
- No Migration 019.
- No WC26 production touch.
- No Stage 13G-B Home/lifecycle implementation.
- No broad visual regression or multi-browser test matrix.

## Acceptance

Run:

```bash
npm run audit:interaction-enforcement
npm run check
```

Expected evidence:

- active migrations: 18;
- no Migration 019;
- native active-surface selectors: 0 outside `SelectField`;
- native confirmation calls: 0 outside `ConfirmDialog`;
- manual refresh controls: 0 outside retry states;
- full test and build gate passes.
