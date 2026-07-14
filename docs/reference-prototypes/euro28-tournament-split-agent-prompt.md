# Prompt for the build agent — Tournament / How to Play, Account, Admin, Match Centre, Player View and UI-copy corrections

Paste this in, with all eleven reference files attached: `euro28-tournament-page-prototype.html`, `euro28-how-to-play-page-prototype.html`, `euro28-account-page-prototype.html`, `euro28-admin-page-prototype.html`, `euro28-match-centre-page-prototype.html`, `euro28-guest-transfer-modal-prototype.html`, `euro28-points-breakdown-page-prototype.html`, `euro28-head-to-head-page-prototype.html`, `check-user-facing-copy-hygiene.mjs`, `user-facing-copy-hygiene-policy.mjs` and `check-user-facing-spec-echo.mjs`.

---

I'm handing you eight HTML reference prototypes, three ready-to-use governance/audit files, and one investigation-plus-build task, covering six parts: a scope correction and split for Tournament/How to Play, a real rebuild of the thin Account screen (including a proper mock of the guest-transfer modal that replaces the old inline card), a cosmetic-only restyle of the Admin control room, a content upgrade for Match Centre so it serves group matches as well as it already serves knockout matches, building the already-designed dedicated Player View plus its two real sub-destinations (Head-to-head and Points Breakdown, both now mocked as full pages) and retiring a large orphaned legacy directory found while checking that, and finally two already-built, already-tested audit scripts that stop admin/dev language and frozen spec prose drifting into user-facing UI — both failure modes actually found live in this repo, not hypothetical. Read all eight attached HTML files first — they are the approved reference for content, layout and (for Admin) visual language, in the same spirit as the existing Bracket and League reference prototypes already adopted into the project (`docs/reference-prototypes/`). Do not treat them as pixel-perfect final markup; treat them as the approved information architecture, copy tone and data source discipline.

This brief has six independent parts — Part A (Tournament/How to Play), Part B (Account), Part C (Admin), Part D (Match Centre), Part E (Player View / H2H / Points Breakdown) and Part F (UI-copy hygiene). They can be sequenced as separate stages/PRs; nothing in one blocks the others.

---

## Part A — Tournament / How to Play

### A0. Before you touch anything

Check `docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md`, `docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md` and `docs/EURO28-AGENT-RULES-AND-ROADMAP.md` for the existing **Stage 13G-B — Tournament comprehension and chronology** entry. It is currently `SCHEDULED` and describes rebuilding Tournament as a key destination with facts from canonical sources.

If Stage 13G-B (or any other stage) already covers part of this work, **amend that stage's entry in place with the corrected scope below** rather than creating a duplicate stage. Only create a new stage id if nothing existing covers it. Either way, the docs must end up internally consistent — Charter, Agent Rules, Decision Register and Ledger must all agree, exactly as the existing audit scripts for other reference-adoption stages check for.

### A1. The problem, in plain terms

Two separate issues, both real:

**A. Two of the tournament's own canonical facts are stale, not just missing.**

- `src/config/tournament.js` → `TOURNAMENT_CONFIG.dates.tournamentEndAt` is `null`.
- `docs/archive/STAGE-1-TOURNAMENT-MODEL.md` treats venue names as undisclosed.

Both are wrong as of now. UEFA confirmed the full schedule and all 9 stadium names on 12 November 2025:

- Tournament runs **9 June – 9 July 2028**.
- Opening match: **Principality Stadium, Cardiff**, Fri 9 June 2028.
- Semi-finals and final: **Wembley Stadium, London** (semis 4–5 July, final 9 July).
- All 9 confirmed venues: Wembley Stadium and Tottenham Hotspur Stadium (London), Principality Stadium (Cardiff), Etihad Stadium (Manchester), Hill Dickinson Stadium (Liverpool), St James' Park (Newcastle), Villa Park (Birmingham), Hampden Park (Glasgow), Aviva Stadium (Dublin).
- 4 host nations: England, Scotland, Wales, Republic of Ireland. Northern Ireland is **not** a host nation (Casement Park was dropped).
- Format is unchanged: 24 teams, 6 groups of 4, top 2 plus the 4 best third-placed teams advance to the Round of 16, no third-place play-off.

Group participants and match-specific kick-off times genuinely are still unconfirmed — don't invent those. But dates, venues and host nations are public, confirmed facts and should be added to the canonical config and Stage 1 doc, not left as placeholders. Fix the source of truth once; every page that reads from it (including the two below) inherits the correction for free.

**B. The IA itself was wrong, not just the content.**

The current `#/tournament` destination conflates two things that don't belong on one page:

- Facts about the football tournament (hosts, venues, dates, format, groups) — this is *reference content that changes over the life of the tournament* and keeps earning return visits as groups resolve and the competition progresses.
- Facts about how the Predictor scores and locks — this is *mechanics content that never changes once set*, and gets checked constantly and repeatedly (people settle arguments with it).

Bundling them means the reusable half gets diluted by the one-and-done half, and the page goes dead the moment someone's read the tournament facts once. Split it into two destinations.

### A2. Required changes

