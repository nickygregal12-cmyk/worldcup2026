# EURO 2028 PREDICTOR
## Consolidated Decision Register and Build Roadmap
### Version 3.9 — Stage 13G-R0 canonical reconciliation and approved Stage 13G contract

> **Authority:** This is the product decision authority for the Euro 2028 Predictor. The Design Charter governs visual behaviour. The Agent Rules govern build process. Where they conflict, this register wins on product rules.

## 1. Current return point

- Expected Git commit: `b7f50de` — **Complete Euro admin staging acceptance**.
- Active branch: `euro28-development`; `main` remains protected WC26.
- Active migration count: **18**, aligned locally and on Euro staging. Stage 13F-K3 adds no migration.
- Stages 1–12, 13A–13E, 14, 14B, Stage 13F-0 through Stage 13F-J and Stage 13G-0 are accepted.
- Stage 13F-K3 is accepted at `b7f50de`. The next single package is Stage 13G-R0, documentation and reconciliation only.
- Migration 018 adds fixture revision/editing, protected venue and match reads, complete reconciliation, readiness evidence and the two approved new event types. It also restores `team_profile_updated`, which Migration 016 accidentally omitted from the event constraint.
- The Stage 13F-K1 database operations contract and Stage 13F-K2 control-room implementation are accepted. Stage 13F-K3 now proves deployed owner/results-admin/member behaviour, rollback-safe fixture operation and one real complete reconciliation before Stage 13G-A.
- Original and KO Predictor totals remain permanently separate.

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
| Extra tournament picks | Original Predictor only: total tournament goals, top scorer and highest-scoring team; 20 points each; global lock; no joker; no KO points; nearest-total ties and official joint winners receive full points |

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

### Extra tournament picks

- Total tournament goals: 20 points to every equally nearest prediction.
- Top scorer: 20 points when the selected player is among the official joint winners.
- Highest-scoring team: 20 points when the selected team is among the joint highest scorers.
- All three belong to the Original Predictor, lock globally, use no joker and never enter KO Predictor totals.
- None acts as the final leaderboard tiebreaker.
- The official player selector activates only in Stage 17A.

## 4. Confirmed five-position mobile navigation

The mobile navigation has five fixed positions with Home centred and slightly larger. The Bracket destination is permanent. Position 1 changes from Groups to KO only at the confirmed readiness boundary in Section 6.

### State 1 — group stage active, no display-ready Round of 16 fixture

1. **Groups**
2. **Bracket**
3. **Home**
4. **Leagues**
5. **More**

KO Predictor is not shown in the primary navigation. More contains a deliberate explainer teaser, but the active KO workspace, unresolved fixtures and prediction controls remain unavailable until at least one Round of 16 fixture is display-ready.

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
- Before early access, More may explain KO Predictor without exposing the workspace. Early active access is through More only and never displaces Groups before the full switch.
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

Before the full readiness boundary, More carries a non-interactive KO explainer. The active KO Predictor becomes reachable from More as soon as at least one Round of 16 fixture is display-ready.

A fixture is display-ready only when both teams are resolved. During early access:

- show only complete, real Round of 16 pairings;
- hide every TBC, partially resolved or unresolved fixture;
- keep Groups in Position 1;
- keep Bracket permanently in Position 2; and
- do not present an empty KO destination when no complete fixture is available; the earlier More entry remains an explainer only.

### After the main switch

When all four readiness conditions are satisfied:

- Position 1 changes from Groups to KO;
- the tab label, icon and destination change together;
- Groups moves into More as **Group stage review**;
- Group stage review remains permanently available; and
- Bracket remains a separate permanent destination.

### Required acceptance tests

1. During the group stage with no complete Round of 16 pairing, Position 1 is Groups; More shows only the KO explainer and cannot open active prediction controls.
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
- One clearly labelled provisional sample team remains sufficient for early component tests only; Stage 16A replaces that narrow fixture with the full guarded 24-team provisional dataset.

## 8. Stage 16A seeded acceptance cast — CONFIRMED

