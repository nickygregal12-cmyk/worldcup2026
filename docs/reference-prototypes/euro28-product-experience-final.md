# Euro 2028 Predictor — Final Product Experience

## Status

Owner-approved production direction, recorded 17 July 2026.

This is the sole binding visual and product-experience contract. It supersedes Product Experience
v3 and every older page prototype on appearance and on the explicit behaviour amendments below.
Older references remain provenance and retain content/interaction requirements only where this
contract does not amend them.

The reviewed interactive HTML is a visual reference, not production source. Its mock people,
fixtures, points, tables and calculations must never be copied into the application. Production
continues to use shared React components, CSS Modules, canonical models/services, database-backed
records and server-enforced locks/privacy.

Existing scoring, resolver, competition separation, guest, operations, database and privacy
contracts remain unchanged.

## Consolidated visual identity — prototype-pack review, 18 July 2026

The owner supplied a three-prototype pack (`euro28-prototypes.zip`: `v1-scottish-navy`,
`v2-matchday-programme`, `v3-final-hybrid` — three ~4,300-line single-file JSX prototypes with
identical functionality and three visual identities) and authorised a genuine re-evaluation with
folder labels ("approved", "final", "hybrid") ignored. All three were compared at token, shell,
component and page level against the ten stated priorities (clarity, mobile usability,
accessibility, consistency, token/architecture compatibility, action hierarchy, responsiveness,
maintainability, performance, distinctiveness). This section records the consolidated result. It
amends this contract's visual rulings where stated; everything it does not amend stands.

### Verdict

**Foundation: the v3 composition — v1's navy broadcast palette carrying v2's editorial
structure — confirmed on merit, not by its folder name.** v1 and v3 share an identical navy
palette that maps 1:1 onto the certified production `--dp-*` token set; v2's cream/ink/green
palette was rejected on objective grounds (below). v2's structural contributions (sharp geometry,
ruled treatments, flat full-width navigation) survive through v3.

### Selected

- **From v1 (and shared by v3):** the navy broadcast masthead — the app header becomes navy
  chrome (`--dp-surface-chrome`) in both themes with `--dp-text-on-chrome` /
  `--dp-text-muted-chrome` text and the sky family as the active accent; these pairings are
  already contrast-certified in the token file. The **cutline** — the dashed qualification
  boundary — becomes a shared motif of qualification contexts, starting with the shared six-team
  third-place qualification table (drawn between the qualifying four and the eliminated two).
- **From v2 (via v3):** sharp editorial geometry. The corner-radius tokens flatten to
  `--radius-sm: 2px`, `--radius-md: 4px`, `--radius-lg: 6px`. `--radius-full` and true circles
  are retained exclusively for identity (team badges, avatars, the mobile Home circle) and pills
  that are already circular by ruling. The flat, full-width bottom navigation bar with a ruled
  top edge replaces any floating-dock treatment; the rule is a 2px sky line, echoing the hero's
  existing sky top rule.
- **From v3 itself:** the hybrid principle — structure from the programme identity, colour from
  the broadcast identity — and the finer ruled texture direction for hero surfaces (already
  present as the hero hatch; retained, not multiplied).

### Rejected, with reasons

- **v2's palette.** Its `--brand` and `--good` are the same green hex — brand and success become
  one colour, which breaks the semantic-separation law and accessibility priorities; adopting it
  would also discard the WCAG-certified `--dp-*` palette and violate the standing navy/sky and
  joker-gold rulings.
- **v1's floating rounded nav dock and 18px geometry.** The full-width ruled bar wastes no edge
  tap space and suits the flat identity; the soft 18px radius family belongs to the superseded
  look.
- **v3's serif display numerals (Fraunces), and every prototype's Google-Fonts CDN loading.**
  Fonts remain self-hosted Public Sans + Big Shoulders Display; display numerals remain Big
  Shoulders Display. Package additions are outside this task's authority and one display face is
  enough.
