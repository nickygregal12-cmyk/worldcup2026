# Euro 2028 Predictor — product completeness roadmap (consolidated, 2026-07-05)

Context that reshapes priorities: WC26's ~65 users was a test. Euro 2028 targets
a much larger audience. That moves the product from a friends' league (support =
the group chat, trust = everyone knows everyone) to a semi-public product. Every
item below is tagged [GATE: signups] (must exist before opening registration
widely) or [GATE: tournament] (must exist before the first ball is kicked) or
[SCHEDULED] (ledger item, no gate).

## A. Already decided and specced (pointers — no further decision needed)

1. **Tie-break ladders** — CONFIRMED, see DECISION-DRAFT-TIEBREAKS.md. Register
   entry + final-standings resolver stage. [GATE: tournament]
2. **Stage RULES-1** — scoring page (rendered from config constants), published
   tie-breaks, corrections policy, contact line, privacy note + deletion path.
   See STAGE-RULES-1-SPEC.md. [GATE: signups — a stranger must be able to read
   the rules and the privacy note before trusting the site with their email]

## B. Gaps from the site review still needing a decision or ledger row

3. **Offline player lifecycle** [SCHEDULED]. DB plumbing exists (16A-P1),
   claim-flow prototype exists, zero user-facing surface. Confirm the roadmap
   covers create → score → visible in leagues → claim, so it is not bolted onto
   finished league pages.
4. **Unknown-route fallback — CLOSED** [SCHEDULED]. Stage PRODUCT-UNKNOWN-ROUTE-1 confirms unknown `#/...` hashes now render a friendly recovery surface with safe links to Home, Groups and How to play instead of silently falling through to Home.

## C. New items driven by scale (the friends-league assumptions that break)

5. **Display-name and league-name moderation** [GATE: signups]. Current
   validation is length-only. The owner decision is to block racist,
   discriminatory, anti-immigrant, sectarian, abusive and inflammatory names.
   Minimum viable: (a) admin can rename any player and any league from the
   control room; (b) a blocked-word check at registration and league creation;
   (c) the rules page states names may be changed if inappropriate. Full
   pre-approval queues are NOT needed — rename power plus a stated policy
   covers a league of strangers.
6. **Support channel that scales** [GATE: signups]. The recorded contact line is
   generic Contact admin wording for help, scoring questions and deletion
   requests. The public site should not expose a personal email unless approved
   later. Expect the busiest days to be lock day and matchday 1.
7. **Capacity decision** [GATE: signups]. The recorded initial public cap is
   250 users and 20 leagues. Plan against the current low-cost/free setup first.
   Before increasing capacity, review hosting, Supabase Auth and email limits,
   including account-email sending limits.
8. **Load reality-check** [GATE: tournament]. Seed synthetic users at the
   planning number (the 16A synthetic-identity plumbing makes this cheap) and
   open the leaderboards, Match Centre and league pages against staging. Fix
   what is slow; add pagination to leaderboards if needed (a 1,300-row table is
   not a 65-row table). One evening of work that prevents matchday-1 meltdown.
9. **Email confirmation on signup** [GATE: signups, decision]. The recorded
   owner decision is ON for public registration. With strangers, confirm-your-email
   reduces typo and throwaway accounts occupying display names and league slots.
10. **Growth mechanics** [SCHEDULED, mostly exists]. Guest-first journey already
    lets a stranger try before signing up — a genuine advantage; keep it sacred
    in every stage. Confirm invite links / public-league join flow are on the
    roadmap with a stage owner, since discovery is how "a lot more" happens.
11. **Uptime + error monitoring become mandatory** [GATE: tournament]. At 65
    users a down site is an apology in the chat; at 1,000 it is reputational.
    The runbook's UptimeRobot item plus confirming the observability layer
    reports real production errors somewhere Nicky actually sees.
12. **Privacy weight increases** [GATE: signups]. The RULES-1 privacy note and
    deletion path stop being polish. The recorded wording covers account, display
    name, league membership, predictions, scores and support/deletion request
    information. Do not make a specific data-region claim until the actual
    project region is confirmed.

