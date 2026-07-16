# WC26 final settlement runbook

## One-time setup before the final

1. Apply `supabase/migrations/202607160001_safe_final_settlement.sql` to Supabase.
   Installing it does not recalculate or update existing points.
2. Add a GitHub Actions repository secret named `ADMIN_FUNCTION_SECRET`.
   Its value must exactly match the `ADMIN_FUNCTION_SECRET` environment variable
   configured for the Netlify site.
3. Run the **Sync Match Scores** workflow manually and confirm it returns HTTP 2xx
   with a successful JSON response.
4. In Admin → Awards, run **Final settlement check**. Before the final it should
   report the unfinished checks without changing data.

## When the final finishes

1. Turn on `points_maintenance` in Admin settings. Public totals are hidden while
   settlement is in progress.
2. Sync scores and inspect match 104. Confirm:
   - the 90-minute score;
   - outcome type (`90mins`, `et`, or `penalties`);
   - after-extra-time score for ET/penalty results;
   - shootout score for penalty results;
   - winning team;
   - status `completed`.
3. Run **Final settlement check**. Resolve every failed fixture/result check.
4. Use **Auto-calculate from results** for total tournament goals. The total
   includes extra-time goals and excludes shootout kicks.
5. Enter Golden Boot, Golden Glove, and Player of the Tournament from the player
   picker. Each save reports whether the result and recalculation succeeded.
6. Run **Final settlement check** again. Every row must pass.
7. Run the existing full points recalculation once more. Record the leading totals.
8. Run the same recalculation a second time. Confirm no total changes; this proves
   settlement is idempotent.
9. Spot-check at least one user for each of these cases:
   - correct champion (+25);
   - incorrect champion (+0);
   - exact total goals (+15);
   - within five goals (+5);
   - within ten goals (+3);
   - each correct award.
10. Check one standard league, one custom league, one snapshot league, and a public
    invite page against the same users' expected totals.
11. Turn off `points_maintenance`. The homepage will declare the tournament final
    only after match 104 and all three official awards are complete.

## Recovery rule

If any check fails, leave `points_maintenance` on and correct the source result.
Do not manually add points to profiles. All final calculations are designed to be
rerun from predictions and official results without stacking duplicate bonuses.