- **v3's square Home tile, squared identity chips and hard-offset print shadows.** Circular
  ISO-keyed badges, the circular Home treatment and the soft elevation system are standing owner
  rulings and read better against the sharp card geometry than a second competing shadow idiom.
- **Prototype dark-first / light-first defaults.** Theme choice continues to follow the device
  preference on first visit with a saved manual override.
- **All prototype mock content, mock scoring and mock draw data** (including the pack README's
  scoring notes, which contradict the locked scoring contract — noted for the owner; the locked
  contract is unaffected and remains the only scoring authority).

### Page-adoption programme (owner instruction, 18 July 2026)

The owner reviewed the deployed consolidation and ruled that the prototype pack is the approved
composition authority page by page. **This is a full redesign, not an upgrade pass: the prototype
is the final version of how each page looks and flows.** Existing page chrome, heading cards,
banners, copy blocks and layout that have no counterpart in the prototype are removed, not
preserved. Production contributes what the prototype cannot: real data, services, locks, privacy,
accessibility semantics and honest states — where the prototype displays data production does not
yet have (live in-play points, per-member scoring sublines, activity events, rank movement), the
prototype's layout is adopted and that element appears only when its data exists, never as mock
content. Scoring values remain the locked contract's, always. Bonus games ships with KO Predictor
as its only game; Last Man Standing and Duels wait for owner-approved rules and database stages.

- **Leagues (adopted first, 18 July):** the league switcher is a chip rail; Create league and
  Join with code are dashed entry actions; the identity card is compact — name, members-and-code
  meta and share, with rank stats in the actions card; the standings table draws the dashed
  **podium cutline** under the top three once real scoring separates the table; member rows keep
  rank, identity and confirmed points with the quick-profile activation.
- Home, Groups match-card rows, Player Profile/H2H, Match Centre, Results, Tournament and the
  Bonus games hub follow as later slices under this same ruling.

### Resulting amendments to this contract

- The earlier "top bar stays compact" ruling is amended to: the top bar stays compact **and is
  navy chrome in both themes**; theme and Account remain the global actions.
- Card, control and chip geometry across the product follows the flattened radius tokens; no
  page reintroduces the soft radius family.
- Every context presenting the third-place qualification table draws the shared cutline.
- No other section of this contract, no scoring/resolver/Auth/data rule, and no release policy
  changes under this review.

## Product-wide rules

- Preserve the existing production light and dark token palettes. The improvement is hierarchy,
  composition and navigation rather than a replacement colour scheme.
- Use Public Sans for interface copy and Big Shoulders Display for the approved display hierarchy.
- Use the central Lucide adapter for ordinary icons and the bespoke playing-card mark for jokers.
- Use the shared ISO-keyed flag asset/component. Emoji icons and emoji flags are forbidden.
- Gold remains joker-exclusive. Live, success, warning, danger and action colours retain separate
  semantic roles.
- Confirmed points are primary. A live or provisional delta is separately labelled and visually
  secondary; a page must not present a projected total as if it were confirmed.
- Any team or player identity that is available to inspect uses the shared activation primitive.
- Any non-core destination opened contextually returns to the exact source context.
- Loading, empty, partial-failure, error, signed-out, unauthorised, direct-link, responsive, light
  and dark states are part of each surface, not later polish.
- Production pages contain no hard-coded example tournament state, people, predictions, points,
  dates or deadlines. Shared services/selectors own every fact.

## App shell

- Mobile bottom navigation has exactly five equal positions: Groups/KO, Bracket, Home, Leagues
  and More.
- The central Home treatment uses a larger circle that may overlap the bar edge slightly, while
  its icon, label and tap target remain aligned with the other four items.
- The whole bar may hide smoothly after sustained downward scroll on approved long pages and
  reappears immediately on upward scroll. It stays visible at page tops and while text input is
  focused.
