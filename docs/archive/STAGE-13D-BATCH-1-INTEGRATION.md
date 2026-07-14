> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# Euro 2028 Predictor — Stage 13D Batch 1
## League, result, sharing and points integration

Prepared: 2 July 2026

## Starting checkpoint

- Branch: `euro28-development`
- Commit: `3074377 Add Euro bracket and KO Predictor match centre`
- Active migrations: `14`
- Database migration added by this batch: no

## Delivered

### Private leagues

- Both competition standings load together through the existing competition-specific RPC.
- A failure in one competition table no longer removes the other table.
- The league landing shows separate current-user Original Predictor and KO Predictor summaries.
- The shared member list is derived without combining points.
- Mobile standings adapt into labelled cards.

### Shared predictions and comparison

- Existing server-authorised bundles remain the only source of another member's selections.
- Original selections render as private until the global lock bundle becomes visible.
- KO selections render fixture by fixture; future selections remain private.
- Member comparison now includes available score, bracket, advancing-team, method and joker context.

### Results and live tournament

- Canonical results, signed-in leaderboards and points use section-level settled loading.
- One failed leaderboard or points request no longer removes available live results.
- The fixture journey separates live, review, completed and upcoming states.
- Corrected result revisions are visible.
- Live group tables show played, wins, draws, losses, goal difference and points.
- The live bracket presents all 15 positions and keeps unresolved source slots honest rather than using preview fallback teams.

### Points

- Original group-match points and original bracket points remain separate within the Original Predictor breakdown.
- KO score, outcome, advancing-team and method points are shown only in the KO Predictor breakdown.
- Joker multipliers and corrected-result recalculation revisions are visible.
- Original and KO totals are never added together.

## Safeguards

- No direct browser writes were added.
- No scoring values, joker caps or multiplier were changed.
- No date-driven privacy bypass was added to components.
- No WC26 route or Supabase project was activated.
- No migration was added.

## Next Stage 13D batch

Add realistic signed-in visual fixtures and capture light/dark baselines at 380, 768 and 1200 pixels, then complete any usability corrections found during staging testing.
