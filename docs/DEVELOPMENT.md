# Development workflow

## Branches

- `main` remains the feature-frozen WC26 production branch.
- `euro28-development` is the integration branch for Euro work.
- Create a short-lived feature branch for each implementation batch.

## Definition of done

A change is complete only when:

- The intended behaviour works on mobile and desktop.
- Loading, empty and error states are considered.
- `npm run check` passes.
- Database changes have a migration and RLS review.
- No Euro preview points at WC26 production data.
- Documentation is updated when behaviour or configuration changes.

## Current compatibility state

The repository still contains inherited WC26 pages, components, functions and data assumptions as quarantined reference code. The active browser entrypoint no longer imports them. `npm run audit:legacy` protects that boundary and fails if the Euro foundation reaches the inherited application or gains a browser database write.

Legacy WC26 date fallbacks remain only inside quarantined modules and must be replaced before any related feature is reintroduced.


## Euro prediction contract

Stage 2 Batch 2 defines the `euro28-v1` prediction, locking and official-result contract before any write-enabled database schema is introduced. New prediction work must use the pure modules in `src/contracts/` and pass:

```bash
npm run audit:contracts
```

The agreed baseline has one global opening-match lock, uniform normal-time score categories, separate shoot-out data and no jokers, confidence multipliers, rolling locks or league-specific rules. The working point values are provisional and live only in `src/config/scoringConfig.js`; calculations and future interfaces must import that source rather than copying numbers.

## Prediction database design

Stage 2 Batch 3 defines `euro28-prediction-db-v1` before Migration 005 exists.
The planned storage uses one versioned scoring ruleset, one prediction set per
user and tournament, and complete match-prediction rows with projected
participants. The future write path must save the whole bundle atomically and
reject stale revisions.

Run:

```bash
npm run audit:db-design
```

Migration 005 is deliberately schema/read-security only. It must not grant
direct prediction-table writes to the browser. The trusted atomic save path is
deferred until the canonical Euro group-table, best-third and knockout resolver
has its own tests.