- Desktop and tablet preserve the same information architecture and receive equal visual care.
- The top bar stays compact. Theme and Account are global actions; contextual back navigation
  replaces unnecessary duplicate page chrome.

## Home

- The first phone viewport prioritises rank and leagues once scoring exists.
- Before the tournament, the Original Predictor countdown, completion and next required action
  are primary; league sharing is promoted.
- During play, live/upcoming matches precede completed matches. The user's locked pick appears
  directly with each score.
- League previews are compact and link to the selected league rather than duplicating its full
  activity view.
- KO Predictor is a quiet teaser until real fixtures are available and becomes prominent only at
  the approved readiness boundary.
- Hero scale is stage-aware and restrained; it must not consume space that the current decision or
  live match needs.

## Groups and qualification

- Keep persistent By Group and By Date views.
- Groups lands on the next relevant match: live first, then upcoming, then the latest result.
- Group rails remain reachable without scrolling back to the page top. In date view, the rail
  provides logical date shortcuts including Today when applicable.
- Match cards use one shared anatomy, support steppers and direct numeric entry before lock, and
  always provide Match Centre access without embedded controls triggering navigation.
- Live and predicted tables are explicitly distinct.
- **Every context that presents a group table or group-qualification overview also presents the
  shared six-team third-place qualification table.** The top four qualifying rows are explicit.
- The third-place table is derived from the same canonical resolver/table data as every bracket
  allocation. A page-specific approximation is forbidden.
- Keep progress, joker usage, Lucky Dip, unresolved-tie handling, stale-bracket repair and the
  Groups → Original Bracket → Review flow.

## Original Bracket and Bracket Health

- Phone default is one round at a time; Wall Chart is an optional switch and the natural wider
  viewport overview.
- Each tie still looks and reads like a match, with venue/date context and a clear versus
  relationship.
- Selected winners and surviving paths receive stronger colour and connectors.
- Predicted Bracket and real/bracket-health contexts use distinct page treatment.
- Bracket Health appears only when real qualification can say something useful. It reports teams
  alive, maximum points remaining, broken picks and path conflicts derived from canonical data,
  including teams meeting earlier than predicted.
- Team-profile links must not conflict with the winner-selection action.

## KO Predictor

- KO Predictor remains a separate competition and league universe.
- A confirmed real fixture may become predictable as soon as both teams are known, without making
  KO a primary Home feature before group completion.
- Unknown/partial fixtures remain honest non-interactive placeholders.
- Each real KO fixture locks its own score, advancer, method and joker at that kick-off.
- Original Bracket and KO Predictor cards, points, jokers and totals never blend.

## Leagues

- The page begins with the Original/KO collection switch only when KO is available, then the
  competition-specific league selector.
- Original and KO collections contain separate leagues and memberships. Switching collection never
  carries the currently selected league into the other competition.
- The selected league identity panel is compact and uses the existing navy/sky palette.
- Pre-tournament priority is sharing/inviting. During play it becomes rank, confirmed points,
  movement and gap.
- The default content is one contiguous mobile standings table with rank, player and confirmed
  points; live deltas remain small and labelled.
- **Table and Activity are mutually exclusive views.** Activity is a neat switch that replaces the
  table rather than a dominant section competing above it.
- Activity entries link to the responsible match or player and are derived from scoring/standing
  events rather than authored page copy.
- Every player row opens the same compact quick-profile sheet before the full profile.

## Player Profile, points evidence and H2H

- The compact sheet shows rank, confirmed competition points, labelled live change, exact scores,
  stage-relevant bracket health and clear actions for Full Profile, Points and H2H.
- Full Player Profile is a destination hub, not a wide horizontal content-tab rail.
- Its identity header is compact. Original/KO context switching, when available and authorised,
  sits before the profile content and never combines totals.
- The hub presents clear destinations: Points and scoring evidence; Match predictions; Original
  Bracket/Bracket Health; Predicted group tables; Head to head.
