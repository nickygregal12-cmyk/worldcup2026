-- Euro 2028 complete Admin database operations (Migration 018).
--
-- Adds optimistic fixture-schedule revision, protected fixture/venue reads,
-- owner-only fixture scheduling and owner-only whole-tournament scoring
-- reconciliation. Extends the existing read-only control-room readiness model.
-- No participant assignment, resolver change, scoring-value change, manual
-- points edit, tournament-pick persistence, external provider or new Admin role
-- is introduced.

begin;

alter table public.matches
  add column fixture_revision bigint not null default 1;

alter table public.matches
  add constraint matches_fixture_revision_positive_check
  check (fixture_revision > 0);

comment on column public.matches.fixture_revision is
  'Optimistic revision for owner-only schedule, kick-off and venue changes. Result revision remains separate.';

-- Migration 016 unintentionally omitted the valid team_profile_updated value
-- introduced by Migration 015. Preserve every accepted value and add exactly
-- the two Stage 13F-K operation types.
alter table public.admin_operation_events
  drop constraint admin_operation_events_operation_type_check;

alter table public.admin_operation_events
  add constraint admin_operation_events_operation_type_check
  check (operation_type in (
    'admin_granted',
    'admin_revoked',
    'result_recorded',
    'result_corrected',
    'result_voided',
    'result_manual_review',
    'match_status_updated',
    'points_recalculated',
    'global_prediction_lock_applied',
    'grace_granted',
    'grace_revoked',
    'feature_control_updated',
    'team_profile_updated',
    'time_control_updated',
    'time_control_reset',
    'fixture_schedule_updated',
    'tournament_points_reconciled'
  ));

drop function public.admin_list_tournament_matches(uuid);

