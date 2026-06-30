# Stage 1 — Tournament Model

## Batch 1: Provisional group slots

Completed: 30 June 2026

### Migration

Applied migration:

supabase/migrations/202606300002_euro28_provisional_group_slots.sql

Remote migration history confirms:

- Local: 202606300002
- Remote: 202606300002

### Provisional tournament structure

The Euro staging database now contains 24 neutral tournament slots.

The slots are:

- Group A: A1, A2, A3, A4
- Group B: B1, B2, B3, B4
- Group C: C1, C2, C3, C4
- Group D: D1, D2, D3, D4
- Group E: E1, E2, E3, E4
- Group F: F1, F2, F3, F4

No real teams have been assigned.

### Hosted verification

Verified in Euro staging:

- Tournament slots: 24
- Unresolved slots: 24
- Provisional slot flags: 24
- Group memberships: 24
- Provisional membership flags: 24
- Position code mismatches: 0
- Groups with the wrong slot count: 0

Each of the six groups contains exactly four positions.

### Current position

Stage 1 Batch 1 is complete.

The next batch will create neutral match slots for the group stage without adding real teams, official dates, venues or kick-off times.
