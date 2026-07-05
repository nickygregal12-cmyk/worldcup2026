# Next chat prompt — Euro 2028 Predictor after Stage 13G Admin close-out

You are continuing the Euro 2028 Predictor project.

## Current repo state

The user will attach a fresh zip of their local repo. Work inside that uploaded repo only.

Expected branch: `euro28-development`  
Expected latest deployed commit before the handover-docs package: `64f2f3e Restyle Stage 13G admin control room`  
Development site: `https://euro28-predictor-dev.netlify.app`

Recently closed and deployed:

- `94934dd Split Stage 13G tournament and how to play`
- `734ad9b Rebuild Stage 13G account destination`
- `64f2f3e Restyle Stage 13G admin control room`

Active migrations remain 18. Do not create Migration 019 unless a genuine schema/read-contract gap is proved and explicitly approved.

## Files to read first

Read these repo docs before changing anything:

- `docs/STAGE-13G-HANDOVER-20260705.md`
- `docs/STAGE-13G-MATCH-CENTRE-REFERENCE-ADOPTION.md`
- `docs/STAGE-13G-PLAYER-DESTINATIONS-REFERENCE-ADOPTION.md`
- `docs/STAGE-13G-UI-COPY-HYGIENE-REFERENCE.md`
- `docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md`
- `docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md`
- `docs/EURO28-AGENT-RULES-AND-ROADMAP.md`
- `docs/EURO28-DESIGN-CHARTER.md`
- `docs/EURO28-SITE-ACCESS-MAP.md`

Reference artefacts now recorded under `docs/reference-prototypes/`:

- `euro28-stage13g-expanded-agent-prompt.md`
- `euro28-guest-transfer-modal-prototype.html`
- `euro28-head-to-head-page-prototype.html`
- `euro28-points-breakdown-page-prototype.html`
- `check-user-facing-spec-echo.mjs`
- Existing references for Tournament, How to Play, Account, Admin, Match Centre and Player View.

## Start by verifying the checkout

Run:

```bash
git status --short --untracked-files=all
git rev-parse --abbrev-ref HEAD
git log -10 --oneline
npm run verify:foundation-page
```

Do not continue if the branch is not `euro28-development` or if the tree has unrelated uncommitted work.

## Current completed stages

Do not rebuild these unless fixing a defect:

- Stage 13G-B-TOURNAMENT-1 — complete/deployed.
- Stage 13G-ACCOUNT-1 — complete/deployed.
- Stage 13G-ADMIN-1 — complete/deployed.

## Recommended next scoped work

The safest next step is **Stage 13G-MATCH-CENTRE-REF** as a docs/audit-only package, followed by **Stage 13G-MATCH-CENTRE-1** implementation.

Match Centre implementation must follow the signed-off decisions:

1. Group fixtures show only Original Predictor tab; no KO Predictor tab.
2. Group impact panel has `Live projection` and `Final` states.
3. Live projection reuses `resolveGroupTable`; no second standings calculator.
4. Bracket-point preview is read-only, labelled projected/confirmed, and never writes to persisted bracket predictions or alters the Original Bracket page.
5. Do not hardcode matchday 3; activate naturally when group status is live.
6. Knockout “Points on the line” panel remains unchanged.
7. Group fixtures use “This match’s predictions”.
8. No maximum-available framing for group fixtures.

If instead starting Player View, keep it as its own stage and reuse existing engines: `PlayerHeadToHead`/`loadLeagueHeadToHead`, `PointsBreakdown`/`normalisePointsBreakdown`, and existing player insight services. Do not rebuild scoring/resolver logic.

If starting UI-copy hygiene, only wire the audits once all three named files are present: `check-user-facing-copy-hygiene.mjs`, `user-facing-copy-hygiene-policy.mjs`, and `check-user-facing-spec-echo.mjs`. In the handover upload, only the spec-echo file was present.

## Required acceptance style

Every package must include:

- docs/register/ledger/charter updates in the same patch;
- focused audit wired into `npm run check`;
- `npm run check` and `npm run build` before commit;
- post-deploy `npm run verify:foundation-page`;
- no Migration 019 unless explicitly approved;
- a clear terminal install guide and exact commit message.