Stage 16 opens with **Stage 16A — Provisional teams, synthetic users and deterministic scenario seeding** against Euro staging project `gcfdwobpnanjchcnvdco` only. The blocked WC26 production project `ouhxawizadnwrhrjppld` must always fail closed.

### 8.1 Provisional teams

- `data/provisional-teams.json` contains exactly 24 teams: five hosts and nineteen likely qualifiers.
- Every row stores name, ISO code, group letter and `provisional: true`.
- `scripts/seed-provisional-teams.mjs` is guarded, idempotent and staging-only.
- Replace/confirm mode later applies the real 24 with `provisional: false`.
- Existing `TeamLabel` data-flag presentation remains the only provisional-team treatment.
- Stage 17 fails acceptance if confirmed-team replacement requires component or resolver changes.

### 8.2 Approved synthetic persona catalogue

| Key | Display name | Deterministic purpose |
|---|---|---|
| `exact_score_heavy` | Ada Exact | Exact on a fixed majority; correct-outcome non-exacts elsewhere. |
| `outcome_only` | Owen Outcome | Correct outcome on every eligible match, never exact. |
| `all_wrong` | Willa Wrong | Reverses every non-draw and converts every draw to a non-draw. |
| `partial_predictions` | Priya Partial | Fixed incomplete Original bracket/group and KO subsets. |
| `no_predictions` | Noah Empty | Valid account and profile with no prediction set. |
| `submitted_complete` | Sam Submitted | Complete deterministic baseline with submitted state. |
| `unsubmitted_identical` | Dana Draft | Byte-identical predictions to Sam, unsubmitted, and must score identically. |
| `joker_cap_reached` | Max Jokers | Exactly five group and five KO jokers; no sixth joker. |
| `zero_jokers` | Zoe Zero | Same control predictions as Max with no jokers. |
| `engineered_tie_a` | Taylor Tie | Fixed source mix engineered to the approved tie total. |
| `engineered_tie_b` | Morgan Tie | Different source mix reaching the same tie total. |
| `bracket_survives_deep` | Bea Bracket | Original bracket path survives to late milestones. |
| `bracket_dead_early` | Drew Deadend | Key Original bracket selections fail at the earliest stages. |
| `ko_only` | Kai Knockout | Complete KO entry and no Original entry. |
| `original_only` | Olivia Original | Complete Original entry and no KO entry. |
| `ko_advancing_only` | Alex Advance | Wrong 90-minute score, correct advancing team, wrong method. |
| `ko_method_variant` | Maya Method | Wrong 90-minute score, correct advancing team and method. |
| `ko_joker_variant` | Jules Double | KO control predictions with exactly five valid KO jokers. |
| `correction_sensitive` | Casey Correction | Known pre/post-correction totals proving replacement scoring. |

### 8.3 Synthetic identity, predictions and leagues

- `data/synthetic-personas.json` stores each persona's name, purpose and deterministic rules.
- Users are created through the Supabase Admin API using a local service credential that is never committed or printed.
- Every synthetic account requires both an `@synthetic.euro28.test` address and `synthetic_euro28: true` metadata.
- Expected points are precomputed independently for every Time & Phase preset and compared with canonical database output.
- The oracle must not import frontend scoring helpers or database scoring functions.
- Seed one large league of approximately fourteen members, one tiny league of two or three, one user in multiple leagues and at least one user in none.
- Membership supports both competition standings while Original and KO totals remain separate.

### 8.4 Exact teardown

- `scripts/remove-synthetic-data.mjs` deletes exactly and only accounts carrying both reserved markers.
- Cascaded predictions, scores and memberships are removed; provisional-team removal is optional.
- Real accounts, real administrators, tournament configuration and staging controls remain untouched.
- Seed → teardown → zero-residue assertion → reseed must be clean and repeatable.

### 8.5 Approved preconditions

Two genuine gaps are approved for separate guarded packages before Stage 16A execution:

1. privacy-safe synthetic identity plumbing: authorised reads expose only `is_synthetic`, and the shared identity primitive renders a subtle badge;
2. staging-effective database time: provisional Euro staging may exercise privacy/lock phases without mutating the irreversible real global lock.

