> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 13A v6 — Design System, Navigation and Home

## Status

V6 supersedes the uncommitted v5 package. Product behaviour is unchanged; the package-lock is portable and guarded against private registry URLs.


Prepared from verified checkpoint `4e1ae38`. This frontend-only package supersedes every uninstalled Stage 13A v1–v4 package. It adds no database migration.

## Delivered

- one adjustable blue palette in `src/design/tokens.css`;
- semantic light and dark tokens with no raw colours in active page styles;
- self-hosted Space Grotesk headings and Inter interface text;
- Lucide as the single ordinary interface icon source;
- reusable buttons, cards, badges, progress bars, status bars, tabs, fields and accessible dialogs;
- responsive desktop navigation and five-position mobile navigation;
- permanent Position 2 Bracket destination;
- Position 1 driven by central tournament readiness:
  - Groups before the full Round of 16 readiness boundary;
  - KO after all 36 group results and all eight resolved Round of 16 pairings are ready;
- early KO access through More once at least one complete Round of 16 pairing exists;
- unresolved and TBC KO fixtures hidden from early access;
- permanent Group stage review inside More after KO becomes Position 1;
- signed-in and browser-guest Home dashboards;
- separate Original and KO progress, points, ranks and joker presentation;
- explicit loading, empty, error and partial-failure states;
- central tournament and scoring configuration rather than duplicated values;
- tokenised compatibility styling for proven Stage 6–12 screens;
- retirement of the temporary `src/foundation/foundation.css` stylesheet;
- six visual baselines under `docs/design-baselines/stage13a/`.

## Navigation states

### Before a complete Round of 16 pairing exists

**Groups · Bracket · Home · Leagues · More**

KO is absent from More.

### Early KO access

**Groups · Bracket · Home · Leagues · More**

KO appears in More when at least one Round of 16 fixture has both teams resolved. Only complete pairings render.

### Full KO readiness

**KO · Bracket · Home · Leagues · More**

The switch requires all 36 group matches completed, all eight Round of 16 fixtures resolved and a healthy canonical resolver. Groups then remains in More as **Group stage review**.

## Preserved boundaries

- Original Predictor and KO Predictor remain separate competitions and totals.
- The original bracket remains winner-only with no bracket jokers.
- Guest predictions remain browser-only and unscored.
- Existing result, scoring, league, lock, grace and admin behaviour is unchanged.
- No direct browser database writes were introduced.
- No external result provider was introduced.
- WC26 remains inactive and isolated.
- Staging remains `noindex` and browser-only.

## Design change control

The exact blue values may be refined later by editing `src/design/tokens.css` and updating the Design Charter. Components contain no individual palette values and do not need rebuilding for a palette change.

## Verification

```bash
npm run audit:design-tokens
npm run check
git status --short -- supabase/migrations
git diff --name-only -- supabase/migrations
```

Both migration commands must print nothing. Do not run Supabase reset, dry-run or push commands for this batch.

## Next work

After Stage 13A is verified and committed:

1. OB-1 Dependabot configuration as a separate commit.
2. OB-2 database backup and restore tooling as a separate commit.
3. OB-3 documented service-side staging admin access for Nicky.
4. Stage 13B Groups predictor and review flow, including `<TeamLabel>`, circle flags and the flagship score input.