## D. Suggested sequencing

- Stage PRODUCT-GATE-DECISIONS-1 — CLOSED: decision-register rows now record items 1 (tie-breaks), 5 (moderation policy), 7 (capacity planning + tier decision) and 9 (email confirmation) as explicit owner/implementation gates without inventing unresolved owner choices.
- RULES-1B signup gate status — CLOSED: the Rules Hub now visibly lists the remaining public-signup blockers (support contact, capacity/tier, email confirmation, privacy region and name moderation) without closing them or inventing owner choices.
- PUBLIC-SIGNUP-READINESS-1 — CLOSED: the open signup gates now have one central app model consumed by the Rules Hub, and wider public registration remains explicitly closed until every gate is closed.
- OWNER-SIGNUP-DECISIONS-1 — CLOSED: the owner decisions are now recorded for Contact admin support wording, 250 users, 20 leagues, current low-cost/free planning, email confirmation ON, conservative privacy wording, moderation policy and not staying invite-only after moderation is ready. Public registration still remains closed.
- RULES-1 stage: unchanged scope, contact line uses the recorded Contact admin wording.
- Before opening signups beyond the WC26 group: items 2, 5 implementation, 6, 7, 9, 12 done.
- Before matchday 1: items 1 (resolver), 8, 11.
- Everything else: normal ledger flow.

## E. What deliberately did NOT make this list

Password complexity rules beyond the current minimum, CAPTCHA, native apps,
notification emails, and social features beyond the existing roadmap — all
real ideas, none load-bearing for launch, all cuttable under the
function-before-polish rule. Listed so future sessions do not re-raise them
as overlooked.


## D. v9 streamlined remaining product batches

The v9 recording stage replaces the long fragmented remaining-jobs list with grouped batches. Use this order unless Nicky explicitly re-sequences it:

```text
0. CONTRACTS-REF-LOCKED-SURFACES-3
1. STAGE-RULES-SCORING-LOCK-1
2. STAGE-ENTRY-AND-REVIEW-JOURNEY-1
3. STAGE-MORE-ACCOUNT-TRUST-1
4. STAGE-LEAGUE-SETUP-AND-INVITES-1
5. STAGE-RESULTS-AND-SCORING-TRUST-1
6. STAGE-TOURNAMENT-STORY-SURFACES-1
7. STAGE-LEAGUE-MANAGEMENT-1
7. STAGE-CONTEXTUAL-SURFACES-1
8. STAGE-CANDIDATE-TEAM-POOL-1
9. STAGE-ADMIN-SCENARIO-RUNNER-1
10. STAGE-LEGACY-REFERENCE-CLEANUP-1
11. STAGE-TOURNAMENT-READINESS-ACCEPTANCE-1
```

Batch 1 must lock scoring, tiebreaks, group-goals auto-calculation, KO scoring examples and non-standard match-state scoring rules. Batch 2 must handle Home/Review/Welcome/Join together, including unresolved tie prompts, bracket invalidation, joker confirmation and the locked prediction snapshot. Batch 7 and Batch 8 remain separate because candidate-team assignment and simulated results are data/safety-critical. Batch 10 closes with load, no-flicker, scoring and full-tournament readiness acceptance.

## Stage STAGE-RULES-SCORING-LOCK-1 — scoring/tiebreak tournament gate recorded

The tournament gate for rules/scoring/tiebreak clarity is now recorded as a locked product target.

Before public/tournament readiness, implementation must still make the live app, Rules Hub, Review, scoring displays and acceptance checks match `docs/RULES-SCORING-LOCKED-CONTRACT.md`.

The locked target includes:

- Original Predictor scoring values;
- KO Predictor scoring values and examples;
- group goals auto-calculated only;
- unresolved in-group and best-third resolver prompts;
- bracket invalidation after group-score edits;
- joker confirmation;
- locked prediction snapshot;
- league-after-lock rule;
- delayed/postponed/suspended/abandoned/replay/result-pending match-state scoring rules;
- final tied-rank ladders.

