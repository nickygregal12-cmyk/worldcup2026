> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 2 Batch 4 — Migration 005 completion record

## Scope delivered

The revised Batch 4 package replaces every earlier Batch 4 ZIP. It introduces the executable storage-only Migration 005 and its matching contract, static audit, pgTAP verification and documentation.

Migration file:

```text
supabase/migrations/202607010005_euro28_prediction_storage.sql
```

Expected active migration count after installation: **5**.

## Required completion evidence

The batch is complete only when all of these commands succeed in `~/Desktop/euro28predictor` on `euro28-development`:

```bash
npm run check
npx supabase db reset
npx supabase test db --local supabase/tests/database/005_prediction_storage.test.sql
cat supabase/.temp/project-ref
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list --linked
npx supabase test db --linked supabase/tests/database/005_prediction_storage.test.sql
git status --short
git log -3 --oneline
```

The project reference printed before either remote command must be exactly:

```text
gcfdwobpnanjchcnvdco
```

The dry run must show only:

```text
202607010005_euro28_prediction_storage.sql
```

The linked migration list must show local and remote Migration 005 aligned. The linked pgTAP run must pass all 31 checks.

## Safety outcome

The batch must leave all of the following true:

- WC26 `main` is unchanged.
- WC26 production project `ouhxawizadnwrhrjppld` is never linked or targeted.
- No linked database reset is run.
- No direct browser prediction writes exist.
- No final save RPC exists.
- No guest predictions are stored in Supabase.
- No auth UI, leagues, scoring runs or admin result UI are introduced.

## Next return point

After the local and hosted evidence above is confirmed and the branch is clean and pushed, Stage 2 is complete. The next development stage is the canonical tournament resolver: group tables, best-third ranking, all 15 third-place allocation combinations and knockout progression shared by guest, predicted and live contexts.
