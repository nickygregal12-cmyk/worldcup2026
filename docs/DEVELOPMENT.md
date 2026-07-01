# Development workflow

## Branches

- `main` remains the feature-frozen WC26 production branch.
- `euro28-development` is the integration branch for Euro work.
- Create a short-lived feature branch for each implementation batch when useful.

## Definition of done

A change is complete only when:

- The intended behaviour is covered by tests.
- Loading, empty and error states are considered when UI is introduced.
- `npm run check` passes.
- Database changes have a migration and RLS review.
- No Euro preview points at WC26 production data.
- Documentation is updated when behaviour or configuration changes.
- The working tree is clean and the Euro branch is pushed.

## Current compatibility state

The repository still contains inherited WC26 pages, components, functions and data assumptions as quarantined reference code. The active browser entrypoint does not import them. `npm run audit:legacy` protects that boundary and fails if the Euro foundation reaches the inherited application or gains a browser database write.

The inherited `src/lib/bracketUtils.js` is not a Euro resolver. It remains quarantined and must not be reintroduced.

## Euro prediction contract

The reconciled `euro28-v2` contract provides:

- one global prediction-content lock at the opening tournament kick-off;
- a reversible submit/review state;
- saved but unsubmitted predictions remaining eligible;
- 90-minute score predictions for every match;
- separate advancing-team and decision-method fields for knockout matches;
- jokers as the only multiplier, with per-match kick-off timing;
- one-user, one-unstarted-match audited grace windows;
- one centrally versioned provisional scoring ruleset.

Run:

```bash
npm run audit:contracts
```

## Prediction database foundation

Migration 005 provides versioned scoring rulesets, prediction sets, match predictions and grace-window storage. It has RLS and no direct browser writes. The trusted atomic full-bundle save route remains deferred.

Run:

```bash
npm run audit:db-design
```

## Canonical tournament resolver

Stage 3 introduces `euro28-canonical-resolver-v1` in `src/resolver/`.

It calculates group tables, ranks the six third-placed teams, applies all 15 best-third combinations and progresses the official knockout route. Guest, predicted and live records are processed by the same engine but cannot be mixed in one call.

The tie-break contract remains explicitly provisional pending final UEFA EURO 2028 regulations. A stable fallback may support previews, but the resolver reports it as unresolved rather than presenting it as official.

Run:

```bash
npm run audit:resolver
```

No database migration is part of Stage 3.

## Guest/explore foundation

Stage 4 introduces `euro28-guest-state-v1` in `src/guest/`.

It creates all 51 draft rows locally, accepts partial browser drafts, feeds only complete score rows into the canonical guest resolver, tracks group and knockout completeness, and supports versioned JSON import/export. Browser storage is scoped by tournament and reference version. No guest prediction is sent to Supabase.

Run:

```bash
npm run audit:guest
```

The active staging page exposes guest-data import, export and clear controls. The full prediction editor remains deferred.

## Authentication and profiles

Stage 5 introduces Migration 006 and `src/auth/`. Euro accounts use email/password Auth, persistent sessions, recovery links and one owner-only profile row. Display-name creation and updates are validated by the database. Guest state remains local and is never cleared or uploaded by auth actions.

Run:

```bash
npm run audit:auth
```

## Next implementation boundary

Stage 6 may add the trusted atomic full-bundle prediction save route. It must validate ownership, revision, lock state, bracket consistency and joker rules without enabling direct table writes.
