# EURO 2028 PREDICTOR
## Consolidated Decision Register and Build Roadmap
### Version 2.8 — Stage 13A v6 portability correction with unchanged navigation lifecycle

> **Authority:** This is the product decision authority for the Euro 2028 Predictor. The Design Charter governs visual behaviour. The Agent Rules govern build process. Where they conflict, this register wins on product rules.

## 1. Current return point

- Expected Git commit: `4e1ae38` — **Add expanded Euro admin control room**.
- Active migration count: **14**.
- Stages 1–12 are complete and verified at that checkpoint.
- Stage 13A v1, v2 and v3 were superseded and never installed.
- Stage 13A v4 was generated but never installed.
- Stage 13A v4 is now **superseded** because its navigation implements the reversed phase-switch rule described in Section 5.
- No Stage 13 code or documentation from any generated package has been installed into the repository.
- Stage 13A v5 was never committed and is superseded because its generated lockfile contained private build-environment registry URLs.
- Stage 13A v6 preserves the confirmed v5 product scope, uses public npm registry URLs only and adds a permanent package-lock portability audit. It remains unverified until the complete gate passes in Nicky's terminal and the branch is committed cleanly.

## 2. Existing confirmed product decisions

| Subject | Confirmed position |
|---|---|
| Original Predictor | 36 group-score predictions plus one winner-only pre-tournament bracket |
| KO Predictor | A separate competition using the 15 real knockout fixtures |
| Points separation | Original Predictor and KO Predictor totals never combine, including in private leagues |
| Original bracket | Winner-only; no score, method or joker controls |
| KO match score | The 90-minute score, including added time |
| KO advancement | Advancing team is predicted separately from the 90-minute score |
| KO decision method | Normal time, extra time or penalties is predicted separately |
| Penalty shoot-out score | Never predicted for points |
| Original jokers | Five group-stage jokers and no bracket jokers |
| KO jokers | Five separate KO Predictor jokers |
| Joker multiplier | Provisional 2× through the versioned central scoring ruleset |
| Prediction save | One atomic full-bundle save |
| Submit | Reversible review state; saved but unsubmitted predictions still count |
| Global lock | Prediction content locks at the first tournament kick-off |
| Grace | One user, one competition and one unstarted match only |
| Original prediction visibility | Private until the global lock |
| KO prediction visibility | Match by match after the real fixture starts |
| Guest mode | Browser-only and unscored |
| Bracket resolver | One canonical resolver for guest, predicted and live contexts |
| Live vs predicted | Never blended in data or presentation |
| Best-third allocation | One matrix and one resolver; all 15 combinations tested |
| Results | Manual results are authoritative; one current result plus append-only revisions |
| Scoring correction | Replacement recalculation, never additive duplication |
| Admin security | Service-managed; browser self-grant is blocked |
| Direct writes | No direct browser writes to protected tables |
| External results API | Deferred; manual operation remains authoritative and the fallback |
| App name | **Euro 2028 Predictor** |

## 3. Scoring model

### Original Predictor

- Exact group score: 30 points.
- Correct group outcome: 10 points.
- Group joker: provisional 2×.
- Original bracket: points by a predicted team reaching each defined milestone.

### KO Predictor

- Exact 90-minute score: 30 points.
- Correct 90-minute outcome: 10 points.
- Correct advancing team: 10 points.
- Correct decision method: 5 points when the advancing team is also correct.
- KO joker: provisional 2×.

All provisional values remain central and versioned. They must not be duplicated into page components.

## 4. Confirmed five-position mobile navigation

The mobile navigation has five fixed positions with Home centred and slightly larger. The Bracket destination is permanent. Position 1 changes from Groups to KO only at the confirmed readiness boundary in Section 6.

### State 1 — group stage active, no display-ready Round of 16 fixture

1. **Groups**
2. **Bracket**
3. **Home**
4. **Leagues**
5. **More**

KO Predictor is not shown in the primary navigation. More does not need to show KO until at least one Round of 16 fixture is display-ready.

