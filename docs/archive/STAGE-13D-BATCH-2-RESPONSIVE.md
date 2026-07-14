> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# Euro 2028 Predictor — Stage 13D Batch 2
## Responsive fixtures and usability integration

This batch adds deterministic signed-in visual fixtures and responsive reference captures for the Stage 13D league and result journeys.

## Delivered

- realistic private-league data with twelve shared members;
- separate Original Predictor and KO Predictor standings;
- a shared-member comparison selector that is independent of the active standings table;
- a copyable authorised league join code;
- realistic canonical group and knockout results;
- live, confirmed, manual-review and corrected-result states;
- separate overall leaderboards and separate points breakdowns;
- collapsed completed-result history by default so live and review states remain prominent;
- light and dark baselines at 380, 768 and 1200 pixels for both Leagues and Results;
- a static audit for the fixture, responsive references and fourteen-migration boundary.

## Competition and privacy safeguards

The visual client exists only for deterministic development/file captures. Production staging does not activate it. The live application continues to use the existing server-authorised RPCs and canonical match reads.

- Original and KO totals are never combined.
- Predicted and live brackets are never blended.
- KO shared selections are represented only for fixtures whose status has started.
- No browser write path or scoring rule was added.
- No database migration was added.

## Visual fixture route

In development, the fixtures can be inspected with:

```text
?visual=stage13d&theme=light#/leagues
?visual=stage13d&theme=dark#/results
```

The fixture query is rejected by the production HTTPS build. It is accepted only by development builds or deterministic local file captures.
