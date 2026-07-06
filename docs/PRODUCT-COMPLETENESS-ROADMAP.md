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
4. STAGE-TOURNAMENT-STORY-SURFACES-1
5. STAGE-LEAGUE-MANAGEMENT-1
6. STAGE-CONTEXTUAL-SURFACES-1
7. STAGE-CANDIDATE-TEAM-POOL-1
8. STAGE-ADMIN-SCENARIO-RUNNER-1
9. STAGE-LEGACY-REFERENCE-CLEANUP-1
10. STAGE-TOURNAMENT-READINESS-ACCEPTANCE-1
```

Batch 1 must lock scoring, tiebreaks, group-goals auto-calculation, KO scoring examples and non-standard match-state scoring rules. Batch 2 must handle Home/Review/Welcome/Join together, including unresolved tie prompts, bracket invalidation, joker confirmation and the locked prediction snapshot. Batch 7 and Batch 8 remain separate because candidate-team assignment and simulated results are data/safety-critical. Batch 10 closes with load, no-flicker, scoring and full-tournament readiness acceptance.
