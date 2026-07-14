> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# Euro 2028 Predictor — Stage 13D Batch 3
## Signed-in journey hardening and acceptance preparation

## Checkpoint

- Starting branch: `euro28-development`
- Starting commit: `5a48b25`
- Database migrations: `14`
- Database change: none
- Permitted Supabase project: `gcfdwobpnanjchcnvdco`

## Purpose

This batch hardens the complete Stage 13D journeys before signed-in staging acceptance. It does not change scoring, privacy rules, joker rules or the split between the Original Predictor and KO Predictor.

## Delivered

### Competition-safe comparisons

- League comparisons retain the competition key that started the request.
- Switching competition, member or league invalidates any older in-flight comparison.
- Overall leaderboard comparisons also accept only the newest request.
- League head-to-head cards show rank and points for the selected competition only.
- No combined points value is created.

### Privacy presentation

- Original privacy counts cover all 51 selections: 36 group scores and 15 original bracket picks.
- Completely private prediction journeys show one clear server-authorised privacy state rather than 51 repetitive hidden cards.
- Partially available KO journeys still show started fixtures and explicit private states for future fixtures.
- Hidden selections remain absent from browser RPC responses.

### Recovery and destructive-action safeguards

- A failed manual results refresh preserves the last available data.
- A stale slower request cannot replace a newer result or comparison.
- League deletion and leaving now require an explicit second confirmation.
- League list and overview failures leave clear retryable states.

### Deterministic QA scenarios

The Stage 13D development fixture supports:

- `active` — realistic signed-in mid-tournament data;
- `privacy` — Original predictions remain server-hidden;
- `partial` — selected competition sections fail while the remaining journey stays usable.

These fixtures are development/file-only and cannot activate on the deployed production-mode site.

Local QA examples after `npm run dev`:

```text
http://localhost:5173/?visual=stage13d&scenario=active#/leagues
http://localhost:5173/?visual=stage13d&scenario=privacy#/leagues
http://localhost:5173/?visual=stage13d&scenario=partial#/results
```

## Signed-in staging acceptance checklist

Use only `https://euro28-predictor-dev.netlify.app` and the Euro staging project.

1. Sign in with the authorised staging owner account.
2. Open Leagues and select each private league.
3. Confirm the same member list supports both separate competition tabs.
4. Compare a member in Original, switch to KO while loading, and confirm no Original response appears in KO.
5. Confirm Original hidden states before global lock do not reveal score or bracket selections.
6. Confirm KO sharing releases only fixtures that have started.
7. Confirm delete/leave requires explicit confirmation and cancel is safe.
8. Open Results and refresh while data is visible.
9. Confirm a failed section cannot remove successful live or competition sections.
10. Confirm live tables use canonical result context only.
11. Confirm all 15 live bracket positions remain separate from the predicted bracket.
12. Confirm Original and KO leaderboards, ranks and point breakdowns never combine.
13. Repeat core journeys at phone width without desktop-only controls.

Do not trigger the irreversible global tournament lock merely to test privacy. Use persisted staging state or the deterministic local privacy fixture.

## Acceptance boundary

This package prepares Stage 13D for final signed-in staging acceptance. Stage 13D is not declared complete until the repository gate, deploy verification and the manual staging checklist have been evidenced from the user environment.