create function public.admin_list_tournament_matches(
  p_tournament_id uuid
)
returns table (
  match_id uuid,
  match_number integer,
  fixture_code text,
  stage_code text,
  stage_name text,
  group_code text,
  scheduled_date date,
  kickoff_at timestamptz,
  schedule_status text,
  participants_status text,
  venue_id uuid,
  venue_name text,
  venue_city text,
  venue_timezone text,
  fixture_revision bigint,
  match_status text,
  result_status text,
  result_revision bigint,
  home_tournament_team_id uuid,
  home_team_label text,
  away_tournament_team_id uuid,
  away_team_label text,
  home_score_90 integer,
  away_score_90 integer,
  home_score_aet integer,
  away_score_aet integer,
  home_penalties integer,
  away_penalties integer,
  result_method text,
  winner_tournament_team_id uuid,
  result_source text,
  result_confirmed_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.euro28_require_tournament_admin(p_tournament_id, auth.uid());

  return query
  select
    match_row.id,
    match_row.match_number,
    match_row.fixture_code,
    stage.code,
    stage.name,
    group_row.code,
    match_row.scheduled_date,
    match_row.kickoff_at,
    match_row.schedule_status,
    match_row.participants_status,
    match_row.venue_id,
    venue.name,
    venue.city,
    venue.timezone,
    match_row.fixture_revision,
    match_row.status,
    match_row.result_status,
    match_row.result_revision,
    home_slot.resolved_tournament_team_id,
    coalesce(home_team.short_name, home_tournament_team.slot_code, home_slot.rule_code, 'TBC'),
    away_slot.resolved_tournament_team_id,
    coalesce(away_team.short_name, away_tournament_team.slot_code, away_slot.rule_code, 'TBC'),
    match_row.home_score_90,
    match_row.away_score_90,
    match_row.home_score_aet,
    match_row.away_score_aet,
    match_row.home_penalties,
    match_row.away_penalties,
    match_row.result_method,
    match_row.winner_tournament_team_id,
    match_row.result_source,
    match_row.result_confirmed_at,
    match_row.updated_at
  from public.matches match_row
  join public.tournament_stages stage on stage.id = match_row.stage_id
  left join public.groups group_row on group_row.id = match_row.group_id
  left join public.venues venue on venue.id = match_row.venue_id
  join public.match_slots home_slot
    on home_slot.match_id = match_row.id
   and home_slot.side = 'home'
  join public.match_slots away_slot
    on away_slot.match_id = match_row.id
   and away_slot.side = 'away'
  left join public.tournament_teams home_tournament_team
    on home_tournament_team.id = home_slot.resolved_tournament_team_id
  left join public.teams home_team
    on home_team.id = home_tournament_team.team_id
  left join public.tournament_teams away_tournament_team
    on away_tournament_team.id = away_slot.resolved_tournament_team_id
  left join public.teams away_team
    on away_team.id = away_tournament_team.team_id
  where match_row.tournament_id = p_tournament_id
  order by match_row.match_number;
end;
$$;

create or replace function public.admin_list_tournament_venues(
  p_tournament_id uuid
)
returns table (
  venue_id uuid,
  venue_name text,
  venue_city text,
  country_code text,
  venue_timezone text,
  capacity integer,
  is_provisional boolean,
  display_order integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.euro28_require_tournament_admin(p_tournament_id, auth.uid());

  return query
  select
    venue.id,
    venue.name,
    venue.city,
    venue.country_code,
    venue.timezone,
    venue.capacity,
    tournament_venue.is_provisional,
    tournament_venue.display_order
  from public.tournament_venues tournament_venue
  join public.venues venue
    on venue.id = tournament_venue.venue_id
  where tournament_venue.tournament_id = p_tournament_id
    and venue.is_active = true
  order by tournament_venue.display_order nulls last, venue.name;
end;
$$;

create or replace function public.admin_update_match_fixture(
  p_tournament_id uuid,
  p_match_id uuid,
  p_expected_fixture_revision bigint,
  p_scheduled_date date,
  p_kickoff_at timestamptz,
  p_venue_id uuid,
  p_schedule_status text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_match public.matches%rowtype;
  selected_venue public.venues%rowtype;
  previous_venue public.venues%rowtype;
  normalised_note text := private.euro28_normalise_admin_note(p_note);
  before_snapshot jsonb;
  after_snapshot jsonb;
begin
  perform private.euro28_require_tournament_owner(p_tournament_id, current_user_id);

  if p_expected_fixture_revision is null or p_expected_fixture_revision < 1 then
    raise exception using errcode = '22023', message = 'Expected fixture revision must be one or greater';
  end if;

  if p_schedule_status is null
    or p_schedule_status not in ('provisional', 'official_date_venue', 'official_datetime')
  then
    raise exception using errcode = '22023', message = 'Unsupported fixture schedule status';
  end if;

  select * into current_match
  from public.matches
  where id = p_match_id
    and tournament_id = p_tournament_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Match was not found';
  end if;

  if current_match.fixture_revision <> p_expected_fixture_revision then
    raise exception using errcode = '40001', message = 'Fixture changed since it was loaded; refresh before saving';
  end if;

  if current_match.status not in ('scheduled', 'postponed') then
    raise exception using errcode = '22023', message = 'Only scheduled or postponed matches can have fixture details changed';
  end if;

  if current_match.result_status <> 'pending' or current_match.result_revision <> 0 then
    raise exception using errcode = '22023', message = 'Fixture details cannot change after result processing has started';
  end if;

  if current_match.venue_id is not null then
    select venue.* into previous_venue
    from public.venues venue
    where venue.id = current_match.venue_id;
  end if;

  if p_venue_id is not null then
    select venue.* into selected_venue
    from public.tournament_venues tournament_venue
    join public.venues venue
      on venue.id = tournament_venue.venue_id
    where tournament_venue.tournament_id = p_tournament_id
      and tournament_venue.venue_id = p_venue_id
      and venue.is_active = true;

    if not found then
      raise exception using errcode = '22023', message = 'Selected venue is not an active venue for this tournament';
    end if;
  end if;

  if p_schedule_status in ('official_date_venue', 'official_datetime')
    and (p_scheduled_date is null or p_venue_id is null)
  then
    raise exception using errcode = '22023', message = 'Official fixture scheduling requires a date and tournament venue';
  end if;

  if p_schedule_status = 'official_datetime' and p_kickoff_at is null then
    raise exception using errcode = '22023', message = 'Official datetime status requires a confirmed kick-off';
  end if;

  if p_kickoff_at is not null then
    if p_scheduled_date is null or p_venue_id is null then
      raise exception using errcode = '22023', message = 'A kick-off requires a scheduled date and tournament venue';
    end if;

    if (p_kickoff_at at time zone selected_venue.timezone)::date <> p_scheduled_date then
      raise exception using errcode = '22023', message = 'Kick-off venue-local date must match the scheduled date';
    end if;
  end if;

  before_snapshot := jsonb_build_object(
    'match_id', current_match.id,
    'match_number', current_match.match_number,
    'fixture_code', current_match.fixture_code,
    'fixture_revision', current_match.fixture_revision,
    'scheduled_date', current_match.scheduled_date,
    'kickoff_at', current_match.kickoff_at,
    'schedule_status', current_match.schedule_status,
    'venue_id', current_match.venue_id,
    'venue_name', previous_venue.name,
    'venue_city', previous_venue.city,
    'venue_timezone', previous_venue.timezone,
    'match_status', current_match.status,
    'result_status', current_match.result_status,
    'result_revision', current_match.result_revision
  );

  update public.matches
  set
    scheduled_date = p_scheduled_date,
    kickoff_at = p_kickoff_at,
    venue_id = p_venue_id,
    schedule_status = p_schedule_status,
    fixture_revision = fixture_revision + 1,
    updated_at = now()
  where id = p_match_id
    and tournament_id = p_tournament_id
  returning * into current_match;

  after_snapshot := jsonb_build_object(
    'match_id', current_match.id,
    'match_number', current_match.match_number,
    'fixture_code', current_match.fixture_code,
    'fixture_revision', current_match.fixture_revision,
    'scheduled_date', current_match.scheduled_date,
    'kickoff_at', current_match.kickoff_at,
    'schedule_status', current_match.schedule_status,
    'venue_id', current_match.venue_id,
    'venue_name', selected_venue.name,
    'venue_city', selected_venue.city,
    'venue_timezone', selected_venue.timezone,
    'match_status', current_match.status,
    'result_status', current_match.result_status,
    'result_revision', current_match.result_revision
  );

  insert into public.admin_operation_events (
    tournament_id,
    match_id,
    performed_by_user_id,
    operation_type,
    note,
    payload
  ) values (
    p_tournament_id,
    p_match_id,
    current_user_id,
    'fixture_schedule_updated',
    normalised_note,
    jsonb_build_object(
      'expected_fixture_revision', p_expected_fixture_revision,
      'resulting_fixture_revision', current_match.fixture_revision,
      'before', before_snapshot,
      'after', after_snapshot
    )
  );

  return after_snapshot;
end;
$$;

create or replace function public.admin_reconcile_tournament_points(
  p_tournament_id uuid,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalised_note text := private.euro28_normalise_admin_note(p_note);
  v_scoring_run_id uuid;
  summary jsonb;
begin
  perform private.euro28_require_tournament_owner(p_tournament_id, current_user_id);
  perform private.euro28_require_feature_enabled(p_tournament_id, 'scoring_recalculation');

  v_scoring_run_id := private.euro28_recalculate_points(p_tournament_id, null);

  select jsonb_build_object(
    'scoring_run_id', scoring_run.id,
    'status', scoring_run.status,
    'started_at', scoring_run.started_at,
    'completed_at', scoring_run.completed_at,
    'confirmed_result_count', (
      select count(*)
      from public.matches match_row
      where match_row.tournament_id = p_tournament_id
        and match_row.result_status = 'confirmed'
    ),
    'original_prediction_set_count', (
      select count(*)
      from public.prediction_sets prediction_set
      where prediction_set.tournament_id = p_tournament_id
        and prediction_set.competition_key = 'original'
    ),
    'ko_prediction_set_count', (
      select count(*)
      from public.prediction_sets prediction_set
      where prediction_set.tournament_id = p_tournament_id
        and prediction_set.competition_key = 'ko_predictor'
    ),
    'prediction_match_point_rows', (
      select count(*)
      from public.prediction_match_points points
      where points.tournament_id = p_tournament_id
        and points.scoring_run_id = v_scoring_run_id
    ),
    'prediction_bracket_point_rows', (
      select count(*)
      from public.prediction_bracket_points points
      where points.tournament_id = p_tournament_id
        and points.scoring_run_id = v_scoring_run_id
    ),
    'prediction_total_rows', (
      select count(*)
      from public.prediction_totals totals
      where totals.tournament_id = p_tournament_id
        and totals.last_scoring_run_id = v_scoring_run_id
    )
  )
  into summary
  from public.scoring_runs scoring_run
  where scoring_run.id = v_scoring_run_id;

  insert into public.admin_operation_events (
    tournament_id,
    performed_by_user_id,
    operation_type,
    note,
    payload
  ) values (
    p_tournament_id,
    current_user_id,
    'tournament_points_reconciled',
    normalised_note,
    summary
  );

  return summary;
end;
$$;

create or replace function public.admin_get_tournament_control_room(
  p_tournament_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  tournament_row public.tournaments%rowtype;
  features jsonb := '[]'::jsonb;
  knockout_allocation jsonb := '[]'::jsonb;
  joker_locks jsonb := '[]'::jsonb;
  health jsonb;
begin
  perform private.euro28_require_tournament_admin(p_tournament_id, current_user_id);

  select tournament.* into tournament_row
  from public.tournaments tournament
  where tournament.id = p_tournament_id;

  if tournament_row.id is null then
    raise exception using errcode = 'P0002', message = 'Tournament was not found';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'feature_key', control.feature_key,
    'is_enabled', control.is_enabled,
    'reason', control.reason,
    'revision', control.revision,
    'updated_at', control.updated_at
  ) order by control.feature_key), '[]'::jsonb)
  into features
  from public.tournament_feature_controls control
  where control.tournament_id = p_tournament_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'match_id', match_row.id,
    'match_number', match_row.match_number,
    'side', slot.side,
    'source_type', slot.source_type,
    'source_position', slot.source_position,
    'rule_code', slot.rule_code,
    'is_resolved', slot.resolved_tournament_team_id is not null,
    'resolved_tournament_team_id', slot.resolved_tournament_team_id,
    'resolved_team_label', coalesce(team.short_name, tournament_team.slot_code)
  ) order by match_row.match_number, slot.side), '[]'::jsonb)
  into knockout_allocation
  from public.matches match_row
  join public.match_slots slot on slot.match_id = match_row.id
  left join public.tournament_teams tournament_team
    on tournament_team.id = slot.resolved_tournament_team_id
  left join public.teams team
    on team.id = tournament_team.team_id
  where match_row.tournament_id = p_tournament_id
    and match_row.match_number between 37 and 51;

  select coalesce(jsonb_agg(jsonb_build_object(
    'match_id', match_row.id,
    'match_number', match_row.match_number,
    'competition_key', case when match_row.match_number <= 36 then 'original' else 'ko_predictor' end,
    'kickoff_at', match_row.kickoff_at,
    'match_status', match_row.status,
    'is_locked', (
      match_row.status in ('live', 'paused', 'completed', 'abandoned')
      or (match_row.kickoff_at is not null and match_row.kickoff_at <= statement_timestamp())
    ),
    'joker_allocation_count', (
      select count(*)
      from public.match_predictions prediction
      join public.prediction_sets prediction_set
        on prediction_set.id = prediction.prediction_set_id
      where prediction.match_id = match_row.id
        and prediction.joker_applied = true
        and prediction_set.competition_key = case
          when match_row.match_number <= 36 then 'original'
          else 'ko_predictor'
        end
    )
  ) order by match_row.match_number), '[]'::jsonb)
  into joker_locks
  from public.matches match_row
  where match_row.tournament_id = p_tournament_id;

  health := jsonb_build_object(
    'total_matches', (
      select count(*) from public.matches
      where tournament_id = p_tournament_id
    ),
    'fixtures_missing_date', (
      select count(*) from public.matches
      where tournament_id = p_tournament_id
        and scheduled_date is null
    ),
    'fixtures_missing_venue', (
      select count(*) from public.matches
      where tournament_id = p_tournament_id
        and venue_id is null
    ),
    'fixtures_missing_confirmed_kickoff', (
      select count(*) from public.matches
      where tournament_id = p_tournament_id
        and (kickoff_at is null or schedule_status <> 'official_datetime')
    ),
    'provisional_schedule_fixtures', (
      select count(*) from public.matches
      where tournament_id = p_tournament_id
        and schedule_status = 'provisional'
    ),
    'official_date_venue_fixtures', (
      select count(*) from public.matches
      where tournament_id = p_tournament_id
        and schedule_status = 'official_date_venue'
    ),
    'official_datetime_fixtures', (
      select count(*) from public.matches
      where tournament_id = p_tournament_id
        and schedule_status = 'official_datetime'
    ),
    'provisional_participant_fixtures', (
      select count(*) from public.matches
      where tournament_id = p_tournament_id
        and participants_status = 'provisional'
    ),
    'confirmed_participant_fixtures', (
      select count(*) from public.matches
      where tournament_id = p_tournament_id
        and participants_status = 'confirmed'
    ),
    'unresolved_participant_slots', (
      select count(*)
      from public.match_slots slot
      where slot.tournament_id = p_tournament_id
        and slot.resolved_tournament_team_id is null
    ),
    'missing_kickoff_times', (
      select count(*) from public.matches
      where tournament_id = p_tournament_id
        and kickoff_at is null
    ),
    'live_or_paused_matches', (
      select count(*) from public.matches
      where tournament_id = p_tournament_id
        and status in ('live', 'paused')
    ),
    'pending_results', (
      select count(*) from public.matches
      where tournament_id = p_tournament_id
        and result_status = 'pending'
    ),
    'confirmed_results', (
      select count(*) from public.matches
      where tournament_id = p_tournament_id
        and result_status = 'confirmed'
    ),
    'manual_review_results', (
      select count(*) from public.matches
      where tournament_id = p_tournament_id
        and result_status = 'manual_review'
    ),
    'void_results', (
      select count(*) from public.matches
      where tournament_id = p_tournament_id
        and result_status = 'void'
    ),
    'completed_scoring_runs', (
      select count(*) from public.scoring_runs
      where tournament_id = p_tournament_id
        and status = 'completed'
    ),
    'failed_scoring_runs', (
      select count(*) from public.scoring_runs
      where tournament_id = p_tournament_id
        and status = 'failed'
    ),
    'stale_running_scoring_runs', (
      select count(*) from public.scoring_runs
      where tournament_id = p_tournament_id
        and status = 'running'
        and started_at < statement_timestamp() - interval '10 minutes'
    ),
    'complete_team_profiles', (
      select count(*)
      from public.tournament_teams tournament_team
      join public.tournament_team_profiles profile
        on profile.tournament_id = tournament_team.tournament_id
       and profile.tournament_team_id = tournament_team.id
      where tournament_team.tournament_id = p_tournament_id
        and profile.ranking is not null
        and profile.qualifying_route is not null
        and profile.best_euro_finish is not null
        and profile.editorial_note is not null
    ),
    'incomplete_team_profiles', (
      select count(*)
      from public.tournament_teams tournament_team
      left join public.tournament_team_profiles profile
        on profile.tournament_id = tournament_team.tournament_id
       and profile.tournament_team_id = tournament_team.id
      where tournament_team.tournament_id = p_tournament_id
        and (
          profile.tournament_team_id is null
          or profile.ranking is null
          or profile.qualifying_route is null
          or profile.best_euro_finish is null
          or profile.editorial_note is null
        )
    ),
    'active_grace_windows', (
      select count(*)
      from public.prediction_grace_windows grace
      join public.matches match_row on match_row.id = grace.match_id
      where grace.tournament_id = p_tournament_id
        and grace.revoked_at is null
        and grace.expires_at > statement_timestamp()
        and match_row.status not in ('live', 'paused', 'completed', 'abandoned')
        and (match_row.kickoff_at is null or match_row.kickoff_at > statement_timestamp())
    ),
    'expired_unrevoked_grace_windows', (
      select count(*)
      from public.prediction_grace_windows grace
      join public.matches match_row on match_row.id = grace.match_id
      where grace.tournament_id = p_tournament_id
        and grace.revoked_at is null
        and (
          grace.expires_at <= statement_timestamp()
          or match_row.status in ('live', 'paused', 'completed', 'abandoned')
          or (match_row.kickoff_at is not null and match_row.kickoff_at <= statement_timestamp())
        )
    ),
    'disabled_features', (
      select count(*) from public.tournament_feature_controls
      where tournament_id = p_tournament_id
        and is_enabled = false
    )
  );

  return jsonb_build_object(
    'tournament_id', p_tournament_id,
    'admin_role', private.euro28_require_tournament_admin(
      p_tournament_id,
      current_user_id
    ),
    'lock', jsonb_build_object(
      'scheduled_at', tournament_row.prediction_lock_at,
      'persisted_at', tournament_row.prediction_locked_at,
      'is_effective', (
        tournament_row.prediction_locked_at is not null
        or (
          tournament_row.prediction_lock_at is not null
          and statement_timestamp() >= tournament_row.prediction_lock_at
        )
      ),
      'is_irreversible', tournament_row.prediction_locked_at is not null
    ),
    'features', features,
    'health', health,
    'tournament_picks', jsonb_build_object(
      'contract_version', 'euro28-tournament-picks-v1',
      'contract_ready', true,
      'outcome_activation_ready', false,
      'activation_dependency', 'stage_17a'
    ),
    'knockout_allocation', knockout_allocation,
    'joker_locks', joker_locks
  );