### State 2 — early KO access while Groups remains primary

The five primary positions remain:

1. **Groups**
2. **Bracket**
3. **Home**
4. **Leagues**
5. **More**

Once at least one Round of 16 fixture has both participant slots resolved, **KO Predictor** becomes reachable from More. During this early-access state:

- only fixtures with both teams resolved are shown;
- any fixture containing an unresolved or TBC participant is hidden rather than shown as an empty prediction card;
- Groups remains Position 1 even if several knockout fixtures have already populated;
- the original Bracket remains Position 2.

### State 3 — KO becomes the primary Position 1 destination

The main navigation changes only when every condition in Section 6 is satisfied:

1. **KO**
2. **Bracket**
3. **Home**
4. **Leagues**
5. **More**

At this point Groups moves to More under **Group stage review** and remains permanently reachable.

### Binding navigation rules

- Position 1 begins as **Groups** and becomes **KO** only at the confirmed readiness boundary in Section 6.
- Position 2 is permanently **Bracket** and always opens the user's original pre-tournament bracket.
- The Bracket destination never changes, because the original bracket remains important after the group stage as real results score progression points against it.
- Early KO access is through More only; it never displaces Groups before the full switch.
- A knockout fixture is display-ready only when both participant slots are resolved. TBC or partially resolved fixtures are hidden from the early KO list.
- When Position 1 becomes KO, group-stage access moves to More under **Group stage review** and remains permanently reachable.
- The switching tab's label, icon and destination change together.
- The switch is driven by central competition phase/readiness and canonical resolver state, never by a hardcoded calendar date in a component.
- Dedicated route tests must cover every state and the exact transition boundary.
- Desktop navigation must preserve the same product distinction: the original Bracket remains permanent, early KO access may appear in a secondary destination, and Groups is replaced in the primary set only after the confirmed trigger.

## 5. Stage 13A v4 audit verdict — CONFIRMED

**Verdict: superseded; regenerate as Stage 13A v6.**

The generated v4 shell does not comply with the navigation decision above:

- It keeps Groups permanently in Position 1.
- It uses a phase-aware Position 2 that changes from Bracket to KO.
- Its route test explicitly asserts that Bracket becomes KO when `knockoutOpen` is true.

Nothing from v4 has been installed, so there is no rollback or repair migration. Stage 13A v6 should reuse v4's compliant work—semantic blue tokens, light/dark themes, Lucide, typography, accessible shell, Home dashboard and failure states—but reverse only the phase-aware navigation model and update its tests and documents.

## 6. Groups→KO trigger and early-access lifecycle — CONFIRMED

**Selected decision: Option B, with an early-access phase through More.**

The main Position 1 tab changes from Groups to KO only when all of the following are true:

1. all 36 group matches have authoritative completed results;
2. final group standings are confirmed;
3. the canonical resolver has populated both participant slots for all eight Round of 16 fixtures; and
4. there are no unresolved best-third allocation or bracket-resolution errors.

This is the validated Round of 16 readiness boundary. The switch must not occur merely because some knockout teams have become known, and it must never use a hardcoded date or elapsed-time check.

### Early KO access before the main switch

Before the full readiness boundary, KO Predictor may become reachable from More as soon as at least one Round of 16 fixture is display-ready.

A fixture is display-ready only when both teams are resolved. During early access:

- show only complete, real Round of 16 pairings;
- hide every TBC, partially resolved or unresolved fixture;
- keep Groups in Position 1;
- keep Bracket permanently in Position 2; and
- do not present an empty KO destination when no complete fixture is available.

### After the main switch

When all four readiness conditions are satisfied:

- Position 1 changes from Groups to KO;
- the tab label, icon and destination change together;
- Groups moves into More as **Group stage review**;
- Group stage review remains permanently available; and
- Bracket remains a separate permanent destination.

### Required acceptance tests

