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
