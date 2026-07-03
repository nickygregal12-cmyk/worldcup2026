# EURO 2028 PREDICTOR
## Stage 14B Batch 1 — Architecture governance and ratcheted audits
### Start checkpoint: `d522210` · 15 migrations

## Purpose

Restore the lost architecture authority and make current debt measurable before structural splitting begins.

## Ledger rows affected

This batch does not falsely mark Stage 14B complete. It establishes enforceable audits while preserving exact temporary exceptions for known debt.

- Charter architecture section: restored in documentation; final status remains open until all exceptions are removed.
- File-size/structure audit: introduced with exact frozen caps for the three current oversized screens.
- WCAG contrast audit: introduced with four exact light-theme exceptions discovered at `d522210`.
- Site-wide information architecture: recorded and assigned to Stage 13F-0.

## Delivered

- Charter v1.7 architecture amendment.
- Functional Completion Ledger v1.1.
- Rebuilt roadmap and decision-register addendum.
- `audit:architecture` wired into `npm run check`.
- Exact component and stylesheet caps that fail on growth and require cap reduction when files shrink.
- Dependency-direction and WC26-boundary checks.
- Production visual-fixture import debt frozen to the two existing imports.
- WCAG light/dark token-pair calculation in the design-token audit.
- Unit tests for line counting, import extraction, theme parsing, contrast calculation and contrast-debt ratcheting.

## Known debt deliberately not hidden

- `LeaguesFoundation.jsx`: 654 lines.
- `PredictionJourneyFoundation.jsx`: 581 lines.
- `ResultsAndLeaderboardsFoundation.jsx`: 447 lines.
- Four light-theme token pairs remain below 4.5:1 and may not regress.
- Four active global compatibility stylesheets remain frozen and may not grow.
- Two visual-fixture imports remain in the production graph and may not increase.

## Next Stage 14B batch

Split the three oversized screens, lower/remove their exact exceptions, then resolve the four token-contrast exceptions through an explicitly reviewed minimal token amendment. No feature or database change is permitted.
