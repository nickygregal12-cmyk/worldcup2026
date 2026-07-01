# Stage 10 — Admin results and tournament operations

Stage 10 adds a secure browser control room above the canonical Stage 9 result and scoring layer.

## Access model

Administrator access is stored in `private.tournament_admins` and can only be granted or revoked by service-role or direct trusted SQL. There is no browser self-grant function.

Supported roles:

- `owner`;
- `results_admin`.

Both roles may use the Stage 10 result controls. Future stages may separate permissions further if needed.

## Browser admin RPCs

Authenticated administrators use trusted security-definer RPCs:

```text
get_my_tournament_admin_access
admin_list_tournament_matches
admin_get_match_result_history
admin_list_scoring_runs
admin_record_match_result
admin_update_match_status
admin_recalculate_match_points
```

No result, scoring or admin table receives direct browser write grants.

## Operational safeguards

Every result write:

- includes the result revision that was loaded;
- fails with a stale-write error if another correction has already been saved;
- requires a note of 5–500 characters;
- creates the canonical Stage 9 result revision;
- triggers replacement-based point recalculation;
- appends an `admin_operation_events` audit row.

Status-only changes do not rewrite result revisions. A confirmed result cannot be moved away from `completed` until it is first put into manual review or voided.

Manual recalculation is allowed only for a confirmed result and remains replacement-based.

## Result form

The control room supports:

- normal-time group results;
- knockout results decided in normal time;
- knockout results decided after extra time;
- penalty shoot-outs stored separately from football scores;
- pending live scores;
- manual review;
- void results;
- correction history;
- scoring-run history.

## Deliberate exclusions

Stage 10 does not add:

- an external score API;
- private leagues;
- shared member prediction viewing;
- browser admin assignment;
- automated result polling;
- WC26 code or database dependencies.
