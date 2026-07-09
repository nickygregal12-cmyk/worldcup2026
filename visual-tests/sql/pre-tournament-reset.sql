-- LOCAL-ONLY canonical pre-tournament reset for the visual fixture.
--
-- The visual tier screenshots the app in the canonical pre-tournament state:
-- no simulated clock, no fake results, the prediction lock configured exactly
-- as real staging carries it (2028-06-09T19:00Z = first kick-off). Simulation
-- leftovers from Stage 16A scenario runs violate that state, so this resets
-- them. It is applied by `npm run visual:seed` through `supabase db query
-- --local` and must NEVER be pointed at a linked project — fake-result cleanup
-- on staging is an owner operation, not a fixture step.

begin;

-- 1. Disable any simulated clock so the staging-time banner cannot render.
update public.tournament_time_controls
set is_enabled = false,
    simulated_at = null,
    note = 'visual-fixture pre-tournament reset',
    revision = revision + 1
where tournament_id = (select id from public.tournaments where code = 'euro-2028')
  and (is_enabled or simulated_at is not null);

-- 2. Prediction lock at the first kick-off, matching real staging byte-for-byte.
update public.tournaments
set prediction_lock_at = '2028-06-09T19:00:00+00',
    prediction_locked_at = null
where code = 'euro-2028'
  and (prediction_lock_at is distinct from '2028-06-09T19:00:00+00'::timestamptz
       or prediction_locked_at is not null);

-- 3. Return every fixture to scheduled/pending. match_result_events is an
-- append-only audit log (trigger-guarded) and is deliberately left untouched —
-- nothing rendered by the app reads it.
update public.matches
set status = 'scheduled',
    result_status = 'pending',
    home_score_90 = null,
    away_score_90 = null,
    home_score_aet = null,
    away_score_aet = null,
    result_method = null,
    result_source = null,
    result_confirmed_at = null,
    result_confirmed_by_user_id = null,
    result_revision = 0
where tournament_id = (select id from public.tournaments where code = 'euro-2028')
  and (status <> 'scheduled' or result_status <> 'pending');

-- 4. No knockout participants are resolved before the tournament.
update public.match_slots
set resolved_tournament_team_id = null
where tournament_id = (select id from public.tournaments where code = 'euro-2028')
  and source_type <> 'fixed'
  and resolved_tournament_team_id is not null;

commit;
