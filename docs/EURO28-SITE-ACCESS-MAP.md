# Euro 2028 Predictor — Site Access Map
## Stage 13G-0 information architecture contract
### Version 2.0

## 1. Purpose

A capability is not complete merely because a component or data service exists. Every user intention must have an intentional direct destination or contextual owner, be reachable on mobile and desktop, and use the same primitive and anatomy wherever it appears.

This map governs destination ownership. The Functional Completion Ledger governs implementation state.

## 2. Permanent primary navigation

The five-position mobile navigation remains:

Mobile positions:

1. Groups or KO Predictor according to the confirmed readiness lifecycle;
2. permanent Original Bracket;
3. raised Home;
4. Leagues;
5. More.

Desktop remains Home, lifecycle Groups/KO, Bracket, Leagues and Results, with the same More strategy available from the header.

No sixth mobile position is introduced.

## 3. Direct destinations

| Destination | Direct route and aliases | Desktop path | Mobile path | Contextual path | User expectation |
|---|---|---|---|---|---|
| Home | `#/`, `#/home` | Home/brand | Raised Home/brand | — | Next action, live context and personal progress |
| Groups Predictor | `#/groups`; aliases `#/predict`, `#/predictions`, `#/group-stage-review` | Lifecycle primary | Position 1 before full KO readiness | Home Original CTA | Enter/review all group scores |
| Original Bracket | `#/bracket` | Primary | Position 2 permanently | Original journey and points evidence | Build/monitor the permanent pre-tournament bracket |
| KO Predictor | `#/ko-predictor`; alias `#/ko` | Lifecycle primary or More | More at early access; Position 1 at full readiness | Deliberate teaser/Home mention | Predict resolved real knockout fixtures in a separate competition |
| Leagues | `#/leagues` | Primary | Position 4 | Home actions and invite links | Create, join, manage and compare private leagues |
| Results | `#/results` | Primary | More | Home Tournament pulse, Match Centre and leaderboard switcher | Fixtures, results, tables and live bracket |
| Leaderboards | `#/leaderboards`; aliases `#/standings`, `#/rankings` | More | More | Home competition ranks and Results switcher | Full separate competition standings and personal insight |
| Match Centre | `#/match-centre?match=<number>`; alias `#/match` | Contextual | Contextual | Fixture, result, bracket, points and comparison rows | Everything about one match |
| Account | `#/account` | Header/More | Header/More | Guest conversion prompts | Authentication, recovery and profile |
| Tournament & how to play | `#/tournament` and `#/how-to-play` | More/footer | More/footer | Home rules | Tournament facts, venues, format and complete rules guide |
| Admin | restricted `#/admin` | Authorised More | Authorised More | No ordinary-user entry | Tournament operations |
| Not found | explicit recovery state | Invalid direct link only | Invalid direct link only | — | Explain invalid link and return safely |

Aliases are compatibility routes only. They never create duplicate navigation choices.

## 4. Contextual object surfaces

| Surface | Opens from | Owned content | Permanent navigation? |
|---|---|---|---|
| Team Profile | Any `TeamLabel` | Curated facts, app-owned tournament data and authorised aggregates | No |
| Player Overview | Any shared player identity | Authorised predictions, Original bracket, separate points stories and H2H action | No |
| H2H | Player Overview | Competition-specific aligned comparison under existing privacy rules | No |
| Bracket Health | Original Bracket and bracket evidence | Saved bracket versus canonical live progression | No |
| League invite | Selected league share action/server-visible invite URL | Join explanation and safe invite metadata | No |

No screen may build a local substitute for these shared surfaces.

## 5. More lifecycle strategy

### Before the tournament

1. Tournament & how to play
2. Results
3. Leaderboards
4. KO Predictor — coming after the group stage
5. Account
6. Appearance
7. Admin — authorised only and visually separated

### Group stage live before early KO access

1. Results
2. Leaderboards
3. Tournament & how to play
4. KO Predictor — coming after the group stage
5. Account
6. Appearance
7. Admin — authorised only and visually separated

