# Stage 2 — Prediction, Locking and Result Contracts

## Batch 2: Agree the rules before creating prediction tables

Completed: 1 July 2026

Local checks, the Euro staging deployment, the foundation page and the hosted tournament model have been verified.

## Purpose

This batch defines the Euro 2028 rules in plain language and executable tests before authentication, prediction tables, browser write policies or scoring jobs are created.

The prediction structure is versioned as `euro28-v1`. Future database migrations and user interfaces must implement this contract rather than copying the inherited WC26 behaviour. The scoring categories are part of that contract, but the current numeric point values are explicitly provisional.

## 1. One tournament-wide lock

There is one lock for every user and every league.

All of the following lock together when the opening match of UEFA EURO 2028 kicks off:

- group-match score predictions;
- the predicted group tables;
- the complete knockout bracket;
- knockout match scores, advancing teams and decision methods;
- future tournament awards or tie-breaker answers.

There are no rolling match locks, separate knockout locks, league-specific locks or administrator-selected lock types.

The exact opening-match kick-off is not currently confirmed. Until it is official and stored, prediction writes must fail closed. No estimated time may be invented.

A server-recorded lock is monotonic. Once it has been recorded, a later fixture edit cannot reopen predictions automatically. If the opening match is officially rescheduled before the tournament has begun and no lock has been recorded, the configured lock follows the new official kick-off.

After the lock:

- users may view their own predictions but cannot edit them;
- other users' predictions may be revealed;
- missing predictions remain missing and are not filled automatically;
- administrators may correct official tournament data, but must not silently alter a user's locked choices.

The future database, not the browser clock, must be authoritative.

## 2. Prediction availability

Predictions do not open merely because placeholder slots exist.

Before prediction entry is enabled:

- all 24 participant identities must be confirmed;
- every participant must be assigned to its official group position;
- the official opening-match kick-off must be stored;
- the active prediction contract version must be recorded.

The stable match records created in Stage 1 remain unchanged when teams are assigned.

## 3. Group-match prediction

A group-match prediction contains only:

- `home_score` — predicted home goals at the end of normal time;
- `away_score` — predicted away goals at the end of normal time.

Normal time means 90 minutes plus added time. There is no joker, confidence flag, first-goal prediction or league-specific variation.

Scores must be whole numbers from 0 to 99.

## 4. Knockout-match prediction

A knockout prediction contains:

- `home_score` — predicted home goals at the end of normal time;
- `away_score` — predicted away goals at the end of normal time;
- `advancing_team_id` — the team predicted to progress;
- `decision_method` — `normal_time`, `extra_time` or `penalties`.

The following validation is mandatory:

- `normal_time` requires a non-draw score and the advancing team must be the score winner;
- `extra_time` requires a draw at the end of normal time;
- `penalties` requires a draw at the end of normal time;
- the advancing team must be one of the two teams in that predicted fixture.

Users do not predict a separate extra-time score or penalty shoot-out score. This keeps the form short and prevents shoot-out kicks from being confused with football goals.

## 5. Bracket construction

The Round of 16 must be generated from the user's predicted group standings using the official UEFA source mappings and the complete best-third-place combination matrix stored in Stage 1.

Every later participant must come from the correct prior-match winner source.

If a user changes a group prediction before the lock and this changes a qualifying team or position, dependent knockout selections become stale. The application must require those affected bracket selections to be recalculated and confirmed. It must not silently retain an impossible path.

At final submission, the server must validate the whole bracket against the user's current group predictions and the active tournament model.

## 6. Scoring architecture and provisional values

The scoring *categories* are agreed in this contract, but the numeric values are not permanently approved at this stage.

There is one source of truth:

```text
src/config/scoringConfig.js
```

The current working ruleset is versioned as `euro28-scoring-provisional-v1` and has status `provisional`. Match calculators, tests, future rules pages and future server-side scoring jobs must consume this configuration. Numeric point values must not be copied into separate components or pages.

The present working defaults are:

| Category | Provisional points |
|---|---:|
| Exact normal-time score | 30 |
| Correct normal-time outcome, but not exact | 10 |
| Correct knockout advancing team | 10 |
| Correct knockout decision method | 5 |
| Correct Round of 16 team | 10 |
| Correct quarter-final team | 15 |
| Correct semi-final team | 20 |
| Correct finalist | 25 |
| Correct champion | 50 |

Changing a value before the tournament rules are approved should require changing the central configuration only; calculations and automated tests read the same values. Documentation should then be updated to describe the chosen ruleset.