Neither precondition may expose email/raw auth metadata, change scoring, alter the resolver or affect production/non-provisional tournament time.

### 8.6 Acceptance

- The full app is populated end to end across leaderboards, leagues, H2H, Match Centre, Bracket Health, profiles and player insight.
- Persona expected-points assertions pass at every phase, including post-correction recalculation.
- Deferred Stage 13D multi-user acceptance rows move only with recorded evidence.
- Teardown and clean reseed are demonstrated.
- The real irreversible global lock is never triggered on shared staging.

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

**OB-3 — Staging admin test access** is implemented after `9232d57`. It provides a local SQL generator plus a reviewed Euro staging SQL Editor procedure for grant, read-only verification and revocation. The explicit `owner` grant must be applied and verified before Stage 13 admin-screen visual acceptance, so the product owner can exercise authorised controls as the Stage 13 batches land.

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


## 10A. 3 July 2026 functional-completion addendum

### Confirmed Decision 13 — Classic converging bracket and Share Card

The Original predicted bracket and the live bracket will each receive a classic converging wall-chart presentation: Round of 16 ties on the outer left and right, quarter-finals and semi-finals converging inward, and the final centred.

Binding constraints:

1. The feature is presentation-only. It is a second layout of the existing bracket destinations and must use the existing canonical resolver, existing slot references, the shared `<TeamLabel>` primitive in every team position and dashed placeholder chips for unresolved slots. It introduces no new bracket logic, data model, migration or change to any product invariant.
2. The converging layout applies only at the desktop/tablet breakpoint of `≥900px`. Phones retain the current vertical bracket using the same components and data in a different arrangement. The converging form must not be compressed onto phone widths.
3. The Original predicted bracket and the live bracket each receive the layout inside their own clearly bannered context. Predicted and live brackets remain separate and must never blend.
4. Implementation must follow all standing construction principles: shared primitives, semantic tokens only, enforced file-size limits, complete loading/empty/error/partial states, both themes and accessibility.

The Share Card decision is settled: the Share Card is the user’s completed bracket rendered from this converging wall-chart layout in the Euro 2028 Predictor identity as a shareable/downloadable image. It must work on every device, including phones, and is not a separate visual design or separate bracket implementation.

**Roadmap owner:** Stage 13P-A, the specialised converging-bracket/share-image batch after Stage 13F-K and every Stage 13G coherence batch have been accepted.

## 10B. Stage 13G information architecture and coherent UI pass — CONFIRMED

Stage 13G is one holistic coherence pass, not a collection of page-by-page fixes. The binding question is whether every capability is in the place a casual player expects and is presented through the same shared primitives and anatomy used everywhere else.

Confirmed decisions:

1. The five-position mobile navigation remains Groups/KO, Bracket, Home, Leagues and More. No sixth position is added.
2. More is phase-aware and deliberately ordered. Before play it leads with Tournament & how to play; during live phases it leads with current competition needs. Admin is separated and authorised only.
3. Before a display-ready Round of 16 fixture, More may show a KO explainer teaser but not the active workspace, unresolved fixtures or prediction controls. Home gives KO at most modest secondary prominence.
4. Upcoming matches order by next real kick-off; completed results order most-recent-first. Match Centre previous/next follows chronology, not match number.
5. Group-stage fixtures support shared By group and By date presentations. By group is the pre-tournament default; By date is the live-tournament default; a manual choice is respected.
6. Tournament becomes a key destination containing canonical facts, venues, format and a complete casual-player guide for both competitions. Binding values and rules render from versioned contracts/configuration, never copied prose.
7. Every team name uses `TeamLabel`. Every player name uses one shared player identity activation primitive and opens one authorised overview containing predictions, permanent Original bracket, separate points stories and H2H.
8. League sharing uses a one-tap copy-link flow. Generic static Open Graph metadata is mandatory. Dynamic per-league title/description using a static Euro image is approved; dynamic image generation is rejected.
9. Inherited WC26 OG and icon assets are replaced with Euro identity assets. The deferred PWA manifest/service worker do not return before Stage 18C.
10. Scotland is the seeded reference Team Profile. Stage 13G-D proves curation through Admin and documents Stage 17 data entry for the remaining 23 teams.
11. Stage 13G is split into 13G-0 documents, 13G-A destinations/discovery, 13G-B tournament comprehension/chronology, 13G-C people/profiles/sharing and 13G-D seeded coherence.
12. Stage 13F-K completes first. Stage 16A supplies seeded acceptance data after 13G-C. Stage 13G-D and Stage 16A close in the same evidence window. Stage 13P-A begins only after Stage 13G acceptance.
13. Stage 13G-0 adds no migration. A narrow Stage 13G-C read contract for `is_synthetic` or invite-safe metadata must be proved and separately approved.