This recording stage has no Supabase writes, no scoring engine change, no resolver change and no migration. Active migrations remain 18 and Migration 019 is not created.


### STAGE-ENTRY-AND-REVIEW-JOURNEY-1 — Entry and Review journey contract

Recorded after `STAGE-RULES-SCORING-LOCK-1` as the governing contract for Home clarity, Review Picks, Welcome and Invite/Join. The stage locks the progress-aware CTA ladder, Review completion blockers, no wrong-state flicker requirement, unresolved in-group tiebreaker prompt, best-third prompt, bracket invalidation warning, joker confirmation modal, calculated-only group-goals display, locked prediction snapshot and invite/join states.

Scope is docs/audit-only. It does not change runtime UI, routes, scoring, resolver, Supabase, Auth, result-entry or migrations. Active migrations remain 18 and Migration 019 is not created.

Next implementation target: convert the recorded contract into the actual entry journey once the code patch is explicitly scoped. The implementation must keep `#/review` and `#/welcome` as preferred destinations or route-equivalent states, and must pass the new `audit:entry-review-journey`.

STAGE-MORE-ACCOUNT-TRUST-1 marker record: Support route/content; admin-only link visibility; Public signup remains closed until implementation gates are complete; Migration 019 remains blocked.

### STAGE-LEAGUE-SETUP-AND-INVITES-1 — League Setup and Invites contract

Recorded after `STAGE-MORE-ACCOUNT-TRUST-1` as the governing contract for the create league flow, join league flow, invite-code states, invalid/expired/full league states, league privacy explanation, empty league states, member list clarity, post-signup/post-login league continuation and league share/invite copy.

Scope is docs/audit-only. It does not change runtime UI, routes, Auth configuration, Supabase schema/RPC/RLS/service-role use, league membership writes, scoring, resolver, result-entry or migrations. Active migrations remain 18 and Migration 019 is not created.

Public signup remains closed until implementation gates are complete. Join codes do not bypass signup/auth gates, joining a league after lock should not remove valid pre-deadline prediction points, and league membership does not combine Original and KO points.

Implementation must use `docs/LEAGUE-SETUP-AND-INVITES-CONTRACT.md` as the target, preserve Original Predictor and KO Predictor standings as separate competitions, and cover all invite-code states before claiming the flow complete.

STAGE-LEAGUE-SETUP-AND-INVITES-1 marker record: create league flow; join league flow; invite-code states; invalid/expired/full league states; league privacy explanation; post-signup/post-login league continuation; league share/invite copy; Public signup remains closed until implementation gates are complete; Migration 019 remains blocked.



### STAGE-RESULTS-AND-SCORING-TRUST-1 — Results and Scoring Trust contract

Recorded after `STAGE-LEAGUE-SETUP-AND-INVITES-1` as the governing contract for results status wording, scoring explanation, correction/recalculation wording, why did I get these points? clarity, Original vs KO points separation, admin result-entry trust copy, pending/delayed/postponed/suspended/abandoned/replay states, leaderboard freshness wording and fake/simulated result separation.

Scope is docs/audit-only. It does not change runtime UI, routes, Auth configuration, Supabase schema/RPC/RLS/service-role use, scoring engine, resolver behaviour, official result entry, fake-result writes, league writes or migrations. Active migrations remain 18 and Migration 019 is not created.

Public signup remains closed until implementation gates are complete. Result surfaces must not imply final points before official confirmation/recalculation, and simulated results must never be confused with real official results or award real points.

Implementation must use `docs/RESULTS-AND-SCORING-TRUST-CONTRACT.md` as the target, preserve Original Predictor and KO Predictor points as separate competitions, and cover all non-standard match states before claiming the flow complete.

STAGE-RESULTS-AND-SCORING-TRUST-1 marker record: results status wording; scoring explanation; correction/recalculation wording; why did I get these points? clarity; Original vs KO points separation; admin result-entry trust copy; leaderboard freshness wording; fake/simulated result separation; Public signup remains closed until implementation gates are complete; Migration 019 remains blocked.