1. During the group stage with no complete Round of 16 pairing, Position 1 is Groups and KO is absent from More.
2. When at least one Round of 16 pairing is complete but the full Round of 16 is not ready, Position 1 remains Groups, More exposes KO Predictor, and only complete fixtures are rendered.
3. When all group matches are complete but one or more Round of 16 fixtures remain unresolved, Position 1 still remains Groups.
4. At the exact moment all 36 group results, final standings and all eight Round of 16 pairings are valid, Position 1 changes to KO.
5. The switching tab's label, icon and route change atomically.
6. Bracket remains permanent in every state.
7. Group stage review appears in More after the switch and remains reachable.
8. No navigation decision depends on a component-level calendar date.

**Register status:** confirmed by Nicky.

## 7. Team Profile Sheet — CONFIRMED FUTURE STAGE

A dedicated **Stage 13E — Team Profile Sheet** is added immediately after Stage 13D.

### Interaction and architecture

- A profile opens by deliberately tapping the team identity—flag or team name—inside the single shared `<TeamLabel>` primitive.
- It appears as a bottom sheet, not a separate page.
- The five-position navigation does not change.
- The behaviour is implemented once in `<TeamLabel>` so it works consistently in fixtures, group tables, brackets and any other approved team display.
- Score inputs, joker controls and the surrounding match card must never open the profile.
- A dedicated interaction test must prove that prediction-entry controls cannot accidentally trigger it.

### Allowed data sources — exactly three

1. **Curated static data**
   - Ranking.
   - Qualifying route.
   - Best Euro finish.
   - Short editorial note.
   - Entered manually when teams are confirmed.
   - Stored centrally and editable through authorised admin controls.
   - Never hardcoded into components.

2. **App-owned tournament data**
   - Tournament results so far.
   - Current group position.
   - Next fixture.
   - Read only from the application's own tournament, result and standings data.

3. **Prediction aggregates**
   - Percentage predicting the team to win its group.
   - Percentage predicting the team to reach each knockout milestone.
   - The viewing user's own relevant prediction.

### Binding privacy and reliability rules

- Prediction aggregates are hidden before the global prediction lock.
- Pre-lock access to a team profile must not reveal aggregate prediction information through UI, RPC, API response or browser-readable table access.
- The post-lock aggregate gate requires dedicated tests.
- No external football-data API, scheduled third-party sync or recent-form feed may be used anywhere in this feature.
- In-tournament form is derived only from app-owned results.
- Loading, empty, error and partial-failure states are required.
- The profile uses charter tokens, works in both themes and belongs to the shared design system.
- One clearly labelled provisional sample team is sufficient for development tests until real teams are confirmed.

## 8. Provisional test-nation dataset — CONFIRMED

This is part of **Stage 16 — Seeded full-tournament test**.

- Staging will use realistic sample nations, including relevant host nations such as Scotland, to make groups, standings, brackets, scoring and team profiles easy to follow by normal football understanding.
- Every sample nation is marked provisional in the stored dataset.
- Every screen that presents sample tournament data displays a clear **Sample data** or **Provisional** treatment so it cannot be mistaken for the official draw.
- Tests must confirm that provisional markings survive group tables, fixtures, bracket slots and team profiles.
- Replacement with confirmed teams during Stage 17 is a data-only operation using slot references and ISO codes.
- The Stage 17 acceptance gate must prove that replacing the sample nations requires zero component or resolver code changes.

## 9. Staging admin access for product-owner testing — CONFIRMED

A documented, explicit service-side procedure will grant Nicky's staging account admin access for testing.

### Binding rules

- Browser self-grant remains blocked.
- The procedure uses an authorised service-side or direct controlled database operation only.
- It records the named account, who authorised the grant, when it was applied and how to revoke it.
- No account is granted admin silently or as a side effect of registration.
- The procedure includes grant, verification, test and revocation steps.
- It never prints or embeds a service-role key or other secret.
- It applies to Euro staging only and must refuse any other project reference.

### Roadmap placement

Add **OB-3 — Staging admin test access** as an immediate operational task. The written procedure and explicit grant must be completed before Stage 13 admin-screen visual acceptance, so the product owner can exercise authorised controls as the Stage 13 batches land.

