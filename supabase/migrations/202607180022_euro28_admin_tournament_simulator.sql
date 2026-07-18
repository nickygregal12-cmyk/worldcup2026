-- Euro 2028 Admin Tournament Simulator (Migration 022, Stage GODMODE-1).
--
-- In-app, admin-only database operations that drive the EXISTING scenario-runner
-- behaviour (scripts/stage16a-p6c-executor.mjs) from the Admin Control Room:
--   * timeline scrubbing: derive every group match's state (scheduled/live/final)
--     from a simulated instant and record synthetic results through the existing
--     private.euro28_record_match_result function;
--   * per-match score scripting on top of the deterministic defaults;
--   * one-tap synthetic world seed/teardown (the 19 Stage 16A personas).
--
-- Safety (Stage GODMODE-1 charter, owner-approved 2026-07-18):
--   * private.euro28_record_match_result, the knockout resolver
--     (private.euro28_expected_knockout_participants) and
--     private.euro28_recalculate_points are REUSED UNTOUCHED. No scoring or
--     resolver logic changes in this migration.
--   * Every operation requires tournament OWNER admin access and fails closed
--     unless the tournament is provisional (is_provisional = true), exactly as
--     Migration 016's staging time controls do. WC26 production and any real
--     tournament are therefore blocked at database level.
--   * Score scripts live in the private schema: normal scoring, PostgREST and
--     every player surface cannot read them. They only influence what the
--     simulator records through the official result function while the
--     simulation is active.
--   * Synthetic data keeps the Stage 16A dual marker (reserved email domain
--     @synthetic.euro28.test plus raw_user_meta_data.synthetic_euro28 = true);
--     teardown deletes dual-marker rows only and asserts zero residue.
--   * Every operation appends an admin_operation_events audit row.

begin;

-- ---------------------------------------------------------------------------
-- Audit vocabulary: six simulator operation types.
-- ---------------------------------------------------------------------------

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
    'tournament_points_reconciled',
    'simulator_time_applied',
    'simulator_time_reset',
    'simulator_score_scripted',
    'simulator_score_script_cleared',
    'simulator_world_seeded',
    'simulator_world_torn_down'
  ));

-- ---------------------------------------------------------------------------
-- Simulation namespace: scripted scores. Private schema only — unreadable by
-- PostgREST, players and normal scoring. A script is consumed only when the
-- simulator reconciles the world, and only for a match that the simulated
-- clock says has finished.
-- ---------------------------------------------------------------------------

create table private.simulation_score_scripts (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  home_goals integer not null check (home_goals between 0 and 20),
  away_goals integer not null check (away_goals between 0 and 20),
  created_by_user_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (tournament_id, match_id)
);

comment on table private.simulation_score_scripts is
  'Admin simulator scripted scores. Simulation-only namespace: never read by scoring, the resolver or any player surface. Consumed exclusively by private.euro28_simulator_reconcile.';

revoke all on table private.simulation_score_scripts from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Guard: owner-only, provisional-tournament-only. Fail closed everywhere else.
-- ---------------------------------------------------------------------------