1. **Data correction** — update `src/config/tournament.js` (`TOURNAMENT_CONFIG`) and `docs/archive/STAGE-1-TOURNAMENT-MODEL.md` with the confirmed dates, venues and host nations above. Keep the existing provisional/confirmed distinction the codebase already uses — group participants and kickoff times stay explicitly unconfirmed; dates, venues and host nations become confirmed. No invented specifics beyond what's public and cited above.

2. **Split `#/tournament` into two destinations**:
   - **Tournament** — hosts, venues (with opener/final tags), key dates, format ladder, groups (provisional slots, one plain status line, no invented FAQ about it). Modelled on `euro28-tournament-page-prototype.html`.
   - **How to play** — the two competitions explained in plain language, scoring reference tables, lock-timing rules, FAQ about mechanics only. Modelled on `euro28-how-to-play-page-prototype.html`.
   - Update the Site Access Map, bottom-nav/More entries and any router config accordingly. Both remain More/footer destinations, consistent with League's existing pattern (no primary bottom-nav placement, no forced back-button).
   - Rebuild `src/tournament/TournamentOverview.jsx` into two components/routes rather than one, both still reading exclusively from canonical config (`EURO_SCORING_CONFIG`, `TOURNAMENT_CONFIG`) and the tournament/group resolver — no hardcoded counts, stages, dates or scoring values in either component.

3. **Drop the "why can't I see real teams yet" framing entirely.** Groups should show a plain, low-drama status ("Qualifying under way" badge + one line saying slots fill in automatically), not a defensive FAQ answer. This applies to both the old stub copy and anything already drafted under Stage 13G-B.

4. **Docs discipline** — update whichever of Charter, Agent Rules, Decision Register and Ledger reference the old single-page Tournament & How to Play destination, so they describe the two-destination split consistently. Add or amend the audit script the project already uses for reference-adoption stages (see `check-stage13g-bracket-reference-adoption.mjs` for the pattern) to check for the split and the corrected facts, and wire it into `npm run check`.

### A3. Constraints — same governance as every other stage here

- Active migrations stay at 18 unless you can prove a genuine schema gap — this is docs/config/UI only, so no new migration is expected.
- No Supabase writes, no scoring/resolver logic changes.
- No hardcoded counts, dates or scoring values anywhere in the new components — everything reads from central config.
- Run `npm run check` and `npm run build` before considering this done; add the new audit to `npm run check` rather than leaving it standalone.
- Keep docs and code in the same state of truth — if you correct `tournament.js`, correct the doc that describes it in the same pass.

### A4. Start here

```bash
git status --short
git log -10 --oneline
grep -n "13G-B" docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md docs/EURO28-AGENT-RULES-AND-ROADMAP.md
```