### Early KO access

1. KO Predictor — confirmed fixtures available
2. Results
3. Leaderboards
4. Tournament & how to play
5. Account
6. Appearance
7. Admin — authorised only and visually separated

### Full KO readiness

1. Group stage review
2. Results
3. Leaderboards
4. Tournament & how to play
5. Account
6. Appearance
7. Admin — authorised only and visually separated

Before early access, the KO item is an explainer only. It shows no unresolved fixture or prediction control.

## 5A. Player insight access

- Home shows concise competition-specific rank and leader-gap context.
- Leaderboards remains the full signed-in player-insight destination until Stage 13G-C moves all player-name activation into one shared Player Overview surface.
- Overall and private-league player identities retain the existing authorised H2H and points-story entry.
- Match evidence deep-links to Match Centre and Original bracket evidence returns to the permanent Bracket destination.
- Protected point detail remains protected even when a public standings row is visible.
- Tournament-pick point presentation remains deferred to Stage 17A.

## 6. Results and Leaderboards separation

Results owns fixtures, canonical results/revisions, live tables and the live bracket.

Leaderboards owns full Original and KO tables, competition selection, personal points story and entry into Player Overview.

Original and KO standings and totals never combine.

Home retains the explicit competition deep links:

- `#/leaderboards?competition=original`;
- `#/leaderboards?competition=koPredictor`.

## 7. Match organisation

- Upcoming playable/viewable matches: next real kick-off first.
- Live matches: highest immediate priority.
- Completed result contexts: most recent first.
- Match Centre previous/next: chronological tournament order.
- Group entry before the tournament: By group default.
- Group viewing after play begins: By date default.
- Manual By group/By date choice persists.
- Both views use the same match components and canonical data.

## 8. Player and team identity

- Every team name uses `TeamLabel`.
- Every player name uses one shared player identity activation primitive.
- The signed-in player's own name behaves consistently with every other player.
- Privacy is evaluated independently for predictions, bracket, points and H2H sections.
- Protected detail remains protected even where a public standing/rank row is visible.

## 9. League invite architecture

The copied invite uses a server-visible URL such as `/invite/<join-code>`, not only a hash fragment.

Static Euro Open Graph metadata is mandatory. Dynamic per-league title/description is approved with a static Euro image. Preview output may contain only league name and generic product copy. It may not contain member names, standings, owner email or prediction data.

Human visitors continue to `/#/leagues?join=<code>`. Invalid/deleted invites receive an explicit safe state.

## 10. Access-state requirements

Every direct destination and contextual surface handles:

- loading;
- empty;
- partial failure while preserving available data;
- complete failure and recovery;
- signed-out;
- unauthorised without restricted-shell disclosure;
- reload and direct-link entry;
- phone, tablet and desktop;
- light and dark themes.

## 11. Enforcement

Stage 13G audits must fail if:

- a major capability lacks an access-map entry and ledger row;
- a contextual object receives an unrelated permanent navigation item;
- More becomes an ungrouped accumulation list;
- pre-readiness KO exposes active controls or unresolved fixtures;
- Results and Leaderboards are recombined;
- Original and KO points are combined;
- a team/player name bypasses its shared activation primitive;
- upcoming/completed match order ignores chronology;
- a visible binding rule or score value is duplicated outside its central contract;
- unknown routes silently pretend to be Home.

## Stage 13G-H0 player destination correction

The intended player-name activation destination is a dedicated Player Overview, not an inline H2H strip. Dedicated H2H and points-breakdown pages are route/deep-link contract changes requiring explicit acceptance before build.

## Stage 13G-ACCOUNT-1 Account update

`#/account` is the real Account destination and renders `src/auth/AccountAccess.jsx`. The signed-in state owns identity, quick stats, security/preferences, leagues shortcut and danger-zone actions. Legacy `src/pages/Profile.jsx` is retired as unreachable WC26 code.
