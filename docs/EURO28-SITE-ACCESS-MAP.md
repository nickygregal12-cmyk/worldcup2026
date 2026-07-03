# Euro 2028 Predictor — Site Access Map
## Functional access contract
### Prepared for Stage 13F-0

## 1. Purpose

A feature is not functionally complete merely because its component or data service exists. Every player-facing capability must have an intentional route or contextual entry point, must be reachable on mobile and desktop, and must not depend on discovering content far down an unrelated page.

This document records the application access architecture. The Functional Completion Ledger records whether each destination is actually functional.

## 2. Permanent primary navigation

The five-position mobile navigation remains:

1. Groups or KO Predictor according to the confirmed tournament lifecycle;
2. permanent Original Bracket;
3. raised Home;
4. Leagues;
5. More.

No sixth permanent mobile position is introduced.

Desktop primary navigation remains:

- Home;
- Groups or KO Predictor;
- Bracket;
- Leagues;
- Results.

## 3. Current direct destinations

| Capability | Direct route | Desktop entry | Mobile entry | Contextual entry |
|---|---|---|---|---|
| Home | `#/` | Primary navigation | Raised centre position | Brand mark |
| Groups Predictor | `#/groups` | Lifecycle primary position | Lifecycle position 1 | Home Original card |
| Original Bracket | `#/bracket` | Primary navigation | Position 2 | Original journey |
| KO Predictor | `#/ko-predictor` | Lifecycle primary or More | Lifecycle position 1 or More | Home KO card |
| Private Leagues | `#/leagues` | Primary navigation | Position 4 | Home actions |
| Results | `#/results` | Primary navigation | More | Tournament pulse and leaderboard switcher |
| Leaderboards | `#/leaderboards` | More | More | Home rank cards and Results switcher |
| Account | `#/account` | Header account control | More/header | Guest conversion prompts |
| Tournament and rules | `#/tournament` | More/footer | More | Home scoring card |
| Admin | restricted `#/admin` | Must be capability-gated | Must be capability-gated | No non-admin entry is permitted |

## 4. Results and Leaderboards separation

`Results` owns:

- fixture and result feed;
- live group tables;
- live knockout bracket;
- canonical result/revision context.

`Leaderboards` owns:

- full Original Predictor overall table;
- full KO Predictor overall table;
- competition selector;
- matching personal points breakdown;
- player comparison entry points.

Original and KO standings remain separate. There is no combined view or total.

Home links directly to the relevant competition through:

- `#/leaderboards?competition=original`;
- `#/leaderboards?competition=koPredictor`.

## 5. Contextual future journeys

These do not become unrelated permanent navigation items:

- player identity and H2H open from player names in league and overall tables;
- Match Centre opens from a fixture, result, points row or comparison row and receives a bookmarkable match route in Stage 13F-C;
- Bracket Health opens from the Original Bracket and relevant Home status;
- guest conversion belongs to Account and signup completion;
- staging Time & Phase belongs only inside the authorised Admin control room.

## 6. Access-state requirements

Every direct destination must handle:

- loading;
- empty state;
- partial failure where available data can remain visible;
- complete failure with recovery;
- signed-out state;
- unauthorised state without revealing restricted product surfaces;
- reload and direct-link entry;
- mobile and desktop access.

## 7. Enforcement

The site-access audit must fail if:

- Leaderboards is folded back into the Results route;
- Home loses both competition-specific leaderboard links;
- Leaderboards disappears from More;
- Original and KO competition selection is removed or combined;
- a new major capability is added without an access-map entry and ledger row.
