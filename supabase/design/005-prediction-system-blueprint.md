# Migration 005 — Implemented prediction storage blueprint

> **IMPLEMENTED DESIGN RECORD — NOT AN ACTIVE MIGRATION**
>
> The executable implementation is `supabase/migrations/202607010005_euro28_prediction_storage.sql`. This Markdown file remains only as a design-history record and must never be passed to `supabase db push`.

## Implemented scope

Migration 005 creates storage, constraints, indexes and read security only:

- `scoring_rulesets`;
- `prediction_sets`;
- `match_predictions`;
- `prediction_grace_windows`;
- `submitted_at` reversible review state;
- `joker_applied` allocation storage;
- central nullable joker caps and configurable multiplier;
- scheduled and persisted global prediction-lock fields;
- per-match joker lock support through match identity and kick-off data;
- audited, expiring and revocable user-and-match grace records;
- RLS on all new tables;
- no direct browser table writes.

## Deferred boundary

The final atomic bundle save operation remains deferred. A later reviewed server route or secure RPC must validate ownership, expected revision, global lock or scoped grace, match kick-off, joker caps, bracket consistency and the complete bundle in one transaction.

Guest mode has no server-side prediction storage. No auth UI, profiles, leagues, scoring runs, point totals, admin result entry or provider integration are part of Migration 005.