Before predictions open, the final scoring ruleset must be marked `locked` and versioned. After the global tournament lock, scoring values must not be silently edited. Any exceptional later change would require a new audited version and a deliberate full recalculation so every user and league remains consistent.

## 7. Match-score categories

The same normal-time score categories apply to every group and knockout match:

- exact normal-time score;
- correct normal-time outcome but not exact;
- wrong normal-time outcome.

The exact-score award replaces the correct-outcome award; they do not stack.

For example, a knockout match that is 1–1 after normal time and later decided on penalties is a draw for the match-score calculation.

## 8. Knockout additions and bracket milestones

A knockout match can also award separate values for:

- the correct advancing team;
- the correct decision method.

The method bonus is awarded only when the advancing team is also correct. Normal time, extra time and penalties use the same configured method value.

Bracket progression is scored by a team reaching a milestone, not by the exact match number or route used in the user's projected bracket. The milestones are Round of 16, quarter-final, semi-final, final and champion.

Milestones are cumulative. A correctly predicted champion can also score for reaching each earlier milestone. Each team is counted once per milestone. This protects the user from losing all later-round value solely because a different earlier prediction placed the same team in another projected slot.

The interface must show one awarded total for a match with an optional breakdown. It must not present several competing totals such as current, possible and lost points as though they are all awarded.

## 9. Official result meaning

The official result model must keep these values separate:

- normal-time score;
- score after extra time, where applicable;
- penalty shoot-out score, where applicable;
- advancing team;
- decision method;
- match status;
- result confirmation status.

Penalty shoot-out kicks are not added to the normal-time or after-extra-time football score.

For a knockout result:

- a normal-time decision requires a non-draw normal-time score;
- an extra-time decision requires a normal-time draw and a non-draw score after extra time;
- a penalty decision requires a normal-time draw, a draw after extra time and a non-draw shoot-out score.

Only a completed and confirmed result is automatically scoreable.

## 10. Suspended, postponed and administrative cases

A suspended or postponed match receives no prediction points while unresolved.

If UEFA resumes a suspended match, it remains the same match record and is scored once the completed result is confirmed. The lock does not reopen merely because play was interrupted.

Cancelled, forfeited, awarded or administratively decided matches are not converted automatically into prediction points from a nominal score. They require an explicit reviewed policy decision and audit record.

This follows the UEFA competition rules, which provide for suspended matches to resume from the point of suspension and allow UEFA's disciplinary or administrative bodies to determine exceptional cases.

## 11. Privacy and audit requirements

Before the global lock, one user's predictions must not be exposed to another user.

Every future prediction write must record server-controlled creation and update times. Locked predictions must be immutable through normal browser policies. Administrative corrections, if ever required, must be exceptional, attributable and auditable.

## 12. Explicit exclusions

This contract deliberately excludes:

- jokers or confidence multipliers;
- first-goal-time bands;
- different scoring rules by league;
- rolling or per-match locks;
- separate group and knockout submission windows;
- automatic scoring of awarded matches;
- invented kick-off times;
- browser-authoritative locking.

## Automated protection

The following command is part of `npm run check`:

```bash
npm run audit:contracts
```

It protects the one-lock model, separate shoot-out scores, the absence of inherited joker or league-lock behaviour, and the requirement for every scoring calculation to use the single provisional scoring configuration.

The pure contract tests cover:

- fail-closed and exact-time locking;
- monotonic persisted locks;
- group and knockout prediction validation;
- uniform normal-time score categories driven by the central configuration;
- advancing-team and method points;
- round-reach bracket scoring;
- normal time, extra time and penalties;
- suspended, postponed and unconfirmed results.

## Sources checked

The contract was checked against:

- UEFA European Football Championship 2026–28 Regulations, Article 22 — extra time and penalty shoot-outs;
- UEFA European Football Championship 2026–28 Regulations, Article 29 — completion of suspended matches;
- UEFA EURO 2028 official tournament schedule announcement;
- IFAB Laws of the Game, Law 10 — determining the outcome of a match.

UEFA confirms that final-tournament knockout matches use two 15-minute periods of extra time and then penalties if still level. IFAB states that a penalty shoot-out takes place after the match has ended. UEFA has confirmed the opening match date and venue, but the match-specific kick-off time will be announced after the 2027 final draw.

## Current position

Stage 2 Batch 2 is complete.

No prediction tables, authentication features, browser write policies or scoring jobs were created.

The next controlled batch will translate this agreed contract into a reviewed database design, including a versioned single-source scoring ruleset, before any migration is applied.
