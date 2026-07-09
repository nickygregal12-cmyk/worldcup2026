> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage DESIGN-CONTRACTS-BATCH-0 — Visual-contract rule recording

Status: accepted governance package after owner approval of the all-main-pages design-contract batch plan.

## Purpose

Record the visual-contract rule before candidate page prototypes are drafted, approved and later used as binding references.

The programme produces self-contained HTML reference prototypes for main surfaces in batches. Approved files become binding visual contracts for layout, hierarchy, page composition, state coverage and Night Broadcast identity treatment. They are not production code.

## Approved rule

- Candidate prototypes remain exploratory until Nicky approves one variant or an explicitly merged variant.
- Once approved, exactly one contract file is retained per surface under `docs/reference-prototypes/`; approved contracts supersede older references rather than accumulating alternatives.
- Product implementation must rebuild approved contracts natively in the Euro design system.
- Prototype HTML, inline CSS, demo JavaScript, sample data, theme switches, fake storage and hardcoded states must not be ported into `src/`.
- Every candidate must include an HTML comment listing preserved functional decisions.
- Any layout idea requiring an unrecorded behaviour must be flagged as a proposed decision in the batch summary.
- Visual contracts cannot override the Consolidated Decision Register, Design Charter, database contracts, scoring contracts, resolver contracts, signup gates, privacy gates or Original/KO competition boundaries.
- Cosmetic implementation stages under visual contracts must be sequenced behind recorded missing functional rows for that surface.
- The approved Groups Night Broadcast direction is the identity anchor and must not be redrafted unless Nicky explicitly reopens it.

## Approved batch order

1. Batch 0 — visual-contract rule recording.
2. Batch 1 — Bracket and KO Predictor.
3. Batch 2 — Home, Leagues, Results and Leaderboards.
4. Batch 3 — Match Centre, Player View and Head-to-head.
5. Batch 4 — Points Breakdown, Account and Guest journey entry.
6. Batch 5 — Tournament overview and How to Play / Rules Hub.
7. Batch 6 — Admin last.

## Scope guard

This stage is docs/reference governance only.

It does not change `src/`, `supabase/`, tests or migrations. It does not create product behaviour, update active app copy, open public signups, change Auth configuration, write to Supabase, use/read/print service-role credentials, change scoring, change resolver logic, change routes or create Migration 019.

Active migrations remain 18. Original Predictor and KO Predictor remain separate. Predicted and live bracket contexts must never blend.

## Next stage

`DESIGN-CONTRACTS-BATCH-1 — Bracket and KO Predictor candidate contracts`.

Batch 1 must produce candidate HTML reference files and a batch summary only, then stop for Nicky approval before any approved contract is recorded.
