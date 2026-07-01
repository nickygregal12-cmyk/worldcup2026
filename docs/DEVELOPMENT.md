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

## Next implementation boundary

Stage 4 may introduce browser-only guest/explore state using the canonical resolver. It must not create guest server storage or direct Supabase prediction writes.
