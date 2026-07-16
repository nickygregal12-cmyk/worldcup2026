# Euro 2028 Predictor — Product Experience v3

## Status

Owner-approved product and visual contract, recorded 2026-07-16.

This contract supersedes the earlier Design Programme and v2 page references on appearance and on
the explicit behaviour amendments below. Existing scoring, resolver, guest, privacy, operations and
competition contracts remain binding unless this document explicitly records an owner amendment.

The separate interactive review prototype is a visual reference only. Its mock data and implementation
code must never be copied into production. The live app must continue to use the repository's shared
React components, CSS Modules, domain models, services, Supabase reads and server-enforced gates.

## Product boundaries

- Original Predictor is the primary pre-tournament competition.
- Its 36 group scores, five group jokers, Original Bracket and Review selections share one global
  tournament-start lock.
- KO Predictor is a separate bonus competition. Each confirmed KO fixture locks independently at
  that match's kick-off.
- Original and KO predictions, leagues, standings, points, jokers and profile evidence never combine.
- A league belongs to exactly one competition. The Leagues screen may switch between Original and KO
  collections, but switching never turns an Original league into a KO league or reuses its membership.
- Guest mode, central scoring, canonical resolver behaviour, provisional-data warnings and simulated-
  result isolation remain unchanged.

## Mobile shell and theme

- Mobile navigation remains Groups/KO, Bracket, Home, Leagues and More.
- All five items share one vertical alignment and equal-width positions.
- Home is not physically raised. Its larger circular background may overlap the bar edge slightly while
  the icon, label and tap target remain aligned with the other items.
- The whole bar smoothly hides on sustained downward scroll and returns immediately on upward scroll.
  It stays visible at page tops and while a text input is active.
- Light and dark themes are first-class. First visit follows the device preference; a manual choice is
  saved and wins on later visits.
- Use the central icon adapter and real flag assets. No emoji icons or emoji flags.
- Gold remains joker-exclusive. Jokers use the bespoke playing-card mark.

## Home

- The first phone viewport prioritises the player's rank and leagues.
- Before the tournament, the Original Predictor and its next completion action remain primary.
- League sharing is promoted before the tournament; rank, movement and gap become more prominent once
  scoring begins.
- KO Predictor has a quiet teaser from the start. Confirmed R16 fixtures may be entered as they become
  known, but KO does not become a primary Home feature until the group stage officially ends.
- Tournament state determines Home order: pre-tournament, matchday/live, between sessions and post-match.

## Groups and Review

- Keep both By group and By date views. The user's choice persists.
- Entering Groups positions the next relevant match on screen. A live match takes priority; after all
  matches finish, the latest result is used.
- Every match card opens Match Centre. Score, joker and other embedded controls must not trigger that link.
- Support steppers and direct numeric entry with the existing target-size and high-score safeguards.
- Keep progress, joker usage, predicted tables, best-third ranking, Lucky Dip, unresolved-tie handling,
  stale-bracket repair and the Groups → Original Bracket → Review journey.
- Review must continue to itemise all completion blockers and tournament-pick requirements.

## Original Bracket

- Phone default is round-by-round. Wall chart remains an optional switch and the native desktop/tablet view.
- Selected winners and their surviving connectors use stronger colour and path emphasis.
- Predicted and real contexts use visibly different treatments.
- Locked Bracket Health compares the frozen prediction with canonical real progression without changing
  saved picks.

## KO Predictor

- A quiet teaser exists from the start.
- As soon as both teams in a real KO fixture are confirmed, that fixture becomes predictable.
- Unknown fixtures remain non-interactive placeholders.
- Full promotion and the Groups-to-KO navigation replacement occur only after the group stage officially
  ends and the Round-of-16 set is ready.
- Each match's score, advancer, method and joker lock and reveal at that match's kick-off.

## Leagues

- The first phone viewport adapts to tournament phase: share/invite before play, then rank, movement and gap.
- Two large Original/KO collection tabs appear only once KO prediction is available.
- Each tab lists leagues created for that competition only and remembers its own selected league.
- An empty KO collection offers Create KO league and Join KO league; it never displays an Original league.
- Member rows stay compact and open the shared player-profile flow.

## Results, Leaderboards and Match Centre

- Results and Leaderboards remain separate destinations.
- Results order is dynamic: upcoming before play, live first during play, recent results and table changes
  between sessions, then knockout and final-tournament state.
- Results explain real-table movement, qualification consequences, personal points, league movement and
  bracket impact using canonical data.
- Every fixture opens Match Centre.
- Match Centre owns the single-match view: official state, personal pick, scoring status, real-table or
  bracket consequences, league/overall scope, selection distribution, exact-score choices, on-target
  players and projected movement.
- Match Centre member names open the shared player flow.

## Player profiles, points and H2H

- Player activation first opens a compact profile sheet with rank, competition points, gap, bracket health
  and actions for H2H, full profile and pinning a rival.
- Full Player View keeps Original and KO contexts separate and provides predictions, points evidence,
  bracket/tables evidence and H2H.
- Pinned rivals are account data, not local mock state. They surface on Home, Leagues, Match Centre and H2H.
- H2H leads with the points scoreline, scoring-source comparison, decisive matches, point swings, remaining
  different predictions and bracket comparison.
- Anyone authorised to see a scored row can open its complete points audit even when they cannot open that
  player's full profile. Full-profile permission remains independently protected.
- The audit must itemise every central scoring source, including match, joker, group-position, perfect-group,
  group-goals, Original Bracket and tournament-pick points when those sources are implemented and awarded.

## More

- More is a grouped lifecycle-aware directory for important destinations omitted from mobile primary nav.
- It includes Results, Leaderboards, Tournament, How to Play, Account and relevant prediction-history routes,
  plus Support, Privacy/Data, About and authorised Admin access when those destinations exist.
- Contextual objects such as Match Centre are not duplicated.

## Engineering acceptance

- Production views contain no hard-coded example tournament state, people, predictions, points or deadlines.
- Persistent state comes from canonical database records and shared services.
- The same scoring evidence powers Leaderboards, leagues, profiles, H2H, Results and Match Centre.
- Deadline and reveal policies are enforced server-side using canonical timestamps.
- Avoid per-member request fan-out where a scoped aggregate database read is appropriate.
- Preserve loading, empty, partial-failure, error, signed-out, unauthorised, direct-link, responsive, light and
  dark states.
- UI changes require focused tests, full checks, browser review and owner visual approval.