## 10. Optional Google sign-in — CONFIRMED ROADMAP ITEM

Google sign-in is an optional late-stage addition through Supabase OAuth.

- It does not alter the existing authentication foundation during Stage 13.
- It is scheduled after real teams and final tournament configuration are in place, but before invitations are sent.
- Existing email/password accounts must retain access to the same profile, predictions, leagues and admin status.
- Enabling Google sign-in must not create duplicate profiles or orphan existing prediction data.
- A dedicated regression test must prove that existing email/password sign-in remains unaffected.
- OAuth configuration, redirect URLs, account-linking behaviour, failure handling and rollback must be documented before it is enabled.
- The feature remains optional and may be omitted without blocking go-live.

Roadmap placement: **Stage 18A — Optional Google sign-in**, before **Stage 18B — Optional results-provider integration**.

## 11. Updated build roadmap

### Completed

1. Reconciliation — complete.
2. Prediction storage — complete.
3. Canonical resolver — complete.
4. Guest foundation — complete.
5. Authentication and profiles — complete.
6. Atomic saving — complete.
7. Prediction journey — complete.
8. Competition split, jokers and grace — complete.
9. Results, scoring, live tables and separate leaderboards — complete.
10. Secure admin result operations — complete.
11. Leagues and controlled shared prediction viewing — complete.
12. Expanded admin tournament control room — complete.

### Immediate operational tasks

- **OB-1 — blocked:** Dependabot cannot be activated without placing its configuration on the repository default branch (`main`), which is the protected WC26 branch. Revisit after repository/default-branch separation.
- **OB-2 — implemented after `505d31a`:** guarded Euro staging logical backup, checksums and disposable-destination restore rehearsal. A fresh backup is mandatory before every future hosted migration. It covers roles, app schema/data and migration history, not Supabase-managed Auth/Storage internals.
- **OB-3:** Explicit staging-admin grant and revoke procedure for product-owner testing.

### Stage 13 — Shared design system and mobile-first rebuild

- **13A v5:** Charter-compliant design system, app shell and Home; corrected Groups→KO switch with permanent Bracket destination.
- **13B:** Groups predictor and review flow; shared `<TeamLabel>`, circular ISO-keyed flags, score inputs and clear save/lock/joker states.
- **13C:** Original bracket and separate KO Predictor match centre.
- **13D:** Leagues, results, shared predictions and responsive polish.
- **13E:** Team Profile Sheet implemented through `<TeamLabel>` with the three-source data boundary and post-lock aggregate gate.

### Later stages

- **Stage 14:** Observability and resilience—Sentry, scheduled-function heartbeat and Zod validation for external boundaries.
- **Stage 15:** Critical-path Playwright end-to-end testing in GitHub Actions.
- **Stage 16:** Seeded full-tournament test with phase controls, realistic provisional nations and all 15 best-third combinations.
- **Stage 17:** Real teams and tournament data; data-only replacement of provisional nations; official times, venues and tie-break rules; final scoring-ruleset lock.
- **Stage 18A:** Optional Google sign-in via Supabase OAuth, with existing-account regression protection.
- **Stage 18B:** Optional results-provider integration; manual results remain authoritative and the fallback.
- **Stage 19:** Go-live hardening, runbook, monitoring, dress rehearsal, load review and environment lockdown.

## 12. Open decisions

- Final joker multiplier.
- Official Euro 2028 tie-break regulations.
- Final qualified teams, draw positions and kick-off times.
- Whether Google sign-in is enabled after its optional stage is completed.
- Results-provider selection in 2027.
- Awards categories.
- Final leaderboard tie-break policy beyond shared rank on equal points.

## 13. Exact next task

Do not install Stage 13A v4.

Stage 13A v6 is complete at `505d31a`. OB-1 is blocked by the protected default branch. Complete and verify OB-2 backup/restore tooling, then complete OB-3 staging admin access before Stage 13B.

**Starting commit:** `4e1ae38`
**Migration count:** `14`
