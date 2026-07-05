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
   validation is length-only. Minimum viable: (a) admin can rename any player
   and any league from the control room; (b) a small blocked-word check at
   registration and league creation; (c) the rules page states names may be
   changed if inappropriate. Full pre-approval queues are NOT needed — rename
   power plus a stated policy covers a league of strangers.
6. **Support channel that scales** [GATE: signups]. "Message Nicky in the group
   chat" does not survive strangers. Decide the channel (dedicated email address
   is enough) and use it as the RULES-1 contact line. Expect the busiest days to
   be lock day and matchday 1.
7. **Capacity decision** [GATE: signups]. Pick a planning number (suggest: plan
   for 10–20x WC26, so 650–1,300). Against that number, before opening signups:
   Supabase tier limits (connections, row reads at kickoff spikes, auth emails),
   Netlify bandwidth, and auth email sending limits (Supabase built-in email is
   heavily rate-limited — a custom SMTP provider is usually required beyond
   trivial volume; this catches EVERYONE who scales signups). Record the chosen
   tier/budget as a Register decision.
8. **Load reality-check** [GATE: tournament]. Seed synthetic users at the
   planning number (the 16A synthetic-identity plumbing makes this cheap) and
   open the leaderboards, Match Centre and league pages against staging. Fix
   what is slow; add pagination to leaderboards if needed (a 1,300-row table is
   not a 65-row table). One evening of work that prevents matchday-1 meltdown.
9. **Email confirmation on signup** [GATE: signups, decision]. With strangers,
   confirm-your-email stops typo'd and throwaway addresses from occupying
   display names and league slots. Costs signup friction; recommend ON given
   scale, decided in the Register either way.
10. **Growth mechanics** [SCHEDULED, mostly exists]. Guest-first journey already
    lets a stranger try before signing up — a genuine advantage; keep it sacred
    in every stage. Confirm invite links / public-league join flow are on the
    roadmap with a stage owner, since discovery is how "a lot more" happens.
11. **Uptime + error monitoring become mandatory** [GATE: tournament]. At 65
    users a down site is an apology in the chat; at 1,000 it is reputational.
    The runbook's UptimeRobot item plus confirming the observability layer
    reports real production errors somewhere Nicky actually sees.
12. **Privacy weight increases** [GATE: signups]. The RULES-1 privacy note and
    deletion path stop being polish: strangers' emails at scale, UK. Confirm
    Supabase data region while writing the note.

## D. Suggested sequencing

- Next docs patch: Register entries for items 1 (tie-breaks), 5 (moderation
  policy), 7 (capacity number + tier), 9 (email confirmation) — all
  paste-and-bump decisions.
- RULES-1 stage: unchanged scope, contact line now uses the item-6 channel.
- Before opening signups beyond the WC26 group: items 2, 5, 6, 7, 9, 12 done.
- Before matchday 1: items 1 (resolver), 8, 11.
- Everything else: normal ledger flow.

## E. What deliberately did NOT make this list

Password complexity rules beyond the current minimum, CAPTCHA, native apps,
notification emails, and social features beyond the existing roadmap — all
real ideas, none load-bearing for launch, all cuttable under the
function-before-polish rule. Listed so future sessions do not re-raise them
as overlooked.
