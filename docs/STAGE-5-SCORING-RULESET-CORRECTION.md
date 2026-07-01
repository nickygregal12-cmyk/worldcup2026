# Stage 5 — Provisional scoring-ruleset correction

## Status

Migration `202607010008_euro28_provisional_joker_caps.sql` corrects hosted Euro staging drift discovered during the post-Migration-007 linked pgTAP run.

The canonical ruleset remained `provisional`, but `group_stage_joker_cap` had been set to `8`. The agreed decision register still leaves both exact joker caps unresolved.

## Correction

Migration 008:

- requires exactly one `euro28-scoring-provisional-v2` row;
- refuses to change a non-provisional ruleset;
- restores `group_stage_joker_cap` to `NULL`;
- restores `knockout_joker_cap` to `NULL`;
- leaves the `2×` multiplier and all point values unchanged;
- leaves the tournament ruleset pointer unchanged;
- adds no tables, policies, grants, functions or browser writes.

## Verification

```bash
npm run audit:scoring-correction
npm run test:db:005:local
npm run test:db:006:local
npm run test:db:008:local
npm run test:db:005:linked
npm run test:db:006:linked
npm run test:db:008:linked
```

The Migration 005 linked suite must return to 31/31 passing. The Migration 008 suite adds seven focused checks.