The full IA map, More ordering, hardwired-data evidence and batch contract live in `docs/STAGE-13G-0-INFORMATION-ARCHITECTURE-AND-COHERENT-UI-SCOPE.md`.

## 10C. Stage 13F-K complete Admin operations backbone — CONFIRMED

Stage 13F-K completes the remaining normal launch/live operations through the existing Euro control room. It extends the secure Admin foundation; it does not duplicate already accepted result, safeguard, Time & Phase or content-correction behaviour.

Confirmed decisions:

1. Fixture date, kick-off, venue and schedule status become owner-only Admin operations with optimistic fixture revision and append-only before/after audit evidence.
2. Participant identities, group membership, match numbering, fixture code, resolver slots and knockout allocation remain outside browser editing.
3. Complete tournament points reconciliation is owner-only, note-gated, feature-controlled and replacement-based through the existing canonical scoring function with a null match scope.
4. Results admins retain result entry/correction, match status and one-match recalculation but cannot edit fixture scheduling or reconcile the entire tournament.
5. Migration 018 adds `fixture_revision`, protected tournament-venue reads, expanded match reads, the two owner RPCs, readiness output and exactly two new operation-event values: `fixture_schedule_updated` and `tournament_points_reconciled`.
6. Migration 018 preserves all accepted event values, including `team_profile_updated`, `time_control_updated` and `time_control_reset`; restoring the profile value corrects Migration 016 drift and is not extra product scope.
7. Migration 018 adds no tournament-pick storage, official players, participant assignment, scoring values, manual point edits, resolver change, external provider or new Admin role.
8. Tournament Picks receives one Admin readiness home in Stage 13F-K2. Stage 17A retains persistence, official player references, executable outcome entry, scoring and player-facing use.
9. Operational readiness is a read model, not a mutable approval table. It summarises fixtures, participants, results, scoring runs, Team Profiles, safeguards, health and the Stage 17A tournament-pick dependency.
10. Existing append-only Admin events remain authoritative. Stage 13F-K2 adds category filters and expandable detail without event mutation or deletion.
11. Stage 13F-K is delivered as K0 documents, K1 database, K2 frontend and K3 staging acceptance. Stage 13G-A may not begin before K3 closes.

The approved scope lives in `docs/STAGE-13F-K0-ADMIN-OPERATIONS-SCOPE-AND-SERVER-CONTRACT.md`; the implemented database contract lives in `docs/STAGE-13F-K1-DATABASE-OPERATIONS-CONTRACT.md`.

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
- **OB-3 — implemented after `9232d57`:** Explicit staging-admin grant, read-only verification, app acceptance and revoke procedure for product-owner testing. No service-role secret and no browser self-grant path.

### Stage 13 — Shared design system and mobile-first rebuild