Confirm the current state of Stage 13G-B in all three docs before writing anything, then propose the amended stage scope (or new stage id, if 13G-B genuinely doesn't cover it) before starting the build.

---

## Part B — Account

### B0. Before you touch anything

Search the Decision Register, Ledger and Agent Rules for any existing entry describing the Account destination (it currently only appears as "Authentication, recovery and profile" in the Site Access Map). If nothing scheduled covers a real Account rebuild, this is a new stage — propose an id in the same `13G-*` family and get it recorded in all four governance docs before building, same discipline as every other stage here.

Also flag, don't silently fix: `src/pages/Profile.jsx` is legacy WC26 code (`useAuthStore`, badges, `WorldCupLogo`, avatar emoji picker, push-notification subscribe/unsubscribe) and is **not imported by `App.jsx`** — the real Account route renders `src/auth/AccountAccess.jsx`. Confirm this is genuinely dead before deleting it; if it's dead, retiring it belongs in this stage's scope since it's directly adjacent to the file you're rebuilding.

### B1. The problem, in plain terms

Signed in, `AccountAccess.jsx` currently renders: a display-name form, a read-only email, a sign-out button, and — only when a local guest draft exists — a transfer prompt *inline in the page*, every time Account is opened. That's two problems, not one: the page is thin (once someone's set their name, there's no reason to open it again), and the transfer prompt is in the wrong place (it should interrupt once, right after sign-in, then get out of the way — not sit there as a recurring fixture). `euro28-account-page-prototype.html` deliberately does **not** include a guest-transfer card for this reason — that flow moves to a one-time modal, covered in point 3 below.

### B2. Required changes

Rebuild the signed-in state of `AccountAccess.jsx` (the `session?.user && !isRecovery` branch) per `euro28-account-page-prototype.html`:

1. **Identity header** — avatar/initial, display name, editable name field (existing `updateOwnDisplayName` flow, keep as-is), email shown read-only exactly as now.
2. **Quick stats card** — real counts pulled from the account's own prediction/league data: leagues joined, group predictions saved (`x/36`), jokers armed (`x/5`). Read from existing prediction/league queries — do not add new scoring logic, this is a read/aggregate only. If a genuinely new query is needed, keep it read-only and cheap (count, not full row fetch).
3. **Guest transfer — a one-time modal right after sign-in, not a persistent Account card.** `euro28-guest-transfer-modal-prototype.html` is the reference for this — it shows the modal itself (heading, local-draft summary counts, two actions, one-time framing note) over a dimmed backdrop, since the earlier version of this brief only described the modal in prose. Earlier guidance in this brief said to restyle `GuestAccountTransfer` as a card inside Account. That was wrong — a returning user shouldn't see this prompt every time they open Account. It must trigger once, immediately after a successful sign-in or sign-up that finds a local device draft, as a modal (reuse the existing `ConfirmDialog`/dialog primitive, not a new pattern), and never appear again once a choice is made. Concretely: move the trigger into `submitLogin`/`submitRegistration`'s success path in `AccountAccess.jsx` (or wherever session transition is first detected) rather than rendering `<GuestAccountTransfer>` unconditionally in the signed-in view. The existing "reopens an accepted contract" wording work below still applies — it just now describes a modal's heading/actions instead of an inline card's.

   This is also a reopened accepted contract, not just a copy tweak — the current "Import predictions to my account" / "Start fresh" wording is Stage 13G-C1, already `ACCEPTED`, and locked word-for-word by `scripts/check-stage13g-c1-guest-import-prompt.mjs` across six files. The "import" framing doesn't fit the product's tone — a signed-in user shouldn't be asked to "import" their own predictions, and naming the technical action (import/sync/refresh) rather than the plain choice (keep vs. start fresh) doesn't fit anywhere else in the app either. Replace it with:
   - heading: **"Keep your predictions from this device?"**
   - primary action: **"Keep these predictions"**
   - secondary action: **"Start fresh"** (unchanged)

   Thread this wording through every file the audit checks, not just the trigger point: `docs/archive/STAGE-13G-C1-GUEST-IMPORT-PROMPT.md`, `src/guest/GuestAccountTransfer.jsx`, `src/guest/guestAccountTransferModel.js`, `src/guest/guestAccountTransferPresentation.js`, `src/guest/__tests__/guestAccountTransferModel.test.js`, `src/guest/__tests__/GuestAccountTransfer.test.jsx`, **and** `scripts/check-stage13g-c1-guest-import-prompt.mjs` itself (its hardcoded marker strings on lines 36–38 need updating to match). Update the stage doc's status/changelog entry to record both the copy revision and the modal-placement correction rather than silently rewriting an "ACCEPTED" stage with no record. The underlying transfer logic (`buildGuestAccountTransferPrompt`, competition-boundary rules, "Start fresh clears local draft, never touches account data") does not change — this is presentation and placement only.
4. **New: "Clear my predictions" danger-zone action.** This is genuinely new functionality, not a restyle — there is currently no way for a signed-in user to wipe their own Original Predictor group scores and bracket picks. Requirements:
   - Visible only before the Original Predictor locks — derive this from `resolveTournamentLifecycle()`, the same central lifecycle resolver already used for account autosave, not a raw database lock-field check.
   - Scope: clears Original Predictor group scores and bracket picks only. Does not touch KO Predictor (which isn't open pre-lock anyway), leagues, or account identity.
   - Destructive confirm dialog matching the existing sign-out `ConfirmDialog` pattern exactly — tone `danger`, explicit "can't be undone" copy, cancel defaults focus.
   - Needs a new, explicitly scoped service function (e.g. alongside `predictionSaveService.js`) and test coverage, plus an audit assertion that it's hidden once locked. Do not repurpose `clearStale`/`clearStaleBracketSelections` from `PredictionJourney.jsx` — that clears only stale re-pick slots, not a full reset, and reusing it would silently change its contract.
5. **Security & preferences card** — a "Change password" row (reuse `requestPasswordReset`/existing reset flow), plus two disabled "Coming soon" rows: **"Match reminders"** and **"Daily points update"** (a daily summary of how predictions scored). Do **not** build actual notification functionality here — push notifications/PWA is still an open decision elsewhere in the roadmap; these rows are visible placeholders only, and must not claim to do anything they don't.
6. **Leagues shortcut card** — a single row linking to `#/leagues`, so Account isn't a dead end. No new leagues logic; this is a nav link using data already available (league count/names).
7. **Danger zone card** — sign-out button and its existing `ConfirmDialog`, copy unchanged, plus the new "Clear my predictions" action from point 4 above, in the same card.

### B3. Constraints

- No new Supabase writes beyond what already exists (display name update, sign out, guest transfer) **plus** the one new, tightly-scoped write for "Clear my predictions" — deletes/resets Original Predictor group scores and bracket picks for the signed-in user only, nothing else.
- Stats remain read-only aggregates. No migration expected for stats or the copy change. If "Clear my predictions" genuinely needs a migration (e.g. no existing delete/reset RPC covers this safely), stop and get it approved separately — don't fold a schema change into a UI stage.
- Keep `updateOwnDisplayName`, `signOut` and `ConfirmDialog` exactly as they behave today.
- The guest-transfer copy change (point 3 above) must update the audit script's own marker strings, not just the component and docs — an accepted-stage audit that still checks for the old wording will fail against the corrected code, which is the intended signal that the doc/copy update is real and not just done in the component.
- "Clear my predictions" must be provably hidden after lock — add this as an explicit audit assertion, the same way Original Bracket's absence-of-controls is audited, not just a UI condition nobody tests.
- Confirm `Profile.jsx` is dead code before deleting it (check for any remaining import, including lazy/dynamic routes) — if confirmed dead, remove it in this stage rather than leaving a second, contradictory "Account" implementation sitting in the repo.

---

## Part C — Admin

### C0. Before you touch anything

This is **cosmetic only** — no admin power, permission, data operation or route change. Confirm that scope with yourself before starting: if a change would alter what an admin can do rather than how it looks, it's out of scope for this stage.

Read `docs/archive/STAGE-13F-F-ADMIN-CONTROL-ROOM-VISUAL-REBUILD.md` first — it's the last visual pass on this surface (checkpoint `8349e83`) and this stage supersedes/extends it, not duplicates it. Record this stage as a new entry referencing that one, the same way Stage 13G-BRACKET-REF referenced the earlier Bracket work.

### C1. The problem, in plain terms

The live admin route is `src/admin/AdminOperations.jsx` (not `src/pages/AdminPanel.jsx`, which is dead WC26 code still headed "WC26 Control Centre" and isn't imported anywhere — confirm and retire it in this stage too, same as Profile.jsx in Part B).

`AdminOperations.jsx` and its stylesheet, `src/admin/AdminControlRoom.module.css`, use a **different token set** from the rest of the app: `--border-default`, `--surface-soft`, `--text-link`, `--focus-ring`, and critically `--brand: #1667d9` (bright blue) defined in `src/design/tokens.css`, versus the `--brand: #173A66` "night match" navy that the Bracket, League and Home reference prototypes are built on. That mismatch — not just spacing or component polish — is the real reason Admin reads as visually out of step with the rest of the product. This needs reconciling before any component-level restyle, not after.

### C2. Required changes

1. **Reconcile the token conflict first.** Confirm which brand colour is actually current — check whether `src/design/tokens.css` has simply drifted from the approved Charter palette, or whether the Charter itself needs updating. Don't silently pick one; surface the conflict, propose the fix (most likely: `tokens.css` should be corrected to match the Charter's navy, since that's what every other adopted reference prototype already assumes), and get it confirmed before touching component markup.
2. **Restyle `AdminControlRoom.module.css` onto the corrected tokens** — hero, meta chips, section nav, section cards, summary grid, health rows, warning banners, audit timeline — per `euro28-admin-page-prototype.html`. This prototype only fully mocks the Overview and Audit sections; extend the same card/chip/badge/row primitives across the remaining sections (Results, Corrections, Fixtures, Phase & safeguards, Grace, Time, Team content, Scoring, Tournament Picks) rather than inventing new patterns per section.
3. **Keep every data binding, prop, action handler and permission check in `AdminOperations.jsx` and its child components completely unchanged.** This stage touches CSS and markup structure/classnames only, not `adminOperationsService.js`, not the section components' logic, not `ADMIN_SECTION`/`ADMIN_SECTIONS` routing.
4. **Retire `src/pages/AdminPanel.jsx`** once confirmed dead (no imports, no route reference) — don't leave a second, contradictory "Admin" implementation with wrong tournament branding sitting in the repo.

### C3. Constraints

- Zero behavioural change: every button, confirm dialog, role check and audit write must do exactly what it does today.
- No new admin sections, no new data reads beyond what's already loaded by `loadAdminOperations`.
- If the token reconciliation in C2.1 turns out to affect other components already reading `--brand` from `tokens.css`, that's expected and fine — it's a shared token, so fixing it corrects Admin and doesn't newly break anything else. Run the full visual/build check afterwards to confirm.
- Run `npm run check`, `npm run build` and the existing `audit:admin-*` scripts before considering this done — they test behaviour, and behaviour must be identical before and after.

## Part D — Match Centre

Status: design signed off below. This is the approved contract for the next chat/agent to implement — treat Decisions 1–8 the same way Stage 13G-BRACKET-REF's decisions were treated: recorded verbatim across the governance docs, enforced by an audit script, then built.

### D0. Before you touch anything

Read `docs/archive/STAGE-13F-C-EURO-MATCH-CENTRE.md` first — the real Match Centre already exists at `src/matchCentre/MatchCentre.jsx` / `matchCentreModel.js` / `matchCentreService.js` (explicitly built to replace WC26's `MatchStats.jsx`, which is separate legacy code — do not confuse the two, and do not touch `src/pages/MatchStats.jsx`). Check the Decision Register/Ledger for any existing entry describing Match Centre content quality and amend it in place if one exists; otherwise record this as a new stage in the `13G-*` family — propose `13G-MATCH-CENTRE-REF` for the docs/audit-only reference-adoption package this part describes, followed by a separate `13G-MATCH-CENTRE-1` implementation stage, mirroring how Bracket-REF preceded Bracket-1.

### D1. The problem, in plain terms

The shell is good and shouldn't change: fixture nav, fixture hero, lifecycle status bar, viewing-scope selector are all solid and stay exactly as they are. Two things are actually wrong, not one:

1. **The competition tabs are wrong for group fixtures.** `COMPETITION_OPTIONS` in `MatchCentre.jsx` is a static two-option list rendered unconditionally. A group-stage fixture has no corresponding KO Predictor entry at all — KO Predictor doesn't exist until the real knockout draw is known — so showing that tab on a group fixture isn't just premature, it's offering a choice that doesn't apply to what's on screen.
2. **The two content panels don't fit their fixture types.** Knockout fixtures feel more useful because seeing who's picked to advance implicitly tells the bracket story. Group fixtures don't have an equivalent — and "Points on the line" as a headline doesn't make sense for a group match specifically because group predictions always have points riding on them; framing it as a discovery ("here's what's at stake") is hollow when it's true of literally every group match by default. What's actually interesting for a group fixture is live and specific to *this* match and *this* group: how the group table is shifting, what that live shift is worth in bracket points if it held, and how each real prediction for this fixture is doing against the current score.

### D2. Required changes — signed-off decisions

**Decision 1 — Conditional competition tabs.** For group-stage fixtures (`matchNumber <= 36`), render the Original Predictor tab only — no KO Predictor tab, not even disabled. Add a short note explaining why ("This is a group match — there's no KO Predictor entry for it. KO Predictor opens once the real knockout draw is known."). Knockout fixtures (`matchNumber > 36`) keep both tabs exactly as today.

**Decision 2 — Group impact panel gets a live/final state.** The existing group standings table (position, team, played, goal difference, points) stays, but now carries an explicit state: `Live projection` while any match in that group is currently in progress, `Final` once every match in the group is confirmed. This state is derived from the group's overall live status, not just this one fixture — matchday 3's simultaneous kick-offs are exactly when this matters, but the logic itself just asks "is anything in this group still live," it never hardcodes a matchday number.

**Decision 3 — Live projection reuses the real resolver, never a second calculator.** While a group is live, feed the in-progress live scores through the exact same `resolveGroupTable` (from `src/resolver/groupStandings.js`) already used for confirmed standings, substituting live scores as the input where confirmed results would normally go. This is compute-only and ephemeral — it must never write to any persisted standings/result table, and it recalculates fresh on every load/poll. The moment the group's results are all confirmed, the same function runs on confirmed data and the badge flips to `Final`.

**Decision 4 — Bracket-point preview, read-only and clearly provisional.** Directly beneath the group table, show the signed-in player's own predicted qualifiers for that group and what they'd currently be worth in bracket points if the live-projected table held — computed by running the same canonical pipeline already used elsewhere (`resolveGroupTable` → `rankBestThirdTeams`/`resolveBestThirdAssignments` → `resolveKnockoutBracket`) with the live-projected table as input, then cross-referencing against the player's existing Original Predictor bracket picks and `EURO_SCORING_CONFIG.bracket` values. Hard boundaries, non-negotiable:
   - This is a Match Centre-only, on-screen projection. It must never write to `bracket_predictions` or any other persisted table.
   - It must never appear on, or in any way alter, the actual Original Bracket page — that page's `pureMode=true` behaviour (always reflecting frozen predictions, never blended with live results) is an established architectural rule and this feature does not get an exception.
   - Label it unambiguously as a projection ("If this held," badge `Projected`) until the group's results are confirmed, at which point it becomes `Confirmed` and shows the real points earned.

**Decision 5 — This activates naturally, not on a schedule.** Don't special-case "matchday 3" anywhere in code. The live-projection and bracket-preview panels simply activate whenever the group has a live match; because simultaneous final-round fixtures are what actually move a projection, matchday 3 will be where this is visibly most useful, but that's a consequence of real fixture timing, not a rule to encode.

**Decision 6 — "Points on the line" is unchanged for knockout fixtures.** Keep the existing panel exactly as it is today for `matchNumber > 36` — advancing-team pick, "up to N points" framing, same privacy gates. This framing is correct there because a single knockout tie genuinely creates one discrete, dramatic stake.

**Decision 7 — Group fixtures get a different panel: "This match's predictions."** Replace "Points on the line" for group fixtures with a panel listing what real players predicted for *this specific fixture*, each row carrying a live comparison against the current score rather than a maximum-points figure — for example "Exact score so far," "Not on track yet," moving to a confirmed result once full time is reached. Protected/pre-lock predictions still show the existing privacy-gated "Visible after lock" treatment, unchanged.

**Decision 8 — No "maximum available" framing on group panels.** Since every group prediction always has points riding on it, don't headline the group panel with a points-available badge the way the knockout panel does — the news for a group fixture is "how is everyone doing right now," not "here's what's at stake."

Reference: `euro28-match-centre-page-prototype.html` implements Decisions 1, 2, 3 (visually — live vs final badge), 4 (visually — the bracket-preview block), 6, 7 and 8. It doesn't (and can't, being static HTML) implement the actual live resolver computation — that's D2 below in code terms.

### D3. Constraints

- No changes to `MatchCentre.jsx`'s fixture nav, hero, status bar or viewing-scope selector — this stage changes the competition tabs (Decision 1) and the two content panels, nothing else in the shell.
- No new scoring logic beyond composing existing resolvers as described in Decisions 3–4. Recalculating standings or bracket paths with bespoke logic inside `matchCentreModel.js` instead of calling the shared resolvers is out of scope.
- No migration expected — every input to the live projection already exists (live snapshot data, existing predictions); this is a new read/composition, not new storage.
- Original and KO Predictor separation stays exactly as it is; the new panels must not blend or reference cross-competition points.
- The bracket-point preview (Decision 4) is the one piece of this stage that touches the project's hardest boundary (predicted bracket must never blend with live results) — treat any ambiguity here as a stop-and-confirm moment, not a judgment call to make silently.
- Add or extend `scripts/check-stage13f-match-centre.mjs` (or a new `check-stage13g-match-centre-reference-adoption.mjs`, matching the Bracket-REF pattern) to assert: conditional tabs render correctly per fixture type, the group panel shows `Live projection`/`Final` correctly, the bracket-preview never fires for knockout fixtures, and the knockout panel is completely unchanged. Wire it into `npm run check`.

## Part E — Player View, Head-to-head and Points Breakdown

Two of the three prototypes for this part already exist in the repo and are already signed off: `docs/reference-prototypes/euro28-player-view-prototype.html`, adopted via `docs/archive/STAGE-13G-PLAYER-VIEW-REFERENCE-ADOPTION.md`. That prototype mocks the player-view hub with buttons pointing at Head-to-head and Points Breakdown, but not what those two destinations actually look like as full pages — so two new prototypes are attached to fill that gap: `euro28-points-breakdown-page-prototype.html` and `euro28-head-to-head-page-prototype.html`. This part is otherwise an investigation-then-build task, not a from-scratch design task.

### E0. Before you touch anything

This is not a case of scope being lost — check first, but expect to confirm the opposite. `docs/archive/STAGE-13G-PLAYER-VIEW-REFERENCE-ADOPTION.md`, the Decision Register, the Agent Rules and the Ledger all already describe the same accepted "S5 shape" in detail: a dedicated player view opened from league rows and other player-entry points, with header, Predictions/Bracket/Tables, and header actions routing to real Head-to-head and Points-breakdown destinations at `#/player/:userId` and `#/player/:userId/points`. The Ledger correctly marks this `SCHEDULED` under Stage 13G-C. Run:

```bash
git log --oneline -- docs/archive/STAGE-13G-PLAYER-VIEW-REFERENCE-ADOPTION.md
git log --oneline -- src/player/
git log --oneline -- src/leagues/Leagues.jsx
```

Confirm the REF package's history shows normal doc-then-schedule progression, not a revert or a dropped follow-up commit that never landed. If it genuinely looks like a build was started and lost, say so explicitly in your reply before proceeding — don't quietly re-derive the design from scratch when a signed-off reference already exists.

### E1. The actual gap, confirmed against the live code

- `src/leagues/Leagues.jsx` already wires a member-row click to open `PlayerHeadToHead` (from `src/player/index.js`) inline via `LeagueDetailDestination` — this part works and is correctly marked `✅ FUNCTIONAL` in the Ledger for H2H specifically.
- There is no dedicated Player View component anywhere in `src/` — `PlayerView` doesn't exist as a component, only as a docs/prototype reference.
- There is no route to a Points Breakdown destination reachable from a league member row at all. A working `PointsBreakdown` component already exists at `src/results/ResultsPresentation.jsx` (`export function PointsBreakdown({ title, section, competitionKey })`), used today from Results/Leaderboards — reuse this component, do not rebuild it.
- **Separately, and larger than this one gap**: `src/pages/HeadToHead.jsx` and `src/pages/PointsSummary.jsx` are both completely dead — confirmed zero imports anywhere in `src/`. Checking further, the entire `src/pages/` directory (20 files: `AdminPanel.jsx`, `AuthCallback.jsx`, `Awards.jsx`, `ClaimAccount.jsx`, `GlobalStats.jsx`, `HeadToHead.jsx`, `Home.jsx`, `HowToPlay.jsx`, `KOPredictor.jsx`, `Knockout.jsx`, `Leaderboard.jsx`, `Leagues.jsx`, `Login.jsx`, `MatchStats.jsx`, `NotFound.jsx`, `PointsSummary.jsx`, `Predictions.jsx`, `Profile.jsx`, `PublicLeague.jsx`, `Register.jsx`, `ResetPassword.jsx`) is orphaned WC26-era code — `main.jsx` only ever imports `App.jsx`, and nothing in `src/` outside `src/pages/` itself imports anything from it. This is the same dead-file pattern already caught individually for `AdminPanel.jsx` and `Profile.jsx` in Parts B and C above, just far larger in scope than those two isolated findings suggested.

### E2. Required changes

1. **Build the dedicated Player View** per the already-adopted reference (`euro28-player-view-prototype.html` / `STAGE-13G-PLAYER-VIEW-REFERENCE-ADOPTION.md`) — header with rank context, Original/KO kept strictly separate, Predictions/Bracket/Tables tabs, and header actions linking to real Head-to-head and Points-breakdown destinations. This is Stage 13G-PLAYER-1, following the same REF-then-implementation split as Bracket-REF → Bracket-1.
2. **Build the two destinations themselves** per the two new prototypes:
   - `euro28-points-breakdown-page-prototype.html` at `#/player/:userId/points` — reuses the existing `PointsBreakdown` component from `ResultsPresentation.jsx` and the real `normalisePointsBreakdown` shape from `resultModel.js` (`matchPoints`, `bracketPoints`, `totalPoints`, per-match `exactScorePoints`/`correctOutcomePoints`/`jokerBonus`/`corrected`, per-milestone `bracketBreakdown` rows). Do not re-derive this shape — call the existing normaliser.
   - `euro28-head-to-head-page-prototype.html` at `#/player/:userId/head-to-head?against=me` (route already decided in `STAGE-13G-H2-PRODUCT-FACING-ALIGNMENT.md`) — a full standalone page using the same comparison vocabulary and summary counts `PlayerHeadToHead.jsx` and `loadLeagueHeadToHead` already produce ("Same selection" / "Different selection" / "Comparison protected" / "Private" / "Not saved", `exactScoreMatches`/`bracketMatches`/`advancingTeamMatches`/`methodMatches`). This is a different presentation shell around the same engine as the existing inline comparison, not a new comparison engine.
3. **Reuse existing engines everywhere, don't rebuild them**: `PlayerHeadToHead`/`loadLeagueHeadToHead` for H2H, `PointsBreakdown`/`normalisePointsBreakdown` for the points destination, and whatever `player/playerInsightService.js` already provides for the overview/predictions sections.
4. **Rewire the league entry point**: change `src/leagues/Leagues.jsx`'s member-row click from opening `PlayerHeadToHead` inline to opening the new dedicated Player View (which itself contains the H2H destination as one of its sections/links) — per the Ledger's own note that this supersedes "any inline H2H-below-the-league presentation."
5. **Retire the entire dead `src/pages/` directory** as its own explicit clean-up item in this stage (or a directly preceding one) — confirm each file is genuinely unreferenced the same way you confirmed `AdminPanel.jsx` and `Profile.jsx` in Parts B/C, then remove the directory. Don't leave five-plus contradictory legacy implementations of pages that already have real, correct, modular equivalents (`src/leagues/`, `src/home/`, `src/koPredictor/`, `src/matchCentre/`, `src/player/`, `src/auth/`).

### E3. Constraints

- No scoring or resolver changes — this wires up and consolidates existing, already-correct data engines behind one new destination.
- No migration expected — `PlayerHeadToHead` and `PointsBreakdown` already read from existing contracts.
- Original/KO separation stays exactly as-is inside the new Player View, matching every other part of this brief.
- Update the Ledger's "Player insight engine and points storytelling" row from `🟠 PARTIAL` to `✅ FUNCTIONAL` only once the dedicated view, both destinations, and the league-row rewire are actually live — not on partial completion.
- Add or extend an audit script asserting: the dedicated Player View exists, league rows route to it, H2H and points-breakdown are real destinations from it (not stubs), and the retired `src/pages/` files no longer exist or are provably unreferenced. Wire it into `npm run check`.

---


## Part F — Stop admin/dev copy drifting into user-facing UI

This part is already built and tested, not just specced — three files are attached: `check-user-facing-copy-hygiene.mjs`, `user-facing-copy-hygiene-policy.mjs`, and `check-user-facing-spec-echo.mjs`. This is a recurring pattern across this whole brief: dev/admin/build-internal language kept surfacing where a real player would see it — caught manually each time, in Parts B, C and E. This adds two automated, permanent guards against it, covering two distinct failure modes.

### F0. Two different problems, two scripts

**Problem 1 — banned vocabulary.** Stage ids, WC26 branding, debug leftovers, ops jargon showing up in user-facing strings. Caught by `check-user-facing-copy-hygiene.mjs`.

**Problem 2 — whole sentences frozen verbatim from internal specs into UI copy**, which reads exactly like what it is: a rule written for the team, never rewritten for a player. This is the sharper, sneakier problem, found by checking whether user-facing copy is word-for-word identical to sentences in `docs/*.md`. Caught by `check-user-facing-spec-echo.mjs`. Real, confirmed findings in this repo right now, not hypothetical:

| File | Frozen sentence | Source of the freeze |
|---|---|---|
| `src/leagues/Leagues.jsx:291` | "Track each competition separately with a compact points table. Original Predictor and KO Predictor ranks and points are always shown separately." | `docs/archive/STAGE-13G-C-CLOSEOUT-HANDOVER.md` literally calls this "the required competition-boundary sentence" — **and** it's hardcoded as an exact-match marker in both `scripts/check-stage13g-c6-compact-league-shell.mjs:39` and `scripts/check-stage13d-integration.mjs:30` |
| `src/player/PlayerHeadToHead.jsx:118` | "...Only selections released by the existing server privacy rules are shown." | Same phrase duplicated in `playerInsightModel.js` |
| `src/player/playerInsightModel.js:92` | "Original Predictor point evidence follows the global prediction lock. Only selections released by the existing server privacy rules are shown." | — |
| `src/teamProfile/teamProfileModel.js:155` | "Community percentages use complete Original Predictor brackets only. The KO Predictor is not included and no Original/KO points are combined." | Duplicated again at line 162 with a different lead-in |

Note why line 291 specifically could never get fixed by hand: two different audits do an exact-substring check for that literal sentence as if it were a structural marker (a component name, a CSS class) rather than prose — mixed in the same `for (const marker of [...])` list as things like `'LeagueCodeDisclosure'` and `'StandingsTable rows={standings}'`. Nobody could reword it without breaking both audits, so the internal rule-sentence just... became the product copy, forever.

### F1. Required changes

1. Drop all three files into `scripts/` exactly as attached.
2. Add to `package.json`: `"audit:ui-copy-hygiene": "node scripts/check-user-facing-copy-hygiene.mjs"` and `"audit:ui-copy-spec-echo": "node scripts/check-user-facing-spec-echo.mjs"`, and add both `&& npm run audit:ui-copy-hygiene && npm run audit:ui-copy-spec-echo` into the `check` script's chain (near `audit:architecture` is a natural spot — these are architecture-adjacent governance checks).
3. **Rewrite the four sentences above as actual product copy.** These are suggestions to work from, not final copy — but they show the shape of the fix (address the player, drop the internal-methodology framing, keep the underlying guarantee intact):
   - Leagues.jsx → *"Switch between Original Predictor and KO Predictor to see each one's table — the two never mix."*
   - PlayerHeadToHead.jsx → *"Original and KO Predictor stay separate here too. Original picks reveal once the tournament locks; KO picks reveal fixture by fixture as each knockout match kicks off. You'll only ever see picks the other player has chosen to reveal."*
   - playerInsightModel.js → *"Your Original Predictor picks stay hidden from others until the tournament locks — then everyone can see how each prediction scored."*
   - teamProfileModel.js (both occurrences) → *"These percentages are based on Original Predictor bracket picks only — KO Predictor isn't part of this."* / *"These percentages stay hidden until enough predictions are locked in to show a fair picture. Only Original Predictor picks count here."*
4. **Fix the structural cause for the Leagues.jsx sentence specifically**, not just the wording: extract the rewritten copy into one named, exported constant (e.g. `COMPETITION_BOUNDARY_COPY` in a small shared copy/constants module), have `Leagues.jsx` render that constant, and change both `check-stage13g-c6-compact-league-shell.mjs` and `check-stage13d-integration.mjs` to assert the constant is used/rendered rather than hardcoding a duplicate literal string. This means future copy edits happen in exactly one place and the audits can never drift out of sync with it again — the same fix pattern applies to any other place where an audit currently hardcodes prose instead of a shared constant.
5. Update `docs/archive/STAGE-13G-C-CLOSEOUT-HANDOVER.md`'s own record of "the required competition-boundary sentence" to point at the new constant name instead of quoting exact prose, so the doc itself stops being the thing that re-freezes the next wording choice.
6. Record the underlying principle in `docs/EURO28-DESIGN-CHARTER.md` and/or `docs/EURO28-AGENT-RULES-AND-ROADMAP.md`, matching how other architecture rules are stated there (`check-frontend-architecture.mjs` checks for specific marker strings in the Charter — these two new rules should get the same treatment): something like *"User-facing surfaces carry zero admin, dev, or build-internal language, and never echo spec/decision-doc prose verbatim — that vocabulary lives only in `src/admin/**` and `docs/**`. Copy is written for the player reading it, not lifted from the requirement that produced it."* Add that marker string to both audits (Charter-presence check, following the existing pattern) and to the Charter doc itself.
7. As Parts A–E in this brief get built, run both audits as part of each — cheap insurance against exactly the kind of thing this brief kept finding by hand.

### F2. Constraints

- This is detection only — it doesn't rewrite anything itself. Where it flags something real, fix the copy (and, per F1.4, the structural cause) rather than loosening the patterns to make a genuine issue pass.
- `MIN_MATCH_LENGTH` (40 characters) in the spec-echo script exists specifically to avoid flagging short, incidental phrase overlaps — don't lower it without checking the false-positive rate against the real repo first, the same way this was tuned before handing it over.
- Keep the copy-hygiene pattern list conservative enough to avoid false positives on legitimate copy, but don't remove a category just because it's inconvenient — if "migration" or "Supabase" is ever genuinely needed in real user copy, that's exactly what the allowlist with a reason is for.

---


## Shared start-here checklist

Run this once, before starting on any of the six parts:

```bash
git status --short
git log -10 --oneline
grep -n "13G-B" docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md docs/EURO28-AGENT-RULES-AND-ROADMAP.md
grep -n "\-\-brand" src/design/tokens.css docs/EURO28-DESIGN-CHARTER.md
grep -n "MatchStats" src/App.jsx src/app/
grep -rln "from '\.\./pages\|from '\./pages" src/ --include=*.jsx --include=*.js | grep -v "^src/pages/"
git log --oneline -- docs/archive/STAGE-13G-PLAYER-VIEW-REFERENCE-ADOPTION.md
```

Confirm the current state of Stage 13G-B, confirm the `--brand` token conflict, and confirm the real Match Centre route points at `src/matchCentre/MatchCentre.jsx` rather than the legacy `MatchStats.jsx`. The `grep -rln` line should return nothing — if it does return a file, that's a live reference into `src/pages/` you need to account for before treating any of `AdminPanel.jsx`, `Profile.jsx`, `HeadToHead.jsx`, `PointsSummary.jsx` or the rest of that directory as dead. Confirm the Player View reference-adoption doc's history looks like normal doc-then-schedule progression, not a dropped build. Drop in and wire up Part F's audit early — it's independent of the other five and cheap to add first, then let it run against your work on the rest as you go. Propose amended/new stage ids for Parts A–E and get them recorded across Charter, Agent Rules, Decision Register and Ledger before starting the build — same governance as every other stage in this project.