### STAGE-ADMIN-OPS-TRUST-1 — Admin Ops Trust contract

Recorded after `STAGE-RESULTS-AND-SCORING-TRUST-1` as the governing contract for admin control-room trust wording, result-entry guardrails, correction/recalculation audit explanation, fixture schedule/edit trust wording, admin roles explanation, fake/simulated scenario separation, owner-only dangerous action wording, operation history clarity and public/admin trust boundaries.

Scope is docs/audit-only. It does not change runtime UI, routes, Auth configuration, Supabase schema/RPC/RLS/service-role use, fixture writes, result writes, admin-operation writes, scoring engine, resolver behaviour, official result entry, fake-result writes, league writes or migrations. Active migrations remain 18 and Migration 019 is not created.

Public signup remains closed until implementation gates are complete. Admin Scenario Runner output, fake scores, synthetic seed runs and simulated results must never be confused with official results, never award real points, never pollute production and never write to canonical official results.

Implementation must use `docs/ADMIN-OPS-TRUST-CONTRACT.md` as the target, preserve Original Predictor and KO Predictor as separate competitions, explain admin roles and guardrails clearly, and make dangerous owner-only actions and operation history understandable before claiming the admin operations trust layer complete.

STAGE-ADMIN-OPS-TRUST-1 marker record: admin control-room trust wording; result-entry guardrails; correction/recalculation audit explanation; fixture schedule/edit trust wording; admin roles explanation; fake/simulated scenario separation; owner-only dangerous action wording; operation history clarity; public/admin trust boundaries; Public signup remains closed until implementation gates are complete; Migration 019 remains blocked.

### STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-READINESS-1 — Public Signup Implementation Readiness contract

Recorded after `STAGE-ADMIN-OPS-TRUST-1` as the governing contract for public signup gates mapped to owner decisions, email confirmation ON expectations, support/contact-admin flow, 250-user / 20-league capacity guardrails, conservative privacy wording, display-name moderation expectations, low-cost/free hosting assumptions, exact “still closed until implementation” wording and explicit checks before any Auth config change.

Scope is docs/audit-only. It does not change runtime UI, routes, Auth configuration, Supabase schema/RPC/RLS/service-role use, browser writes, scoring engine, resolver behaviour, official result entry, fake-result writes, league writes or migrations. Active migrations remain 18 and Migration 019 is not created.

Public signup remains closed until implementation gates are complete. This stage is readiness recording only; it must not be treated as permission to open registration, change Supabase Auth settings or publish a public signup form.

Implementation must use `docs/PUBLIC-SIGNUP-IMPLEMENTATION-READINESS-CONTRACT.md` as the target, preserve email confirmation ON expectations, keep capacity guardrails at 250 users / 20 leagues until explicitly changed, and complete display-name moderation expectations before claiming public signup readiness.

STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-READINESS-1 marker record: public signup gates mapped to owner decisions; email confirmation ON expectations; support/contact-admin flow; 250-user / 20-league capacity guardrails; conservative privacy wording; display-name moderation expectations; low-cost/free hosting assumptions; exact “still closed until implementation” wording; explicit checks before any Auth config change; public signup remains closed until implementation gates are complete; Migration 019 remains blocked.



## STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-1 — IMPLEMENTATION GUARD READY

First implementation guard: client-side pre-Auth display-name moderation, existing availability RPC preserved before Auth sign-up, email-confirmation success copy preserved, support/contact-admin and privacy gate copy visible, and public registration remains closed until external Auth/config checks are confirmed. No Migration 019.


## Stage STAGE-PUBLIC-SIGNUP-OPENING-GATE-1

STAGE-PUBLIC-SIGNUP-OPENING-GATE-1 records the final pre-open checklist for public signup, visible “registration still closed / opening soon” state, explicit owner approval requirement before opening registration, confirmation that email confirmation is ON, confirmation redirect URLs are correct, confirmation capacity limits are acceptable, confirmation support/contact route is ready, confirmation display-name moderation is active, no Supabase Auth dashboard/config change in the patch and public registration remains closed.