- **13A v6 — complete:** Charter-compliant design system, portable dependency lock, app shell and Home; corrected Groups→KO switch with permanent Bracket destination.
- **13B — complete in this batch:** all 36 group fixtures, shared `<TeamLabel>`, locally bundled circular ISO-keyed flags, neutral unresolved slots, shared score input, clear save/lock/grace states, safe five-joker controls and the reversible review flow. No Migration 015.
- **13C — complete:** permanent winner-only predicted bracket; separate real-fixture KO match centre with 90-minute score, advancing team, method, five KO jokers, separate points/rank and hidden unresolved fixtures. No Migration 015.
- **13D:** Leagues, results, shared predictions and responsive polish.
- **13E:** Team Profile Sheet implemented through `<TeamLabel>` with the three-source data boundary and post-lock aggregate gate.
- **13F:** Functional-completion sequence is 13F-0, 13F-A through 13F-K. Stage 13F-I owns the tournament-pick contract; Stage 13F-J owns player insight and points storytelling; Stage 13F-K0/K1/K2/K3 complete the Admin operations backbone before Stage 13G-A.
- **13G:** Holistic information architecture and coherent UI pass: 13G-0 scope, 13G-A destinations, 13G-B tournament comprehension/chronology, 13G-C people/profiles/sharing and 13G-D seeded coherence.
- **13P-A:** First specialised presentation batch after Stage 13G: converging predicted/live bracket layouts at `≥900px`, with the completed converging bracket rendered as the cross-device Share Card image.

### Later stages

- **Stage 14:** Observability and resilience—Sentry, scheduled-function heartbeat and Zod validation for external boundaries.
- **Stage 15:** Critical-path Playwright end-to-end testing in GitHub Actions.
- **Stage 16A:** Staging-only provisional teams, nineteen deterministic synthetic personas, prediction/scenario oracle, multi-league cast, correction rehearsal, exact teardown and zero-residue reseed. No resolver or scoring change; any genuine read/time-contract migration is separately packaged.
- **Stage 16 later batches:** Extend the accepted seeded cast through every best-third combination, load/performance exercises and any remaining tournament lifecycle rehearsals.
- **Stage 17:** Real teams and tournament data; use the rehearsed Stage 16A replace/confirm path with zero component/resolver changes; official times, venues and tie-break rules; final scoring-ruleset lock.
- **Stage 18A:** Optional Google sign-in via Supabase OAuth, with existing-account regression protection.
- **Stage 18B:** Optional results-provider integration; manual results remain authoritative and the fallback.
- **Stage 19:** Go-live hardening, runbook, monitoring, dress rehearsal, load review and environment lockdown.

## 12. Open decisions

- Final joker multiplier.
- Official Euro 2028 tie-break regulations.
- Final qualified teams, draw positions and kick-off times.
- Whether Google sign-in is enabled after its optional stage is completed.
- Results-provider selection in 2027.
- Final leaderboard tie-break policy beyond shared rank on equal points.

## 13. Exact next task

Stage 13F-K3 is the current acceptance package built from verified checkpoint `c4342f1`. It adds no product or database capability. It proves three-role deployed visibility, a same-value fixture update inside an exact rollback transaction and one real owner reconciliation with append-only event/run evidence while preserving separate Original/KO totals.

After the linked database gates, deployed role walkthroughs, reconciliation verification, full repository check, clean commit/push and final deployed verification pass, Stage 13F-K closes and **Stage 13G-A — destinations and discovery** becomes next. Stage 16A, Stage 17A and Stage 13P-A remain later.

**Starting commit:** `c4342f1`
**Migration count:** `18`; no Migration 019 in Stage 13F-K3


## 10D. Stage 13G-R0 canonical reconciliation — APPROVED

The standalone `EURO28-DECISION-REGISTER-ADDENDUM-2026-07-03.md` is superseded and removed as a separate governing authority when this batch is accepted. Its still-valid decisions are consolidated here. Where earlier wording conflicts with this section, this section governs.

### Truthful Admin correction

Stage 13F-F did not establish functional section navigation. Its audit proved only source strings, IDs and presentation markers. `AdminOperations.jsx` emits `#admin-*` links while `routeFromHash()` treats the hash as the application route; only `/admin` is registered and unknown routes fall through to Home. Therefore Admin fail-closed access remains functional, Admin section destinations are missing, Admin UI fit is incoherent and the complete operations backbone is partial until Stage 13G-A.

### C1 navigation — Option A approved