end;
$$;

revoke all on function public.admin_list_tournament_matches(uuid)
  from public, anon, authenticated;
revoke all on function public.admin_list_tournament_venues(uuid)
  from public, anon, authenticated;
revoke all on function public.admin_update_match_fixture(
  uuid, uuid, bigint, date, timestamptz, uuid, text, text
) from public, anon, authenticated;
revoke all on function public.admin_reconcile_tournament_points(uuid, text)
  from public, anon, authenticated;

grant execute on function public.admin_list_tournament_matches(uuid)
  to authenticated;
grant execute on function public.admin_list_tournament_venues(uuid)
  to authenticated;
grant execute on function public.admin_update_match_fixture(
  uuid, uuid, bigint, date, timestamptz, uuid, text, text
) to authenticated;
grant execute on function public.admin_reconcile_tournament_points(uuid, text)
  to authenticated;

grant execute on function public.admin_list_tournament_matches(uuid)
  to service_role;
grant execute on function public.admin_list_tournament_venues(uuid)
  to service_role;
grant execute on function public.admin_update_match_fixture(
  uuid, uuid, bigint, date, timestamptz, uuid, text, text
) to service_role;
grant execute on function public.admin_reconcile_tournament_points(uuid, text)
  to service_role;

-- Final-state safety assertions.
do $$
begin
  if exists (
    select 1
    from public.matches
    where fixture_revision < 1
  ) then
    raise exception 'Fixture revisions must remain positive';
  end if;

  if has_table_privilege('authenticated', 'public.matches', 'UPDATE') then
    raise exception 'Authenticated browser roles must not update fixtures directly';
  end if;

  if has_table_privilege('authenticated', 'public.admin_operation_events', 'INSERT') then
    raise exception 'Authenticated browser roles must not insert Admin audit events directly';
  end if;
end;
$$;

commit;
