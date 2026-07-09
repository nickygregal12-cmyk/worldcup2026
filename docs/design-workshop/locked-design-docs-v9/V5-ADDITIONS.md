> **PACK SNAPSHOT — do not work from this copy.** Part of the locked v9 install pack, frozen at its 2026-07-06 state. If a canonical version exists it lives outside the pack (docs/ or docs/archive/); a filename search that lands here should follow the canonical copy.

# v5 additions

This v5 pack supersedes v4.

It adds the Candidate Team Pool and Draw Slot Assignment brief from the uploaded PDF source.

## Added

- `CANDIDATE-TEAM-POOL-BRIEF.md`
- Source PDF preserved under `sources/Euro 2028 Predictor Brief.pdf`
- README note that v5 is now the active combined pack
- Roadmap / register / stage prompt notes for future `STAGE-CANDIDATE-TEAM-POOL-1`

## Key decision recorded

Tournament slots and real team identities must stay separate.

The Euro 2028 competition structure remains official-slot based until the real draw is known. The candidate team pool is a separate staging/admin/testing list that can later be assigned to official slots when safe and approved.

## Key boundaries recorded

- Do not hardcode candidate teams as confirmed Euro 2028 teams.
- Do not expose the candidate team pool publicly as confirmed participants.
- Do not rewrite user predictions when assigning teams to slots.
- Do not create Migration 019 unless a genuine schema/read-contract gap is proved and explicitly approved.
- No scoring, resolver, Auth, Supabase config, RLS or WC26 production changes.