Scope is docs/audit-only. It does not change runtime UI, routes, Auth configuration, Supabase schema/RPC/RLS/service-role use, browser writes, scoring engine, resolver behaviour, official result entry, fake-result writes, league writes or migrations. Active migrations remain 18 and Migration 019 is not created.

A later opening stage may only proceed after explicit owner approval. This gate must not be treated as permission to open public registration.

STAGE-PUBLIC-SIGNUP-OPENING-GATE-1 marker record: final pre-open checklist for public signup; visible “registration still closed / opening soon” state; explicit owner approval requirement before opening registration; confirmation that email confirmation is ON; confirmation redirect URLs are correct; confirmation capacity limits are acceptable; confirmation support/contact route is ready; confirmation display-name moderation is active; public registration remains closed; Migration 019 remains blocked.

## Stage STAGE-PUBLIC-SIGNUP-CONTROLLED-OPEN-1

STAGE-PUBLIC-SIGNUP-CONTROLLED-OPEN-1 records the controlled public signup opening runbook, owner approval must be explicit, current and recorded, opening-gate checklist must be satisfied before any public opening, email confirmation must be checked in the external account settings, account redirect URLs must return to the Euro 2028 app, not WC26, display-name moderation remains before account creation, display-name availability remains before account creation, support/contact route remains visible for public users, initial capacity remains 250 users and 20 leagues unless replaced by an owner decision, public registration remains closed until the owner completes the external opening action, and no Supabase Auth dashboard/config change in the patch.

Scope is docs/audit-only. It does not change runtime UI, routes, Auth configuration, Supabase schema/RPC/RLS/service-role use, browser writes, scoring engine, resolver behaviour, official result entry, fake-result writes, league writes or migrations. Active migrations remain 18 and Migration 019 is not created.

A later opening stage may only change app-side public signup status or external opening behaviour after the owner confirms the controlled-open runbook. This stage must not be treated as permission to open public registration.

STAGE-PUBLIC-SIGNUP-CONTROLLED-OPEN-1 marker record: controlled public signup opening runbook; owner approval must be explicit, current and recorded; opening-gate checklist must be satisfied before any public opening; email confirmation must be checked in the external account settings; account redirect URLs must return to the Euro 2028 app, not WC26; display-name moderation remains before account creation; display-name availability remains before account creation; support/contact route remains visible for public users; initial capacity remains 250 users and 20 leagues unless replaced by an owner decision; public registration remains closed until the owner completes the external opening action; Migration 019 remains blocked.

## STAGE-PUBLIC-SIGNUP-EXTERNAL-SETTINGS-CHECK-1 — CLOSED / RECORDED

STAGE-PUBLIC-SIGNUP-EXTERNAL-SETTINGS-CHECK-1 records the owner-checked external settings for the controlled public signup path. Euro staging project checked: gcfdwobpnanjchcnvdco. Email confirmation: ON. New user signups: still closed. Site URL / app URL: https://euro28-predictor-dev.netlify.app. Redirect URLs include Euro dev site: yes. Redirect URLs currently include local dev URLs: yes. WC26 URLs used for Euro auth return: no. Email templates editable without SMTP: no. Email templates mention WC26: unable to edit/check fully without SMTP. Custom SMTP required before branded public email templates: yes. Initial capacity accepted before SMTP: 50 users / 20 leagues. Target capacity after SMTP: 100 users / 20 leagues. Review point after SMTP: 75 users / 15 leagues. Support/contact route required: yes. Display-name moderation required: yes. Public registration remains closed; active migrations remain 18; Migration 019 remains blocked.

This stage replaces the earlier 250-user planning figure for the first opening path. Before SMTP/branded email delivery, the cap is 50 users and 20 leagues. After SMTP is configured and usage is reviewed, the next target is 100 users and 20 leagues, with review at 75 users or 15 leagues.


Capacity marker: initial capacity is replaced by the external settings check: 50 users and 20 leagues before branded email sending, then 100 users after email delivery is reviewed.