Retain the accepted five-position mobile navigation: `Groups | Bracket | Home | Leagues | More`, with Groups changing to KO only at the existing readiness boundary. Remove the duplicate persistent Groups/Bracket page switcher and use contextual previous/next actions where useful. No sixth destination and no `Original` merge.

### Original-bracket invalidation contract — approved

This contract applies only to the Original Predictor. It never modifies or combines the separate KO Predictor. It triggers when at least one Original Bracket pick exists and a group-score edit changes predicted group order, third-place order, best-third combination or a knockout slot occupant. The first affected edit per browser session shows the approved design-system warning with Cancel and `Update groups and review bracket`. Cancel saves nothing. Confirmation recalculates group tables, third-place order, best-third combination and all knockout occupants, then revalidates picks. A pick remains valid only when the selected team remains in the same tie and reachable through the same path. Invalid picks remain visibly preserved, are marked for review, do not count as complete, are not scored, are never silently dropped/transferred/replaced and cascade downstream where the old path is unreachable. Groups, Bracket and Review show one amber count/banner linked to the earliest affected tie. Submission cannot be complete until repaired. No Migration 019 is assumed; a schema/read-contract gap must be separately proved.

### Stage 13G approved sequence

1. **13G-R0:** canonical documents, truthful Ledger v1.21, fragment consolidation and contracts only.
2. **13G-A:** Admin route integrity, central tournament/lock configuration, autosave unblock, shared confirmations/selectors/refresh policy and naming ratchet.
3. **13G-B:** Home lifecycle, countdowns, today hub and one KO-readiness signal.
4. **13G-C:** group/date views, predicted standings, shared third-place table, bracket coherence and contract-derived tournament guide.
5. **13G-D:** PlayerIdentity/PlayerInsight coherence, league action hierarchy, sharing/OG architecture and auth-provider readiness or explicit deferral.
6. **16A:** seeded staging cast after identity/sharing contracts stabilise.
7. **13G-E:** whole-surface hardwired/native/refresh/empty-state/identity/theme/route acceptance.
8. **15E:** WC26 legacy retirement after 13G-E and before 13P-A, with `legacy-wc26-final` created immediately before exact-path deletion.


### Test strategy extension — approved after R0

This extension is binding for Stage 13G and later acceptance gates. It addresses the Stage 13F-F failure class by requiring rendered-route and link-target proof rather than source-string audits alone.

1. **Route-render integration tests:** implement first in Stage 13G-A, then require for every new destination. Render the real shell at each route and section hash, assert rendered content, cover every Admin section and add a dead-destination audit that fails when an internal link target does not resolve against the route table.
2. **Permission matrix pgTAP suite:** implement in the next database/protected-operation batches. Assert allow/deny for every RPC and protected table across anonymous, authenticated non-owner, owner and admin roles. New database objects must add matrix rows and unmapped objects fail the suite.
3. **Invariant tests:** implement with Stage 13G-C and scoring/resolver stages. Recalculation must be idempotent on identical input and resolver property tests must produce lawful brackets with all slots filled, valid third-place combinations and no duplicates.
4. **Lock-boundary suite:** implement as lock, countdown and grace surfaces land. Use the shared clock utility to test exact lock instant, joker kick-off second and grace expiry mid-operation on both sides of each boundary.
5. **Config-to-surface contract tests:** implement with Stage 13G-B/C. Displayed scoring values must equal the central ruleset, countdowns must equal central configuration and KO readiness must come from one central signal on Home, leagues and navigation.

Rejected for now to prevent test gold-plating: mutation testing, broad visual regression and multi-browser matrices.


## 10E. Stage 13G-A route integrity slice — IMPLEMENTED

From checkpoint `3c41628`, Stage 13G-A starts with the approved test-strategy extension rather than visual/product polish. The first implementation slice adds the route-render and dead-destination proof that Stage 13F-F lacked.

The Admin control room now has one canonical section registry and query-addressed destinations under the protected Admin route. Legacy `#admin-*` links are removed. Each Admin section resolves through `#/admin?section=...`, so clicking section controls, refreshing a section URL or opening a section deep link stays inside `/admin`. Invalid section values recover inside the protected Admin route and show Overview instead of falling through to Home.