- Each detail replaces the hub content and has a local return to that player’s profile.
- Points evidence remains available for fairness to anyone authorised to view the scored row even
  when full-profile permission is denied.
- The points audit itemises every awarded central scoring source and links match awards to Match
  Centre.
- H2H is a separate full page. It opens with the tapped player selected, permits any authorised
  second player, and prioritises scoreline, source comparison, decisive matches, movement over
  tournament checkpoints and remaining potential.

## Team Profile

- Preserve the existing Team Profile capability and release rules, upgraded into the shared final
  design language.
- Team identity, group/host/provisional status, ranking, qualification route, best finish and
  editorial context come from canonical/curated team data.
- Tournament-so-far uses official group position, points, goal difference, results and next fixture.
- The user's Original Predictor path is shown as a clear progression through group qualification,
  Round of 16, quarter-final, semi-final, final and champion milestones.
- Community progression percentages remain hidden before their approved release point.
- Team names/flags open this same profile from Groups, Tournament, Match Centre, Results and Bracket.

## Match Centre

- Match Centre owns the complete single-match story and is reached from every fixture card.
- Pre-match: locked/saved prediction, released community/league distribution and relevant football
  context.
- Live: official score and minute, exact “what this means for you” points, stage-aware best outcome,
  league movement, member targets and match events.
- Post-match: official final score, confirmed awarded points, audit link and exact-score winners.
- Knockout advice accounts for bracket progression, champion paths and impossible future points;
  it does not reduce a KO match to group-stage outcome copy.
- Large leagues use scoped aggregate reads, grouping, search and pagination rather than per-member
  request fan-out.

## Results and Leaderboards

- Results and Leaderboards remain separate findable destinations.
- Results ordering follows tournament state and explains qualification, personal points, league
  movement and bracket impact.
- Every Results group table includes the shared third-place qualification table.
- Leaderboards use clickable player identities and the confirmed/live points hierarchy.
- Per-matchday league standings, when built, use the canonical tournament-round construct rather
  than calendar days and share the scoring-evidence path with H2H and Match Centre.

## Tournament

Tournament must earn its More-menu position as the football competition reference, not duplicate
How to Play or act as a thin team list.

- Lead with current tournament phase/progress and the next priority fixture from canonical data.
- Explain the 24-team → six groups → top two plus four best third-place teams → Round of 16 →
  champion structure.
- Provide the six-group team directory with Team Profile activation and the shared third-place
  qualification table.
- Provide key stage dates, hosts and database-backed venue information.
- Route intentionally into Groups, Results and Bracket for full interactive detail.
- Tournament owns football facts; How to Play continues to own predictor rules, scoring, locks and
  FAQ.
- Remove the existing venue two-sources-of-truth: production renders the canonical data/service
  result, not a second page-local venue list.

## More and supporting destinations

- More is a grouped, lifecycle-aware directory. Results and Leaderboards appear high; Account stays
  in the final account grouping.
- It includes Tournament, How to Play, relevant prediction history, Support, Privacy/Data, About and
  authorised Admin when those destinations exist.
- Contextual objects such as Match Centre, Team Profile and Player Profile are not duplicated as
  permanent directory rows when their intentional entry points already make them findable.

## Implementation and acceptance

- Shared primitives are built or corrected before the screens consuming them.
- Screens compose models/services and shared primitives; they contain no scoring maths, lock/date
  arithmetic or duplicate tournament facts.
- The same canonical evidence powers Home, Results, Leaderboards, Leagues, Player Profile, H2H and
  Match Centre.
- The same shared group/third-place compound presentation owns every qualification context.
- Deadline, privacy and release policies remain server-enforced.
- No migration, scoring change, resolver amendment or Auth change is implied by this visual adoption.
- Every implementation batch updates the Functional Completion Ledger truthfully, adds focused tests,
  runs full checks, captures phone/tablet/desktop in both themes and enters owner visual review.