create or replace function private.euro28_simulator_require_owner(
  p_tournament_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.euro28_require_tournament_owner(p_tournament_id, p_user_id);

  if not exists (
    select 1 from public.tournaments
    where id = p_tournament_id and is_provisional = true
  ) then
    raise exception using errcode = '42501',
      message = 'The tournament simulator is restricted to the provisional staging tournament';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Deterministic synthetic scores: a bit-exact port of the scenario runner's
-- FNV-1a hash (scripts/stage16a-p6c-executor.mjs hash32/syntheticScore), so a
-- match's default simulated score is identical whether the terminal runner or
-- the in-app simulator produced it.
-- ---------------------------------------------------------------------------

create or replace function private.euro28_simulator_fnv32(p_input text)
returns bigint
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_hash bigint := 2166136261;
  v_index integer;
begin
  for v_index in 1..coalesce(length(p_input), 0) loop
    v_hash := v_hash # ascii(substring(p_input from v_index for 1));
    v_hash := (v_hash * 16777619) % 4294967296;
  end loop;
  return v_hash;
end;
$$;

create or replace function private.euro28_simulator_synthetic_score(
  p_match_number integer,
  out home_goals integer,
  out away_goals integer
)
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_seed bigint := private.euro28_simulator_fnv32('euro28-synthetic-result-v1:' || p_match_number);
  v_table integer[] := array[0, 0, 1, 1, 1, 2, 2, 3, 4];
begin
  home_goals := v_table[(v_seed % 9) + 1];
  away_goals := v_table[((v_seed / 16) % 9) + 1];
end;
$$;

-- ---------------------------------------------------------------------------
-- Synthetic-world counts, shared by status / seed / teardown responses.
-- ---------------------------------------------------------------------------

create or replace function private.euro28_simulator_counts(p_tournament_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with synthetic_users as (
    select id from auth.users
    where email like '%@synthetic.euro28.test'
      and (raw_user_meta_data ->> 'synthetic_euro28') = 'true'
  )
  select jsonb_build_object(
    'synthetic_users', (select count(*) from synthetic_users),
    'prediction_sets', (select count(*) from public.prediction_sets where user_id in (select id from synthetic_users)),
    'match_predictions', (select count(*) from public.match_predictions where prediction_set_id in (
      select id from public.prediction_sets where user_id in (select id from synthetic_users))),
    'bracket_predictions', (select count(*) from public.bracket_predictions where prediction_set_id in (
      select id from public.prediction_sets where user_id in (select id from synthetic_users))),
    'leagues', (select count(*) from public.leagues where created_by_user_id in (select id from synthetic_users)),
    'league_members', (select count(*) from public.league_members where user_id in (select id from synthetic_users)),
    'total_points_original', (select coalesce(sum(total_points), 0) from public.prediction_totals
      where user_id in (select id from synthetic_users) and competition_key = 'original'),
    'total_points_ko', (select coalesce(sum(total_points), 0) from public.prediction_totals
      where user_id in (select id from synthetic_users) and competition_key = 'ko_predictor'),
    'confirmed_results', (select count(*) from public.matches
      where tournament_id = p_tournament_id and result_status = 'confirmed'),
    'live_matches', (select count(*) from public.matches
      where tournament_id = p_tournament_id and status = 'live'),
    'score_scripts', (select count(*) from private.simulation_score_scripts
      where tournament_id = p_tournament_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- The core reconcile: set the world to instant T. A bit-faithful port of the
-- scenario runner's setClock — derive each group match's state from T, record
-- synthetic (or scripted) results through the EXISTING result function,
-- resolve or clear the R16 participants through the EXISTING resolver, then
-- rerun the EXISTING scoring engine. Idempotent and bidirectional.
-- ---------------------------------------------------------------------------

-- Simulated results are recorded as result_source 'system' with a NULL
-- recorded_by_user_id, exactly like the terminal scenario runner. This keeps
-- them distinguishable from admin-entered official results ('manual' + user)
-- and keeps teardown safe: match_result_events is append-only, so a deleted
-- synthetic user must never be referenced by a result event. The acting
-- admin's provenance is carried by the admin_operation_events rows instead.
create or replace function private.euro28_simulator_reconcile(
  p_tournament_id uuid,
  p_target_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match record;
  v_kickoff timestamptz;
  v_state text;
  v_home_goals integer;
  v_away_goals integer;
  v_winner uuid;
  v_already boolean;
  v_bundle jsonb;
  v_ko record;
  v_scheduled integer := 0;
  v_live integer := 0;
  v_final integer := 0;
  v_writes integer := 0;
  v_ko_resolved integer := 0;
begin
  for v_match in
    select m.id, m.match_number, m.scheduled_date, m.kickoff_at,
      m.status, m.result_status, m.home_score_90, m.away_score_90,
      home_slot.resolved_tournament_team_id as home_team_id,
      away_slot.resolved_tournament_team_id as away_team_id
    from public.matches m
    join public.match_slots home_slot on home_slot.match_id = m.id and home_slot.side = 'home'
    join public.match_slots away_slot on away_slot.match_id = m.id and away_slot.side = 'away'
    where m.tournament_id = p_tournament_id and m.match_number between 1 and 36
    order by m.match_number
  loop
    -- Prefer the sanctioned kickoff_at; fall back to the runner's derived
    -- 13:00/16:00/19:00 UTC slots cycling by match number.
    v_kickoff := coalesce(
      v_match.kickoff_at,
      ((v_match.scheduled_date::text || 'T'
        || lpad(((array[13, 16, 19])[((v_match.match_number - 1) % 3) + 1])::text, 2, '0')
        || ':00:00Z')::timestamptz)
    );

    -- A plausible group match lasts ~115 minutes wall-clock (the runner's
    -- GROUP_MATCH_DURATION_MIN).
    v_state := case
      when p_target_at < v_kickoff then 'scheduled'
      when p_target_at < v_kickoff + interval '115 minutes' then 'live'
      else 'final'
    end;

    if v_state = 'final' then
      v_final := v_final + 1;

      select script.home_goals, script.away_goals
      into v_home_goals, v_away_goals
      from private.simulation_score_scripts script
      where script.tournament_id = p_tournament_id and script.match_id = v_match.id;
      if not found then
        select synthetic.home_goals, synthetic.away_goals
        into v_home_goals, v_away_goals
        from private.euro28_simulator_synthetic_score(v_match.match_number) synthetic;
      end if;

      v_winner := case
        when v_home_goals > v_away_goals then v_match.home_team_id
        when v_away_goals > v_home_goals then v_match.away_team_id
        else null
      end;

      v_already := v_match.status = 'completed' and v_match.result_status = 'confirmed'
        and v_match.home_score_90 = v_home_goals and v_match.away_score_90 = v_away_goals;
      if not v_already then
        perform private.euro28_record_match_result(
          p_tournament_id, v_match.id, 'completed', 'confirmed',
          v_home_goals, v_away_goals, null, null, null, null,
          'normal_time', v_winner, 'system', null);
        v_writes := v_writes + 1;
      end if;

    elsif v_state = 'live' then
      v_live := v_live + 1;

      -- 'void' is the schema's undo path: it clears a previously confirmed
      -- synthetic result without requiring scores (bidirectional revert).
      if v_match.result_status = 'confirmed' then
        perform private.euro28_record_match_result(
          p_tournament_id, v_match.id, 'scheduled', 'void',
          null, null, null, null, null, null,
          null, null, 'system', null);
        v_writes := v_writes + 1;
      end if;
      if v_match.status is distinct from 'live' or v_match.result_status = 'confirmed' then
        update public.matches
        set status = 'live', updated_at = now()
        where id = v_match.id and tournament_id = p_tournament_id;
        v_writes := v_writes + 1;
      end if;

    else
      v_scheduled := v_scheduled + 1;

      if v_match.status is distinct from 'scheduled'
        or v_match.result_status = 'confirmed'
        or v_match.home_score_90 is not null then
        perform private.euro28_record_match_result(
          p_tournament_id, v_match.id, 'scheduled', 'void',
          null, null, null, null, null, null,
          null, null, 'system', null);
        v_writes := v_writes + 1;
      end if;
    end if;
  end loop;

  -- Knockout participants: once the whole group stage is final, resolve the
  -- R16 by CALLING the existing resolver with a bundle that mirrors the
  -- confirmed group results; otherwise clear the derived R16 resolution.
  if v_final = 36 then
    select jsonb_agg(jsonb_build_object(
      'match_id', m.id,
      'predicted_home_tournament_team_id', home_slot.resolved_tournament_team_id,
      'predicted_away_tournament_team_id', away_slot.resolved_tournament_team_id,
      'home_score_90', m.home_score_90,
      'away_score_90', m.away_score_90,
      'advancing_tournament_team_id', null,
      'decision_method', null,
      'joker_applied', false
    ) order by m.match_number)
    into v_bundle
    from public.matches m
    join public.match_slots home_slot on home_slot.match_id = m.id and home_slot.side = 'home'
    join public.match_slots away_slot on away_slot.match_id = m.id and away_slot.side = 'away'
    where m.tournament_id = p_tournament_id
      and m.match_number between 1 and 36
      and m.result_status = 'confirmed';

    for v_ko in
      select k.match_number, k.home_team_id, k.away_team_id
      from private.euro28_expected_knockout_participants(p_tournament_id, v_bundle) k
      where k.match_number between 37 and 44 and k.participants_resolved
      order by k.match_number
    loop
      update public.match_slots slot
      set resolved_tournament_team_id = v_ko.home_team_id, resolved_at = now()
      from public.matches m
      where slot.match_id = m.id and slot.side = 'home'
        and m.tournament_id = p_tournament_id and m.match_number = v_ko.match_number;

      update public.match_slots slot
      set resolved_tournament_team_id = v_ko.away_team_id, resolved_at = now()
      from public.matches m
      where slot.match_id = m.id and slot.side = 'away'
        and m.tournament_id = p_tournament_id and m.match_number = v_ko.match_number;

      v_ko_resolved := v_ko_resolved + 1;
    end loop;
  else
    update public.match_slots slot
    set resolved_tournament_team_id = null, resolved_at = null
    from public.matches m
    where slot.match_id = m.id
      and m.tournament_id = p_tournament_id
      and m.match_number between 37 and 44
      and slot.source_type in ('group_position', 'best_third');
  end if;

  -- Rerun the EXISTING scoring engine (full recompute).
  perform private.euro28_recalculate_points(p_tournament_id, null);

  return jsonb_build_object(
    'target_at', p_target_at,
    'scheduled', v_scheduled,
    'live', v_live,
    'final', v_final,
    'writes', v_writes,
    'ko_fixtures_resolved', v_ko_resolved
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Status: readable by any tournament admin. The admin-visible simulation
-- status the safety guidelines require.
-- ---------------------------------------------------------------------------

create or replace function public.admin_simulator_status(p_tournament_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_control public.tournament_time_controls%rowtype;
begin
  perform private.euro28_require_tournament_admin(p_tournament_id, v_user_id);

  select * into v_control
  from public.tournament_time_controls
  where tournament_id = p_tournament_id;

  return jsonb_build_object(
    'is_provisional', exists (
      select 1 from public.tournaments
      where id = p_tournament_id and is_provisional = true),
    'clock', jsonb_build_object(
      'is_enabled', coalesce(v_control.is_enabled, false),
      'simulated_at', v_control.simulated_at,
      'phase_key', v_control.phase_key,
      'revision', coalesce(v_control.revision, 1),
      'updated_at', v_control.updated_at
    ),
    'counts', private.euro28_simulator_counts(p_tournament_id),
    'score_scripts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'match_id', script.match_id,
        'match_number', m.match_number,
        'home_goals', script.home_goals,
        'away_goals', script.away_goals,
        'updated_at', script.updated_at
      ) order by m.match_number)
      from private.simulation_score_scripts script
      join public.matches m on m.id = script.match_id
      where script.tournament_id = p_tournament_id
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Timeline scrubbing. p_target_at null = return to real time: the world is
-- reconciled against now() (which unwinds every synthetic result, because the
-- real tournament has not started) and the application clock override is
-- disabled. Revision-gated exactly like Migration 016's time controls.
-- ---------------------------------------------------------------------------

create or replace function public.admin_simulator_set_time(
  p_tournament_id uuid,
  p_expected_revision bigint,
  p_target_at timestamptz,
  p_phase_key text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_note text := private.euro28_normalise_admin_note(p_note);
  v_previous public.tournament_time_controls%rowtype;
  v_next_revision bigint;
  v_summary jsonb;
begin
  perform private.euro28_simulator_require_owner(p_tournament_id, v_user_id);

  select * into v_previous
  from public.tournament_time_controls
  where tournament_id = p_tournament_id
  for update;

  if v_previous.tournament_id is null then
    raise exception using errcode = 'P0002', message = 'Time control was not initialised';
  end if;
  if v_previous.revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'Time control changed; refresh before saving';
  end if;

  v_next_revision := v_previous.revision + 1;

  if p_target_at is null then
    v_summary := private.euro28_simulator_reconcile(p_tournament_id, now());

    update public.tournament_time_controls
    set is_enabled = false,
        simulated_at = null,
        phase_key = null,
        revision = v_next_revision,
        note = v_note,
        updated_by_user_id = v_user_id,
        updated_at = now()
    where tournament_id = p_tournament_id;

    insert into public.admin_operation_events (
      tournament_id, performed_by_user_id, operation_type, note, payload
    ) values (
      p_tournament_id, v_user_id, 'simulator_time_reset', v_note,
      jsonb_build_object('summary', v_summary, 'revision', v_next_revision)
    );

    return jsonb_build_object('ok', true, 'revision', v_next_revision, 'summary', v_summary);
  end if;

  if p_phase_key not in (
    'custom', 'pre_lock', 'global_lock', 'grace_period', 'group_live',
    'group_complete', 'knockout_unresolved', 'knockout_known', 'ko_open',
    'fixture_locked', 'match_live', 'match_complete', 'correction_review',
    'tournament_complete'
  ) then
    raise exception using errcode = '22023', message = 'Unsupported time-control phase';
  end if;

  update public.tournament_time_controls
  set is_enabled = true,
      simulated_at = p_target_at,
      phase_key = p_phase_key,
      revision = v_next_revision,
      note = v_note,
      updated_by_user_id = v_user_id,
      updated_at = now()
  where tournament_id = p_tournament_id;

  v_summary := private.euro28_simulator_reconcile(p_tournament_id, p_target_at);

  insert into public.admin_operation_events (
    tournament_id, performed_by_user_id, operation_type, note, payload
  ) values (
    p_tournament_id, v_user_id, 'simulator_time_applied', v_note,
    jsonb_build_object(
      'target_at', p_target_at,
      'phase_key', p_phase_key,
      'summary', v_summary,
      'revision', v_next_revision
    )
  );

  return jsonb_build_object('ok', true, 'revision', v_next_revision, 'summary', v_summary);
end;
$$;

-- ---------------------------------------------------------------------------
-- Per-match score scripting on top of the deterministic defaults. Group
-- matches only (the runner simulates normal-time group results; knockout
-- matches have no simulated defaults to override). When the simulated clock
-- is active the script is applied immediately by re-reconciling the world.
-- ---------------------------------------------------------------------------

create or replace function public.admin_simulator_script_score(
  p_tournament_id uuid,
  p_match_id uuid,
  p_home_goals integer,
  p_away_goals integer,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_note text := private.euro28_normalise_admin_note(p_note);
  v_match public.matches%rowtype;
  v_control public.tournament_time_controls%rowtype;
  v_summary jsonb;
begin
  perform private.euro28_simulator_require_owner(p_tournament_id, v_user_id);

  if p_home_goals is null or p_away_goals is null
    or p_home_goals not between 0 and 20 or p_away_goals not between 0 and 20 then
    raise exception using errcode = '22023', message = 'Scripted scores must be between 0 and 20';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id and tournament_id = p_tournament_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Match was not found';
  end if;
  if v_match.match_number not between 1 and 36 then
    raise exception using errcode = '22023', message = 'Score scripting covers group matches only';
  end if;

  insert into private.simulation_score_scripts (
    tournament_id, match_id, home_goals, away_goals, created_by_user_id
  ) values (
    p_tournament_id, p_match_id, p_home_goals, p_away_goals, v_user_id
  )
  on conflict (tournament_id, match_id) do update
  set home_goals = excluded.home_goals,
      away_goals = excluded.away_goals,
      created_by_user_id = excluded.created_by_user_id,
      updated_at = now();

  select * into v_control
  from public.tournament_time_controls
  where tournament_id = p_tournament_id;

  if coalesce(v_control.is_enabled, false) and v_control.simulated_at is not null then
    v_summary := private.euro28_simulator_reconcile(p_tournament_id, v_control.simulated_at);
  end if;

  insert into public.admin_operation_events (
    tournament_id, performed_by_user_id, operation_type, note, payload
  ) values (
    p_tournament_id, v_user_id, 'simulator_score_scripted', v_note,
    jsonb_build_object(
      'match_number', v_match.match_number,
      'home_goals', p_home_goals,
      'away_goals', p_away_goals,
      'applied', v_summary is not null,
      'summary', v_summary
    )
  );

  return jsonb_build_object('ok', true, 'applied', v_summary is not null, 'summary', v_summary);
end;
$$;

create or replace function public.admin_simulator_clear_score_script(
  p_tournament_id uuid,
  p_match_id uuid,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_note text := private.euro28_normalise_admin_note(p_note);
  v_control public.tournament_time_controls%rowtype;
  v_cleared integer;
  v_summary jsonb;
begin
  perform private.euro28_simulator_require_owner(p_tournament_id, v_user_id);

  if p_match_id is null then
    delete from private.simulation_score_scripts
    where tournament_id = p_tournament_id;
  else
    delete from private.simulation_score_scripts
    where tournament_id = p_tournament_id and match_id = p_match_id;
  end if;
  get diagnostics v_cleared = row_count;

  select * into v_control
  from public.tournament_time_controls
  where tournament_id = p_tournament_id;

  if v_cleared > 0 and coalesce(v_control.is_enabled, false) and v_control.simulated_at is not null then
    v_summary := private.euro28_simulator_reconcile(p_tournament_id, v_control.simulated_at);
  end if;

  insert into public.admin_operation_events (
    tournament_id, performed_by_user_id, operation_type, note, payload
  ) values (
    p_tournament_id, v_user_id, 'simulator_score_script_cleared', v_note,
    jsonb_build_object('cleared', v_cleared, 'match_id', p_match_id, 'summary', v_summary)
  );

  return jsonb_build_object('ok', true, 'cleared', v_cleared, 'summary', v_summary);
end;
$$;

-- ---------------------------------------------------------------------------
-- Synthetic world seed: the 19 Stage 16A personas with predictions, brackets,
-- KO sets and leagues — a faithful port of the scenario runner's seedAll.
-- Idempotent: re-running tops up whatever is missing.
-- ---------------------------------------------------------------------------

create or replace function public.admin_simulator_seed_world(
  p_tournament_id uuid,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_note text := private.euro28_normalise_admin_note(p_note);
  v_ruleset_id uuid;
  v_contract_version text := 'euro28-prediction-db-v2';
  v_persona record;
  v_persona_user uuid;
  v_set_id uuid;
  v_match record;
  v_pred_home integer;
  v_pred_away integer;
  v_synthetic record;
  v_limit integer;
  v_index integer;
  v_group_bundle jsonb;
  v_picks jsonb;
  v_round integer;
  v_added integer;
  v_ko record;
  v_advancing uuid;
  v_league record;
  v_league_id uuid;
  v_member_key text;
  v_member_index integer;
  v_member_user uuid;
  v_counts jsonb;
begin
  perform private.euro28_simulator_require_owner(p_tournament_id, v_user_id);

  select id into v_ruleset_id
  from public.scoring_rulesets
  where tournament_id = p_tournament_id
  order by version desc
  limit 1;
  if v_ruleset_id is null then
    raise exception using errcode = 'P0002', message = 'No scoring ruleset exists for this tournament';
  end if;

  -- 1. Synthetic users + email identities (dual marker: reserved domain plus
  --    synthetic_euro28 metadata). The existing profile trigger creates the
  --    profile row from raw_user_meta_data.
  for v_persona in
    select * from (values
      ('exact_score_heavy',     array['original', 'ko_predictor']),
      ('outcome_only',          array['original', 'ko_predictor']),
      ('all_wrong',             array['original', 'ko_predictor']),
      ('partial_predictions',   array['original']),
      ('no_predictions',        array[]::text[]),
      ('submitted_complete',    array['original', 'ko_predictor']),
      ('unsubmitted_identical', array['original']),
      ('joker_cap_reached',     array['original', 'ko_predictor']),
      ('zero_jokers',           array['original', 'ko_predictor']),
      ('engineered_tie_a',      array['original', 'ko_predictor']),
      ('engineered_tie_b',      array['original', 'ko_predictor']),
      ('bracket_survives_deep', array['original']),
      ('bracket_dead_early',    array['original']),
      ('ko_only',               array['ko_predictor']),
      ('original_only',         array['original']),
      ('ko_advancing_only',     array['ko_predictor']),
      ('ko_method_variant',     array['ko_predictor']),
      ('ko_joker_variant',      array['ko_predictor']),
      ('correction_sensitive',  array['original', 'ko_predictor'])
    ) as persona(key, competitions)
  loop
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    )
    select gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      v_persona.key || '@synthetic.euro28.test',
      extensions.crypt('synthetic-not-a-real-login', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'synthetic_euro28', true,
        'stage', '16A',
        'persona_key', v_persona.key,
        'display_name', 'Syn16A ' || v_persona.key
      ),
      now(), now(), '', '', '', '', '', '', '', ''
    where not exists (
      select 1 from auth.users where email = v_persona.key || '@synthetic.euro28.test');

    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    )
    select u.id::text, u.id,
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
      'email', now(), now(), now()
    from auth.users u
    where u.email = v_persona.key || '@synthetic.euro28.test'
      and not exists (
        select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');
  end loop;

  -- 2. Original group predictions per persona strategy.
  for v_persona in
    select * from (values
      ('exact_score_heavy'), ('outcome_only'), ('all_wrong'), ('partial_predictions'),
      ('submitted_complete'), ('unsubmitted_identical'), ('joker_cap_reached'),
      ('zero_jokers'), ('engineered_tie_a'), ('engineered_tie_b'),
      ('bracket_survives_deep'), ('bracket_dead_early'), ('original_only'),
      ('correction_sensitive')
    ) as persona(key)
  loop
    select id into v_persona_user
    from auth.users where email = v_persona.key || '@synthetic.euro28.test' limit 1;
    continue when v_persona_user is null;

    insert into public.prediction_sets (
      tournament_id, user_id, competition_key, contract_version, scoring_ruleset_id, revision, submitted_at
    ) values (
      p_tournament_id, v_persona_user, 'original', v_contract_version, v_ruleset_id, 0,
      case when v_persona.key in ('submitted_complete', 'joker_cap_reached', 'zero_jokers') then now() else null end
    )
    on conflict (tournament_id, user_id, competition_key) do update set updated_at = now()
    returning id into v_set_id;

    v_limit := case when v_persona.key = 'partial_predictions' then 6 else 36 end;
    v_index := 0;

    for v_match in
      select m.id, m.match_number,
        home_slot.resolved_tournament_team_id as home_team_id,
        away_slot.resolved_tournament_team_id as away_team_id
      from public.matches m
      join public.match_slots home_slot on home_slot.match_id = m.id and home_slot.side = 'home'
      join public.match_slots away_slot on away_slot.match_id = m.id and away_slot.side = 'away'
      where m.tournament_id = p_tournament_id and m.match_number between 1 and 36
      order by m.match_number
    loop
      v_index := v_index + 1;
      exit when v_index > v_limit;

      select synthetic.home_goals, synthetic.away_goals
      into v_synthetic
      from private.euro28_simulator_synthetic_score(v_match.match_number) synthetic;

      if v_persona.key in ('exact_score_heavy', 'submitted_complete') then
        v_pred_home := v_synthetic.home_goals;
        v_pred_away := v_synthetic.away_goals;
      elsif v_persona.key = 'all_wrong' then
        v_pred_home := v_synthetic.away_goals;
        v_pred_away := v_synthetic.home_goals;
      else
        v_pred_home := least(v_synthetic.home_goals + 1, 99);
        v_pred_away := least(v_synthetic.away_goals + 1, 99);
      end if;

      insert into public.match_predictions (
        prediction_set_id, tournament_id, match_id,
        predicted_home_tournament_team_id, predicted_away_tournament_team_id,
        home_score_90, away_score_90,
        advancing_tournament_team_id, decision_method, joker_applied
      ) values (
        v_set_id, p_tournament_id, v_match.id,
        v_match.home_team_id, v_match.away_team_id,
        v_pred_home, v_pred_away,
        null, null,
        v_persona.key = 'joker_cap_reached' and v_index <= 5
      )
      on conflict (prediction_set_id, match_id) do nothing;
    end loop;
  end loop;

  -- 3. Original bracket picks, built round by round through the EXISTING
  --    resolver — a pick is only made once its participants resolve from the
  --    persona's own predictions plus its earlier picks.
  for v_persona in
    select * from (values
      ('exact_score_heavy'), ('outcome_only'), ('all_wrong'),
      ('submitted_complete'), ('unsubmitted_identical'), ('joker_cap_reached'),
      ('zero_jokers'), ('engineered_tie_a'), ('engineered_tie_b'),
      ('bracket_survives_deep'), ('bracket_dead_early'), ('original_only'),
      ('correction_sensitive')
    ) as persona(key)
  loop
    select id into v_persona_user
    from auth.users where email = v_persona.key || '@synthetic.euro28.test' limit 1;
    continue when v_persona_user is null;

    select id into v_set_id
    from public.prediction_sets
    where tournament_id = p_tournament_id and user_id = v_persona_user and competition_key = 'original'
    limit 1;
    continue when v_set_id is null;

    -- The persona's 36 group scorelines in the bundle shape the resolver reads.
    select jsonb_agg(jsonb_build_object(
      'match_id', source.id,
      'predicted_home_tournament_team_id', source.home_team_id,
      'predicted_away_tournament_team_id', source.away_team_id,
      'home_score_90', case
        when v_persona.key in ('exact_score_heavy', 'submitted_complete') then source.synthetic_home
        when v_persona.key = 'all_wrong' then source.synthetic_away
        else least(source.synthetic_home + 1, 99) end,
      'away_score_90', case
        when v_persona.key in ('exact_score_heavy', 'submitted_complete') then source.synthetic_away
        when v_persona.key = 'all_wrong' then source.synthetic_home
        else least(source.synthetic_away + 1, 99) end,
      'advancing_tournament_team_id', null,
      'decision_method', null,
      'joker_applied', false
    ) order by source.match_number)
    into v_group_bundle
    from (
      select m.id, m.match_number,
        home_slot.resolved_tournament_team_id as home_team_id,
        away_slot.resolved_tournament_team_id as away_team_id,
        synthetic.home_goals as synthetic_home,
        synthetic.away_goals as synthetic_away
      from public.matches m
      join public.match_slots home_slot on home_slot.match_id = m.id and home_slot.side = 'home'
      join public.match_slots away_slot on away_slot.match_id = m.id and away_slot.side = 'away'
      cross join lateral private.euro28_simulator_synthetic_score(m.match_number) synthetic
      where m.tournament_id = p_tournament_id and m.match_number between 1 and 36
    ) source;

    v_picks := '[]'::jsonb;

    for v_round in 1..15 loop
      exit when jsonb_array_length(v_picks) >= 15;
      v_added := 0;

      for v_ko in
        select k.match_id, k.match_number, k.home_team_id, k.away_team_id
        from private.euro28_expected_knockout_participants(
          p_tournament_id, v_group_bundle || v_picks) k
        where k.participants_resolved
          and not exists (
            select 1 from jsonb_array_elements(v_picks) pick
            where (pick ->> 'match_id')::uuid = k.match_id)
        order by k.match_number
      loop
        if v_persona.key in ('bracket_survives_deep', 'exact_score_heavy', 'submitted_complete',
          'unsubmitted_identical', 'engineered_tie_a', 'engineered_tie_b') then
          v_advancing := v_ko.home_team_id;
        elsif v_persona.key in ('bracket_dead_early', 'all_wrong') then
          v_advancing := v_ko.away_team_id;
        elsif private.euro28_simulator_fnv32(v_persona.key || ':' || v_ko.match_number) % 2 = 0 then
          v_advancing := v_ko.home_team_id;
        else
          v_advancing := v_ko.away_team_id;
        end if;

        v_picks := v_picks || jsonb_build_object(
          'match_id', v_ko.match_id,
          'match_number', v_ko.match_number,
          'predicted_home_tournament_team_id', v_ko.home_team_id,
          'predicted_away_tournament_team_id', v_ko.away_team_id,
          'home_score_90', null,
          'away_score_90', null,
          'advancing_tournament_team_id', v_advancing,
          'decision_method', null,
          'joker_applied', false
        );
        v_added := v_added + 1;
      end loop;

      exit when v_added = 0;
    end loop;

    if jsonb_array_length(v_picks) <> 15 then
      raise exception 'Bracket incomplete for %: %/15 picks resolved',
        v_persona.key, jsonb_array_length(v_picks);
    end if;

    insert into public.bracket_predictions (
      prediction_set_id, tournament_id, match_id,
      predicted_home_tournament_team_id, predicted_away_tournament_team_id,
      advancing_tournament_team_id
    )
    select v_set_id, p_tournament_id,
      (pick ->> 'match_id')::uuid,
      (pick ->> 'predicted_home_tournament_team_id')::uuid,
      (pick ->> 'predicted_away_tournament_team_id')::uuid,
      (pick ->> 'advancing_tournament_team_id')::uuid
    from jsonb_array_elements(v_picks) pick
    on conflict (prediction_set_id, match_id) do update set
      predicted_home_tournament_team_id = excluded.predicted_home_tournament_team_id,
      predicted_away_tournament_team_id = excluded.predicted_away_tournament_team_id,
      advancing_tournament_team_id = excluded.advancing_tournament_team_id,
      updated_at = now();
  end loop;

  -- 4. KO Predictor sets (separate competition; exists with 0 pts pre-KO).
  for v_persona in
    select * from (values
      ('exact_score_heavy'), ('outcome_only'), ('all_wrong'), ('submitted_complete'),
      ('joker_cap_reached'), ('zero_jokers'), ('engineered_tie_a'), ('engineered_tie_b'),
      ('ko_only'), ('ko_advancing_only'), ('ko_method_variant'), ('ko_joker_variant'),
      ('correction_sensitive')
    ) as persona(key)
  loop
    select id into v_persona_user
    from auth.users where email = v_persona.key || '@synthetic.euro28.test' limit 1;
    continue when v_persona_user is null;

    insert into public.prediction_sets (
      tournament_id, user_id, competition_key, contract_version, scoring_ruleset_id, revision, submitted_at
    ) values (
      p_tournament_id, v_persona_user, 'ko_predictor', v_contract_version, v_ruleset_id, 0, null
    )
    on conflict (tournament_id, user_id, competition_key) do nothing;
  end loop;

  -- 5. Leagues (single-competition, Migration 019): two Original plus one KO.
  for v_league in
    select * from (values
      ('Synthetic Large Table', 'SYNTHLARGE', 'original',
        array['exact_score_heavy', 'outcome_only', 'all_wrong', 'submitted_complete',
          'joker_cap_reached', 'zero_jokers', 'engineered_tie_a', 'engineered_tie_b',
          'bracket_survives_deep', 'bracket_dead_early', 'ko_only', 'original_only',
          'ko_advancing_only', 'correction_sensitive']),
      ('Synthetic Tiny H2H', 'SYNTHTINY0', 'original',
        array['engineered_tie_a', 'engineered_tie_b']),
      ('Synthetic Multi League', 'SYNTHMULTI', 'ko_predictor',
        array['exact_score_heavy', 'engineered_tie_a', 'correction_sensitive'])
    ) as league(name, code, competition, members)
  loop
    select id into v_member_user
    from auth.users where email = v_league.members[1] || '@synthetic.euro28.test' limit 1;
    continue when v_member_user is null;

    insert into public.leagues (tournament_id, name, join_code, created_by_user_id, competition)
    values (p_tournament_id, v_league.name, v_league.code, v_member_user, v_league.competition)
    on conflict (tournament_id, join_code) do update set updated_at = now()
    returning id into v_league_id;

    v_member_index := 0;
    foreach v_member_key in array v_league.members loop
      v_member_index := v_member_index + 1;
      select id into v_member_user
      from auth.users where email = v_member_key || '@synthetic.euro28.test' limit 1;
      continue when v_member_user is null;

      insert into public.league_members (league_id, tournament_id, user_id, member_role)
      values (v_league_id, p_tournament_id, v_member_user,
        case when v_member_index = 1 then 'owner' else 'member' end)
      on conflict (league_id, user_id) do nothing;
    end loop;
  end loop;

  v_counts := private.euro28_simulator_counts(p_tournament_id);

  insert into public.admin_operation_events (
    tournament_id, performed_by_user_id, operation_type, note, payload
  ) values (
    p_tournament_id, v_user_id, 'simulator_world_seeded', v_note,
    jsonb_build_object('counts', v_counts)
  );

  return jsonb_build_object('ok', true, 'counts', v_counts);
end;
$$;

-- ---------------------------------------------------------------------------
-- Synthetic world teardown: dual-marker rows only, plus a full return to the
-- clean pre-results state — scripts cleared, every synthetic result unwound
-- against real time, the clock override disabled, and zero residue asserted.
-- Confirmation-phrase-gated instead of revision-gated.
-- ---------------------------------------------------------------------------

create or replace function public.admin_simulator_teardown_world(
  p_tournament_id uuid,
  p_confirmation text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_note text := private.euro28_normalise_admin_note(p_note);
  v_summary jsonb;
  v_counts jsonb;
  v_residue bigint;
begin
  perform private.euro28_simulator_require_owner(p_tournament_id, v_user_id);

  if p_confirmation is distinct from 'TEARDOWN-SYNTHETIC-WORLD' then
    raise exception using errcode = '22023',
      message = 'Teardown requires the exact confirmation phrase';
  end if;

  -- Leagues first (created_by is ON DELETE RESTRICT), then users (cascades
  -- profiles, predictions, points and totals), then simulation scripts.
  delete from public.leagues
  where created_by_user_id in (
    select id from auth.users
    where email like '%@synthetic.euro28.test'
      and (raw_user_meta_data ->> 'synthetic_euro28') = 'true');

  delete from auth.users
  where email like '%@synthetic.euro28.test'
    and (raw_user_meta_data ->> 'synthetic_euro28') = 'true';

  delete from private.simulation_score_scripts
  where tournament_id = p_tournament_id;

  -- Unwind every synthetic result against real time and disable the override.
  v_summary := private.euro28_simulator_reconcile(p_tournament_id, now());

  update public.tournament_time_controls
  set is_enabled = false,
      simulated_at = null,
      phase_key = null,
      revision = revision + 1,
      note = v_note,
      updated_by_user_id = v_user_id,
      updated_at = now()
  where tournament_id = p_tournament_id;

  -- Zero-residue assertion across the dual-marker footprint. Scoped to the
  -- Stage 16A dual marker exactly like the delete above: other synthetic
  -- populations (different reserved domains) are out of this teardown's scope
  -- and must survive it untouched.
  select
    (select count(*) from auth.users
      where email like '%@synthetic.euro28.test'
        and (raw_user_meta_data ->> 'synthetic_euro28') = 'true')
    + (select count(*) from public.profiles where display_name like 'Syn16A %')
    + (select count(*) from public.leagues where created_by_user_id in (
        select id from auth.users
        where email like '%@synthetic.euro28.test'
          and (raw_user_meta_data ->> 'synthetic_euro28') = 'true'))
    + (select count(*) from private.simulation_score_scripts
      where tournament_id = p_tournament_id)
  into v_residue;

  if v_residue <> 0 then
    raise exception 'Synthetic teardown left % residue rows; transaction aborted', v_residue;
  end if;

  v_counts := private.euro28_simulator_counts(p_tournament_id);

  insert into public.admin_operation_events (
    tournament_id, performed_by_user_id, operation_type, note, payload
  ) values (
    p_tournament_id, v_user_id, 'simulator_world_torn_down', v_note,
    jsonb_build_object('summary', v_summary, 'counts', v_counts)
  );

  return jsonb_build_object('ok', true, 'summary', v_summary, 'counts', v_counts);
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges: browser calls arrive as authenticated; every function performs
-- its own admin/owner + provisional checks and fails closed.
-- ---------------------------------------------------------------------------

revoke all on function private.euro28_simulator_require_owner(uuid, uuid) from public, anon, authenticated;
revoke all on function private.euro28_simulator_fnv32(text) from public, anon, authenticated;
revoke all on function private.euro28_simulator_synthetic_score(integer) from public, anon, authenticated;
revoke all on function private.euro28_simulator_counts(uuid) from public, anon, authenticated;
revoke all on function private.euro28_simulator_reconcile(uuid, timestamptz) from public, anon, authenticated;

revoke all on function public.admin_simulator_status(uuid) from public;
revoke all on function public.admin_simulator_set_time(uuid, bigint, timestamptz, text, text) from public;
revoke all on function public.admin_simulator_script_score(uuid, uuid, integer, integer, text) from public;
revoke all on function public.admin_simulator_clear_score_script(uuid, uuid, text) from public;
revoke all on function public.admin_simulator_seed_world(uuid, text) from public;
revoke all on function public.admin_simulator_teardown_world(uuid, text, text) from public;

grant execute on function public.admin_simulator_status(uuid) to authenticated;
grant execute on function public.admin_simulator_set_time(uuid, bigint, timestamptz, text, text) to authenticated;
grant execute on function public.admin_simulator_script_score(uuid, uuid, integer, integer, text) to authenticated;
grant execute on function public.admin_simulator_clear_score_script(uuid, uuid, text) to authenticated;
grant execute on function public.admin_simulator_seed_world(uuid, text) to authenticated;
grant execute on function public.admin_simulator_teardown_world(uuid, text, text) to authenticated;

commit;