The route-integrity audit scans active source links for unresolved app hashes and legacy Admin fragments. It is included in `npm run check`, so future destination drift fails the build. Rendered route tests cover every current application destination and every Admin section destination.

This slice does not implement the rest of Stage 13G-A. Central tournament/lock configuration, account-autosave unblocking, shared destructive confirmation, design-system selector replacement, refresh policy and `foundation-*` ratchet remain scheduled. No database change and no Migration 019.


### Stage 13G-A interaction enforcement amendment

- The shared `ConfirmDialog` is now the required active-surface confirmation route for high-impact or destructive browser actions. Native `window.confirm` and bare `confirm()` are rejected in active Euro UI roots.
- Active-surface selectors must use `SelectField`; native `<select>` is permitted only inside the design-system primitive and its tests.
- Manual refresh buttons are not allowed as ordinary product controls. Retry actions may remain in load/error states, but normal data refresh should follow the central refresh policy and mutation invalidation pattern.
- The `foundation-*` class ratchet is recorded in `architecture-policy.mjs`; the cap may only reduce or remain stable unless the Charter is explicitly amended.
- `audit:interaction-enforcement` is included in `npm run check`.
- This closes Stage 13G-A's shared-interaction enforcement slice without a database change or Migration 019.

### Offline players / claim-account

Decision pending. Stage 16 synthetic seeding may reuse service-role-only participant creation, deterministic naming, prediction seeding, league membership, auditing and marker-safe teardown. It must not decide the production identity model. Any managed/offline participant feature requires a separately approved application participant identity, nullable auth link, ownership/privacy rules, one-time opaque claim token, atomic server claim and rollback contract.

### Other carried decisions

- PWA and push remain **DECIDED — CARRY** for Stage 18C only.
- Lucky Dip remains functional.
- The converging wall-chart bracket/share image remains scheduled for Stage 13P-A.
- Static Euro Open Graph identity is mandatory; dynamic per-league previews require a server-visible invite route and may expose only invite-safe metadata.
- The Functional Completion Ledger must update in the same commit as every future batch, including micro-fixes.

### Stage 13G-A central configuration/shared primitive amendment

- Central provisional prediction lock and tournament start values are now held in `TOURNAMENT_CONFIG`.
- Original Predictor account autosave must use `resolveTournamentLifecycle()` rather than checking database lock fields directly.
- The central provisional value unblocks staging autosave but must never apply the irreversible real global lock.
- Shared `ConfirmDialog`, `SelectField` and `REFRESH_POLICY` primitives are approved for incremental adoption.
- Remaining destructive actions, native selectors and refresh consumers stay ledger-tracked until fully migrated.
- No database change or Migration 019 belongs to this slice.


## Stage 13G-B Home lifecycle amendment

The first Stage 13G-B implementation slice starts from `08524b6` and is limited to Home lifecycle alignment. Home must render first-visit and returning-guest conversion copy, prediction-lock and tournament-start countdowns from central lifecycle configuration, a Today’s match hub linking into Match Centre, and a Home-owned KO readiness signal. Date-only staging tournament starts must not override the central precise tournament-start timestamp. No database change or Migration 019 is permitted.


### Stage 13G-B prediction lifecycle slice

From checkpoint `1dda826`, the second Stage 13G-B slice aligns the active prediction surfaces with the central lifecycle model. Original Predictor now shows lock, group-score, winner-only bracket and KO-boundary lifecycle cards. KO Predictor now shows real-fixture readiness and a separate-competition lifecycle strip. The slice adds `audit:prediction-lifecycle` to `npm run check`, keeps active migrations at 18 and adds no Migration 019.


### Stage 13G-B Results lifecycle alignment

