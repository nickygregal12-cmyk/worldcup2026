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

The application still contains inherited WC26 pages and data assumptions. The new tournament configuration and clock provide safe central seams while those areas are replaced incrementally. Legacy WC26 date fallbacks are clearly named and must be removed before public Euro testing.
