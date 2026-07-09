> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# CONTRACTS-REF-LOCKED-SURFACES-3 — installation guide

This patch is a docs/reference recording stage only.

It records the v9 workshop decisions into live repo docs and installs the approved reference prototypes for Results, Leaderboards, Offline Player Claim, Bracket Health, Team Profile Sheet and Shared States.

It does not change `src/`, `supabase/`, migrations, scoring, resolver logic, Auth, RLS, official result entry or fake-result writes.

## Expected pre-state

- Branch: `euro28-development`.
- Previous commit: `7ca625e Archive locked design and planning docs v9`.
- Active migrations: 18.
- No Migration 019.
- WC26 production remains blocked.

## After applying

Run:

```bash
npm run check
npm run verify:foundation-page
```

Then commit:

```bash
git add docs

git commit -m "Record locked surfaces and planning docs"

git push origin euro28-development
```