From checkpoint `177605b`, the next Stage 13G-B slice aligns Results, Leaderboards and Match Centre with the central lifecycle model. Results now distinguish pre-tournament, live, review, quiet and completed canonical-result states. Leaderboards now show competition-scoped lifecycle copy for Original Predictor and KO Predictor. Match Centre now shows fixture-level lifecycle copy for live, review, completed, scheduled and unresolved knockout contexts. The slice adds `audit:results-lifecycle` to `npm run check`, keeps active migrations at 18 and adds no Migration 019.

## Stage 13G-B League Lifecycle Update

- Stage 13G-B League lifecycle alignment is complete at the package level: Leagues and member comparisons now receive central lifecycle context and state Original release as global-lock based while KO release remains fixture-by-fixture. No database change and no Migration 019.

## Stage 13G-B Player Insight and Team Profile lifecycle alignment

From checkpoint `a651d33`, Player Insight and Team Profile are aligned with central lifecycle context without changing server privacy, scoring, database policy or migrations. Player Insight displays lifecycle copy for Original global-lock evidence and KO fixture-by-fixture evidence, while the canonical authorised-read phrase remains active. Team Profile displays lifecycle copy for Original-only community bracket aggregates, keeps KO Predictor data excluded and repeats that no Original/KO points are combined. `audit:player-team-lifecycle` is included in `npm run check`; active migrations remain 18 and no Migration 019 is created.

## Stage 13G-B KO-readiness signal close-out

From checkpoint `659809c`, the KO-readiness decision is centralised for Home, Navigation and Leagues. The shared readiness model counts only real knockout fixtures whose participant slots are resolved. Navigation keeps the five-position contract: Groups remains primary until the full approved readiness boundary is met, early KO access appears in More only, and Group review moves to More only after KO becomes primary. Leagues consume the same readiness signal before presenting KO league context. No database change or Migration 019 is created.

## Stage 13G-H0 housekeeping and corrected records

This amendment is read with the Stage 13G master prompt and corrects records before the next build.

### Recorded-equals-real corrections

- Constitution principle 14: Slick and frictionless is the product sensibility. Prefer restraint, opinionated defaults, fewer taps, hidden machinery and opening into what matters now. The existing access principle remains active as principle 15.
- Tournament Picks: the Original-only contract is accepted, but the player-facing feature is partial until ordinary users can enter total goals, top scorer and highest-scoring team. The audit verified contract boundaries and Admin readiness only.
- Player Insight/H2H: existing engines are not the final product shape. The accepted target is a dedicated player view with sections for overview, group predictions, predicted bracket/tables, KO evidence, dedicated H2H and dedicated points breakdown.
- Guest import: after signup/sign-in with a valid local draft, show one dominant prompt. Primary: “Import predictions to my account.” Secondary: “Start fresh.” After this point, signed-in copy must never say “browser draft”.
- FAQ: do not include result-correction mechanics as a user-facing FAQ question.

### Contract or schedule changes that need explicit acceptance before build

- Moving Tournament Picks player entry from Stage 17A into 13G-C is a schedule change.
- Dedicated `#/player/:userId`, H2H and points-breakdown routes are a route/deep-link contract change.
- Coverage, eslint-disable, fixture-gating and frozen-bridge ratchets are tooling/architecture gates, not scoring or database changes.

### Placement

- Stage 13G-H1: bypass-class tooling sweep.
- Stage 13G-C: guest import flow, signed-in copy sweep, joker control, bracket overlap, shared tabs, Tournament Picks player entry if schedule change is accepted.
- Stage 13G-C/D: dedicated player view, H2H and points-breakdown destinations.
- Stage 13G-B/C: how-to-play and FAQ guide.
- Stage 13P-A: converging wall-chart bracket and share image.


### Stage 13G-H1 bypass-class tooling sweep — ACCEPTED
- Time travel defaults false in `.env.example`.
- Coverage floors use current live `src/` actuals and are wired into `npm run check`.
- `eslint-disable` use has reason comments and exact cap ratchets.
- Visual fixtures stay outside the production graph; `Stage14ErrorFixture` is DEV-only.
- Size governance clarifies 200/250 review guidance, 400/400 hard caps and test-fixture ratchets.
- No database change and no Migration 019.
