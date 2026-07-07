# Supabase And Database Rules

- Database stages require explicit approval.
- Do not create Migration 019 unless approved or a real schema/read-contract gap is proved.
- Hosted DB changes require backup and review.
- Migrations applied to hosted DB are never edited.
- Service-role usage is tightly controlled.
- WC26 production project remains blocked.
- Fake/simulated results must not affect official data or real points.
- Production DB changes are never automatic.
- Candidate team/profile fact data model remains future/proposed until schema inspection.

If a task appears to need schema, RLS, RPC, Auth or hosted-data changes, stop and prove the need before changing anything.
