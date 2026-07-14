# Euro 2028 Predictor — Stage 13F-J
## Player Insight and Points Storytelling
### Package baseline: `63d7acb`

## 1. Accepted outcome

Stage 13F-J turns the existing canonical scoring rows into one understandable player-performance story without changing any scoring rule, prediction contract or competition boundary.

The accepted surface covers:

- the signed-in player on the full Leaderboards destination;
- authorised visible players inside the existing overall and private-league head-to-head journey;
- concise rank and leader-gap context on Home;
- separate Original Predictor and KO Predictor stories at all times.

There is no new permanent navigation destination and no public player-profile route.

## 2. Canonical point sources

The Original Predictor story separates:

- exact group-match score points;
- correct group-match outcome points;
- group-joker bonus points;
- Original bracket milestone points.

The KO Predictor story separately exposes:

- exact 90-minute score points;
- correct 90-minute outcome points;
- advancing-team points;
- decision-method points;
- KO-joker bonus points.

There is no group-position scoring category. The accepted Euro contract does not award separate group-position points.

Tournament-pick points are not implemented in this batch. Their persistence, scoring consumption and player-facing presentation remain owned by Stage 17A.

## 3. Storytelling and evidence

The shared player-insight model derives presentation statistics only from canonical awarded point rows. It may aggregate those rows, but it never calculates a score award independently.

The accepted story includes:

- rank and total points;
- points behind the leader;
- points required to draw level with the next higher distinct score;
- tied-score context;
- canonically processed match count;
- exact scores and correct results;
- successful jokers;
- points by group matchday or knockout round;
- best points-scoring period;
- longest consecutive scoring-match streak;
- highest-scoring individual call;
- corrected-result counts and revision evidence;
- expandable match and Original bracket evidence.

A subjective “toughest call” is deliberately excluded because no canonical difficulty or community-rarity definition has been approved. Historical rank movement is also excluded because no rank-history snapshots exist.

## 4. Privacy and access

Migration 017 adds one read-only security-definer RPC:

`public.get_player_competition_points(uuid, uuid, text)`

The RPC:

- requires an authenticated caller;
- accepts only `original` or `ko_predictor`;
- allows a player to read their own canonical point rows;
- reuses the existing shared-prediction privacy boundary for another player;
- keeps another Original Predictor protected until the global Original lock;
- exposes another KO Predictor only fixture by fixture after each real match starts;
- recalculates the visible KO subtotal from released point rows so future KO points cannot leak;
- returns no write capability;
- adds no table, column, scoring rule, admin power or browser database write.

The frontend treats each player-insight request as an isolated section. A temporary insight failure does not remove already-authorised H2H prediction comparison data.

## 5. Provisional team treatment

Every Stage 13F-J surface that presents a team uses the existing shared `TeamLabel` primitive and its `isProvisional` data flag. This includes Original bracket point evidence and the team selections shown inside H2H.

This closes the component-side prerequisite for the later Stage 16A data-only seeding rehearsal.

## 6. Stage boundaries

Stage 13F-J does not include:

- tournament-pick tables, selectors, outcome entry or scoring consumption;
- Stage 13F-K fixture, result, scoring-run or admin operations;
- Stage 13P-A converging bracket or share-image presentation;
- a combined Original/KO total;
- a standalone Awards destination;
- direct browser database writes;
- inherited WC26 scoring or profile code.

## 7. Migration decision

Migration 017 is genuinely required because the existing trusted reads expose full point-source rows only for the signed-in player. Browser-side reconstruction of another player’s awarded points would duplicate scoring logic and violate the accepted architecture.

The migration is deliberately limited to an authorised read contract. Active migrations move from 16 to 17 only after owner verification and application to Euro staging project `gcfdwobpnanjchcnvdco`.

## 8. Ledger movements

This package records these planning and functional changes:

1. `Player insight and points storytelling` moves from `🕓 SCHEDULED` to `✅ FUNCTIONAL` only after Migration 017 and all owner gates are accepted.
2. Stage 16A remains scheduled but expands to provisional teams, nineteen deterministic synthetic personas, scenario scoring/correction assertions, seeded leagues and marker-safe teardown.
3. New Stage 16A support rows are added for the persona catalogue, independent oracle, leagues and teardown.
4. Real multi-user persistence, database-aware Time & Phase behaviour and correction recalculation remain `🟠 PARTIAL` until Stage 16A evidence exists.
5. Hosted Euro staging simulation replaces the obsolete local-only/decision-pending wording and remains `🕓 SCHEDULED`.
6. No Stage 13F-K, Stage 13P-A or Stage 17A row moves.

## 9. Stage 16A planning addition

**Stage 16A — Provisional teams, synthetic users and deterministic scenario seeding** is the opening Stage 16 batch.

Its accepted later scope is:

- seed exactly 24 provisional teams and rehearse data-only real-team replacement;
- create the approved nineteen-persona catalogue with deterministic Original and KO rules;
- create marked users through the staging-only Supabase Admin API using uncommitted local credentials;
- seed deterministic predictions, league memberships, scenario results and a correction-sensitive recalculation case;
- compare canonical database totals with an independent precomputed oracle at every Time & Phase preset;
- populate leaderboards, leagues, H2H, Match Centre, Bracket Health, profiles and player insight;
- tear down exactly and only dual-marker synthetic data, assert zero residue and reseed cleanly;
- never apply the irreversible real global lock on shared staging.

Two separately packaged preconditions are approved before Stage 16A execution: privacy-safe `is_synthetic` identity plumbing and a staging-effective database-time contract. Neither may expose raw auth data, change scoring/resolver behaviour or affect production/non-provisional tournaments.

Stage 13F-J records this scope only. It does not create the Stage 16 data files, scripts, users or migrations early.

## 10. Completion evidence required from the owner

Acceptance still requires actual Terminal output for:

- branch, clean-tree and checkpoint verification;
- package and payload checksum verification;
- exact manifest comparison;
- Migration 017 local or linked database test;
- focused Stage 13F-J audit and tests;
- full `npm run check`;
- active migration count and staging application status;
- local mobile and desktop visual review;
- exact staging, commit, push and local/remote alignment.
