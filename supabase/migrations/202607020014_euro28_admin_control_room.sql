-- Euro 2028 expanded admin tournament control room (Migration 014).
--
-- Adds owner-only irreversible lock control, audited prediction grace management,
-- feature kill-switches, tournament health/allocation review and a combined admin
-- audit timeline. Browser table writes remain unavailable. External result APIs
-- remain deferred. Also corrects the Stage 11 PL/pgSQL lint warnings.

begin;

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
    'feature_control_updated'
  ));

create table public.tournament_feature_controls (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  feature_key text not null check (feature_key in (
    'prediction_saving',
    'ko_predictor',
    'league_create_join',
    'result_entry',
    'scoring_recalculation'
  )),
  is_enabled boolean not null default true,
  reason text,
  revision bigint not null default 1 check (revision > 0),
  updated_by_user_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (tournament_id, feature_key),
  check (reason is null or btrim(reason) <> '')
);

comment on table public.tournament_feature_controls is
  'Owner-managed Euro operational kill-switches. Browser users can read and change them only through protected admin RPCs.';
comment on column public.tournament_feature_controls.revision is
  'Optimistic revision used to stop stale control-room overwrites.';

insert into public.tournament_feature_controls (tournament_id, feature_key)
select tournament.id, feature.feature_key
from public.tournaments tournament
cross join (values
  ('prediction_saving'::text),
  ('ko_predictor'::text),
  ('league_create_join'::text),
  ('result_entry'::text),
  ('scoring_recalculation'::text)
) feature(feature_key)
on conflict (tournament_id, feature_key) do nothing;

create index tournament_feature_controls_disabled_idx
  on public.tournament_feature_controls (tournament_id, feature_key)
  where is_enabled = false;

create or replace function private.euro28_require_tournament_owner(
  p_tournament_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  resolved_role text;
begin
  resolved_role := private.euro28_require_tournament_admin(p_tournament_id, p_user_id);
  if resolved_role <> 'owner' then
    raise exception using errcode = '42501', message = 'Tournament owner access is required';
  end if;
end;
$$;

create or replace function private.euro28_is_feature_enabled(
  p_tournament_id uuid,
  p_feature_key text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select control.is_enabled
    from public.tournament_feature_controls control
    where control.tournament_id = p_tournament_id
      and control.feature_key = p_feature_key
  ), true);
$$;

create or replace function private.euro28_require_feature_enabled(
  p_tournament_id uuid,
  p_feature_key text
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_feature_key not in (
    'prediction_saving',
    'ko_predictor',
    'league_create_join',
    'result_entry',
    'scoring_recalculation'
  ) then
    raise exception using errcode = '22023', message = 'Unsupported tournament feature control';
  end if;

  if not private.euro28_is_feature_enabled(p_tournament_id, p_feature_key) then
    raise exception using errcode = 'P0001', message = format('Tournament feature is temporarily disabled: %s', p_feature_key);
  end if;
end;
$$;

create or replace function private.euro28_guard_prediction_feature()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_tournament_id uuid;
  target_competition text;
begin
  if auth.uid() is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    target_tournament_id := old.tournament_id;
    target_competition := old.competition_key;
  else
    target_tournament_id := new.tournament_id;
    target_competition := new.competition_key;
  end if;

  perform private.euro28_require_feature_enabled(target_tournament_id, 'prediction_saving');
  if target_competition = 'ko_predictor' then
    perform private.euro28_require_feature_enabled(target_tournament_id, 'ko_predictor');
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger prediction_sets_feature_guard
before insert or update or delete on public.prediction_sets
for each row execute function private.euro28_guard_prediction_feature();

create or replace function private.euro28_guard_league_create_join_feature()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    perform private.euro28_require_feature_enabled(new.tournament_id, 'league_create_join');
  end if;
  return new;
end;
$$;

create trigger leagues_create_feature_guard
before insert on public.leagues
for each row execute function private.euro28_guard_league_create_join_feature();

create trigger league_members_join_feature_guard
before insert on public.league_members
for each row execute function private.euro28_guard_league_create_join_feature();

create or replace function private.euro28_guard_result_entry_feature()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    perform private.euro28_require_feature_enabled(new.tournament_id, 'result_entry');
  end if;
  return new;
end;
$$;

create trigger match_result_events_feature_guard
before insert on public.match_result_events
for each row execute function private.euro28_guard_result_entry_feature();

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
  left join public.tournament_teams tournament_team on tournament_team.id = slot.resolved_tournament_team_id
  left join public.teams team on team.id = tournament_team.team_id
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
      join public.prediction_sets prediction_set on prediction_set.id = prediction.prediction_set_id
      where prediction.match_id = match_row.id
        and prediction.joker_applied = true
        and prediction_set.competition_key = case when match_row.match_number <= 36 then 'original' else 'ko_predictor' end
    )
  ) order by match_row.match_number), '[]'::jsonb)
  into joker_locks
  from public.matches match_row
  where match_row.tournament_id = p_tournament_id;

  health := jsonb_build_object(
    'total_matches', (select count(*) from public.matches where tournament_id = p_tournament_id),
    'unresolved_participant_slots', (
      select count(*)
      from public.match_slots slot
      where slot.tournament_id = p_tournament_id
        and slot.resolved_tournament_team_id is null
    ),
    'missing_kickoff_times', (
      select count(*) from public.matches where tournament_id = p_tournament_id and kickoff_at is null
    ),
    'live_or_paused_matches', (
      select count(*) from public.matches where tournament_id = p_tournament_id and status in ('live', 'paused')
    ),
    'confirmed_results', (
      select count(*) from public.matches where tournament_id = p_tournament_id and result_status = 'confirmed'
    ),
    'manual_review_results', (
      select count(*) from public.matches where tournament_id = p_tournament_id and result_status = 'manual_review'
    ),
    'void_results', (
      select count(*) from public.matches where tournament_id = p_tournament_id and result_status = 'void'
    ),
    'failed_scoring_runs', (
      select count(*) from public.scoring_runs where tournament_id = p_tournament_id and status = 'failed'
    ),
    'stale_running_scoring_runs', (
      select count(*) from public.scoring_runs
      where tournament_id = p_tournament_id
        and status = 'running'
        and started_at < statement_timestamp() - interval '10 minutes'
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
      where tournament_id = p_tournament_id and is_enabled = false
    )
  );

  return jsonb_build_object(
    'tournament_id', p_tournament_id,
    'admin_role', private.euro28_require_tournament_admin(p_tournament_id, current_user_id),
    'lock', jsonb_build_object(
      'scheduled_at', tournament_row.prediction_lock_at,
      'persisted_at', tournament_row.prediction_locked_at,
      'is_effective', (
        tournament_row.prediction_locked_at is not null
        or (tournament_row.prediction_lock_at is not null and statement_timestamp() >= tournament_row.prediction_lock_at)
      ),
      'is_irreversible', tournament_row.prediction_locked_at is not null
    ),
    'features', features,
    'health', health,
    'knockout_allocation', knockout_allocation,
    'joker_locks', joker_locks
  );
end;
$$;

create or replace function public.admin_apply_global_prediction_lock(
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
  locked_at timestamptz;
begin
  perform private.euro28_require_tournament_owner(p_tournament_id, current_user_id);

  select prediction_locked_at into locked_at
  from public.tournaments
  where id = p_tournament_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Tournament was not found';
  end if;
  if locked_at is not null then
    raise exception using errcode = 'P0001', message = 'The global prediction lock is already irreversible';
  end if;

  update public.tournaments
  set prediction_locked_at = now()
  where id = p_tournament_id
  returning prediction_locked_at into locked_at;

  insert into public.admin_operation_events (
    tournament_id, performed_by_user_id, operation_type, note, payload
  ) values (
    p_tournament_id,
    current_user_id,
    'global_prediction_lock_applied',
    normalised_note,
    jsonb_build_object('prediction_locked_at', locked_at)
  );

  return jsonb_build_object(
    'tournament_id', p_tournament_id,
    'prediction_locked_at', locked_at,
    'irreversible', true
  );
end;
$$;

create or replace function public.admin_update_feature_control(
  p_tournament_id uuid,
  p_feature_key text,
  p_expected_revision bigint,
  p_is_enabled boolean,
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
  previous_enabled boolean;
  resulting_revision bigint;
begin
  perform private.euro28_require_tournament_owner(p_tournament_id, current_user_id);

  if p_expected_revision is null or p_expected_revision < 1 then
    raise exception using errcode = '22023', message = 'Expected feature revision must be one or greater';
  end if;

  select is_enabled into previous_enabled
  from public.tournament_feature_controls
  where tournament_id = p_tournament_id
    and feature_key = p_feature_key
    and revision = p_expected_revision
  for update;

  if not found then
    if exists (
      select 1 from public.tournament_feature_controls
      where tournament_id = p_tournament_id and feature_key = p_feature_key
    ) then
      raise exception using errcode = '40001', message = 'Feature control changed since it was loaded; refresh before saving';
    end if;
    raise exception using errcode = 'P0002', message = 'Feature control was not found';
  end if;

  update public.tournament_feature_controls
  set
    is_enabled = p_is_enabled,
    reason = normalised_note,
    revision = revision + 1,
    updated_by_user_id = current_user_id,
    updated_at = now()
  where tournament_id = p_tournament_id
    and feature_key = p_feature_key
  returning revision into resulting_revision;

  insert into public.admin_operation_events (
    tournament_id, performed_by_user_id, operation_type, note, payload
  ) values (
    p_tournament_id,
    current_user_id,
    'feature_control_updated',
    normalised_note,
    jsonb_build_object(
      'feature_key', p_feature_key,
      'previous_enabled', previous_enabled,
      'is_enabled', p_is_enabled,
      'expected_revision', p_expected_revision,
      'resulting_revision', resulting_revision
    )
  );

  return jsonb_build_object(
    'tournament_id', p_tournament_id,
    'feature_key', p_feature_key,
    'is_enabled', p_is_enabled,
    'revision', resulting_revision,
    'reason', normalised_note
  );
end;
$$;

create or replace function public.admin_search_prediction_users(
  p_tournament_id uuid,
  p_query text,
  p_limit integer default 20
)
returns table (
  user_id uuid,
  display_name text,
  has_original_predictions boolean,
  has_ko_predictions boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalised_query text := btrim(coalesce(p_query, ''));
begin
  perform private.euro28_require_tournament_owner(p_tournament_id, current_user_id);

  if char_length(normalised_query) < 2 then
    raise exception using errcode = '22023', message = 'Enter at least two characters to search predictors';
  end if;

  return query
  select
    profile.id,
    profile.display_name,
    exists (
      select 1 from public.prediction_sets prediction_set
      where prediction_set.tournament_id = p_tournament_id
        and prediction_set.user_id = profile.id
        and prediction_set.competition_key = 'original'
    ),
    exists (
      select 1 from public.prediction_sets prediction_set
      where prediction_set.tournament_id = p_tournament_id
        and prediction_set.user_id = profile.id
        and prediction_set.competition_key = 'ko_predictor'
    )
  from public.profiles profile
  where profile.display_name ilike '%' || normalised_query || '%'
  order by profile.display_name
  limit greatest(1, least(coalesce(p_limit, 20), 50));
end;
$$;

create or replace function public.admin_list_prediction_grace(
  p_tournament_id uuid
)
returns table (
  grace_id uuid,
  user_id uuid,
  display_name text,
  match_id uuid,
  match_number integer,
  home_team_label text,
  away_team_label text,
  competition_key text,
  granted_at timestamptz,
  expires_at timestamptz,
  reason text,
  revoked_at timestamptz,
  revocation_reason text,
  grace_status text
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
    grace.id,
    grace.user_id,
    profile.display_name,
    match_row.id,
    match_row.match_number,
    coalesce(home_team.short_name, home_tournament_team.slot_code, home_slot.rule_code, 'TBC'),
    coalesce(away_team.short_name, away_tournament_team.slot_code, away_slot.rule_code, 'TBC'),
    grace.competition_key,
    grace.granted_at,
    grace.expires_at,
    grace.reason,
    grace.revoked_at,
    grace.revocation_reason,
    case
      when grace.revoked_at is not null then 'revoked'
      when grace.expires_at <= statement_timestamp()
        or match_row.status in ('live', 'paused', 'completed', 'abandoned')
        or (match_row.kickoff_at is not null and match_row.kickoff_at <= statement_timestamp())
        then 'expired'
      else 'active'
    end
  from public.prediction_grace_windows grace
  join public.profiles profile on profile.id = grace.user_id
  join public.matches match_row on match_row.id = grace.match_id
  join public.match_slots home_slot on home_slot.match_id = match_row.id and home_slot.side = 'home'
  join public.match_slots away_slot on away_slot.match_id = match_row.id and away_slot.side = 'away'
  left join public.tournament_teams home_tournament_team on home_tournament_team.id = home_slot.resolved_tournament_team_id
  left join public.teams home_team on home_team.id = home_tournament_team.team_id
  left join public.tournament_teams away_tournament_team on away_tournament_team.id = away_slot.resolved_tournament_team_id
  left join public.teams away_team on away_team.id = away_tournament_team.team_id
  where grace.tournament_id = p_tournament_id
  order by
    case when grace.revoked_at is null and grace.expires_at > statement_timestamp() then 0 else 1 end,
    grace.created_at desc;
end;
$$;

create or replace function public.admin_grant_prediction_grace(
  p_tournament_id uuid,
  p_user_id uuid,
  p_match_id uuid,
  p_competition_key text,
  p_expires_at timestamptz,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalised_reason text := private.euro28_normalise_admin_note(p_reason);
  grace_id uuid;
  match_number integer;
begin
  perform private.euro28_require_tournament_owner(p_tournament_id, current_user_id);

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception using errcode = 'P0002', message = 'Predictor profile was not found';
  end if;

  select match_row.match_number into match_number
  from public.matches match_row
  where match_row.id = p_match_id and match_row.tournament_id = p_tournament_id;

  if match_number is null then
    raise exception using errcode = 'P0002', message = 'Match was not found';
  end if;
  if (p_competition_key = 'original' and match_number > 36)
     or (p_competition_key = 'ko_predictor' and match_number < 37) then
    raise exception using errcode = '22023', message = 'Grace competition does not match the target match';
  end if;

  grace_id := private.euro28_grant_prediction_grace(
    p_tournament_id,
    p_user_id,
    p_match_id,
    p_competition_key,
    current_user_id,
    p_expires_at,
    normalised_reason
  );

  insert into public.admin_operation_events (
    tournament_id, match_id, performed_by_user_id, target_user_id,
    operation_type, note, payload
  ) values (
    p_tournament_id,
    p_match_id,
    current_user_id,
    p_user_id,
    'grace_granted',
    normalised_reason,
    jsonb_build_object(
      'grace_id', grace_id,
      'competition_key', p_competition_key,
      'expires_at', p_expires_at
    )
  );

  return jsonb_build_object(
    'grace_id', grace_id,
    'user_id', p_user_id,
    'match_id', p_match_id,
    'competition_key', p_competition_key,
    'expires_at', p_expires_at
  );
end;
$$;

create or replace function public.admin_revoke_prediction_grace(
  p_tournament_id uuid,
  p_grace_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalised_reason text := private.euro28_normalise_admin_note(p_reason);
  grace_row public.prediction_grace_windows%rowtype;
begin
  perform private.euro28_require_tournament_owner(p_tournament_id, current_user_id);

  select grace.* into grace_row
  from public.prediction_grace_windows grace
  where grace.id = p_grace_id
    and grace.tournament_id = p_tournament_id
  for update;

  if grace_row.id is null then
    raise exception using errcode = 'P0002', message = 'Grace window was not found';
  end if;

  perform private.euro28_revoke_prediction_grace(p_grace_id, current_user_id, normalised_reason);

  insert into public.admin_operation_events (
    tournament_id, match_id, performed_by_user_id, target_user_id,
    operation_type, note, payload
  ) values (
    p_tournament_id,
    grace_row.match_id,
    current_user_id,
    grace_row.user_id,
    'grace_revoked',
    normalised_reason,
    jsonb_build_object(
      'grace_id', p_grace_id,
      'competition_key', grace_row.competition_key
    )
  );

  return jsonb_build_object(
    'grace_id', p_grace_id,
    'revoked', true
  );
end;
$$;

create or replace function public.admin_list_operation_events(
  p_tournament_id uuid,
  p_limit integer default 50
)
returns table (
  event_id uuid,
  operation_type text,
  match_id uuid,
  match_number integer,
  performed_by_user_id uuid,
  performed_by_display_name text,
  target_user_id uuid,
  target_display_name text,
  note text,
  payload jsonb,
  created_at timestamptz
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
    event.id,
    event.operation_type,
    event.match_id,
    match_row.match_number,
    event.performed_by_user_id,
    coalesce(actor.display_name, 'System'),
    event.target_user_id,
    target.display_name,
    event.note,
    event.payload,
    event.created_at
  from public.admin_operation_events event
  left join public.matches match_row on match_row.id = event.match_id
  left join public.profiles actor on actor.id = event.performed_by_user_id
  left join public.profiles target on target.id = event.target_user_id
  where event.tournament_id = p_tournament_id
  order by event.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
end;
$$;

-- Stage 11 lint correction: remove the redundant declared FOR-loop variable.
create or replace function public.create_my_league(
  p_tournament_id uuid,
  p_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  normalised_name text;
  generated_code text;
  league_row public.leagues%rowtype;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;

  if not exists (
    select 1 from public.tournaments tournament
    where tournament.id = p_tournament_id
      and tournament.is_public = true
  ) then
    raise exception using errcode = '22023', message = 'Tournament is unavailable';
  end if;

  normalised_name := private.euro28_normalise_league_name(p_name);

  for attempt in 1..20 loop
    generated_code := upper(substr(md5(
      caller_id::text || p_tournament_id::text || clock_timestamp()::text || random()::text
    ), 1, 10));

    begin
      insert into public.leagues (
        tournament_id,
        name,
        join_code,
        created_by_user_id
      ) values (
        p_tournament_id,
        normalised_name,
        generated_code,
        caller_id
      )
      returning * into league_row;

      exit;
    exception when unique_violation then
      if attempt = 20 then
        raise exception 'A unique league code could not be generated';
      end if;
    end;
  end loop;

  insert into public.league_members (
    league_id,
    tournament_id,
    user_id,
    member_role
  ) values (
    league_row.id,
    league_row.tournament_id,
    caller_id,
    'owner'
  );

  return jsonb_build_object(
    'league_id', league_row.id,
    'tournament_id', league_row.tournament_id,
    'name', league_row.name,
    'join_code', league_row.join_code,
    'member_role', 'owner',
    'member_count', 1
  );
end;
$$;

-- Stage 11 lint correction: statement_timestamp() is STABLE and gives one
-- authoritative visibility boundary for the whole statement.
create or replace function private.euro28_build_shared_prediction_bundle(
  p_tournament_id uuid,
  p_member_user_id uuid,
  p_competition_key text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  tournament_row public.tournaments%rowtype;
  prediction_set_row public.prediction_sets%rowtype;
  target_name text;
  match_rows jsonb := '[]'::jsonb;
  bracket_rows jsonb := '[]'::jsonb;
  original_visible boolean := false;
  visible_match_count integer := 0;
begin
  if p_competition_key not in ('original', 'ko_predictor') then
    raise exception using errcode = '22023', message = 'Competition key is invalid';
  end if;

  select tournament.* into tournament_row
  from public.tournaments tournament
  where tournament.id = p_tournament_id
    and tournament.is_public = true;

  if tournament_row.id is null then
    raise exception using errcode = '22023', message = 'Tournament is unavailable';
  end if;

  select profile.display_name into target_name
  from public.profiles profile
  where profile.id = p_member_user_id;

  if target_name is null then
    raise exception using errcode = '22023', message = 'Predictor profile was not found';
  end if;

  select prediction_set.* into prediction_set_row
  from public.prediction_sets prediction_set
  where prediction_set.tournament_id = p_tournament_id
    and prediction_set.user_id = p_member_user_id
    and prediction_set.competition_key = p_competition_key;

  if p_competition_key = 'original' then
    original_visible := tournament_row.prediction_locked_at is not null
      and tournament_row.prediction_locked_at <= statement_timestamp();

    if not original_visible then
      return jsonb_build_object(
        'visible', false,
        'visibility_scope', 'global_original_lock',
        'reason', 'Original predictions remain private until the tournament prediction lock.',
        'competition_key', p_competition_key,
        'member_user_id', p_member_user_id,
        'display_name', target_name,
        'match_predictions', '[]'::jsonb,
        'bracket_predictions', '[]'::jsonb
      );
    end if;

    if prediction_set_row.id is not null then
      select coalesce(jsonb_agg(jsonb_build_object(
        'match_id', prediction.match_id,
        'match_number', match_row.match_number,
        'predicted_home_tournament_team_id', prediction.predicted_home_tournament_team_id,
        'predicted_away_tournament_team_id', prediction.predicted_away_tournament_team_id,
        'home_score_90', prediction.home_score_90,
        'away_score_90', prediction.away_score_90,
        'joker_applied', prediction.joker_applied
      ) order by match_row.match_number), '[]'::jsonb)
      into match_rows
      from public.match_predictions prediction
      join public.matches match_row on match_row.id = prediction.match_id
      where prediction.prediction_set_id = prediction_set_row.id
        and match_row.match_number between 1 and 36;

      select coalesce(jsonb_agg(jsonb_build_object(
        'match_id', prediction.match_id,
        'match_number', match_row.match_number,
        'predicted_home_tournament_team_id', prediction.predicted_home_tournament_team_id,
        'predicted_away_tournament_team_id', prediction.predicted_away_tournament_team_id,
        'advancing_tournament_team_id', prediction.advancing_tournament_team_id
      ) order by match_row.match_number), '[]'::jsonb)
      into bracket_rows
      from public.bracket_predictions prediction
      join public.matches match_row on match_row.id = prediction.match_id
      where prediction.prediction_set_id = prediction_set_row.id;
    end if;

    return jsonb_build_object(
      'visible', true,
      'visibility_scope', 'global_original_lock',
      'competition_key', p_competition_key,
      'member_user_id', p_member_user_id,
      'display_name', target_name,
      'prediction_revision', coalesce(prediction_set_row.revision, 0),
      'match_predictions', match_rows,
      'bracket_predictions', bracket_rows
    );
  end if;

  if prediction_set_row.id is not null then
    select
      coalesce(jsonb_agg(jsonb_build_object(
        'match_id', prediction.match_id,
        'match_number', match_row.match_number,
        'predicted_home_tournament_team_id', prediction.predicted_home_tournament_team_id,
        'predicted_away_tournament_team_id', prediction.predicted_away_tournament_team_id,
        'home_score_90', prediction.home_score_90,
        'away_score_90', prediction.away_score_90,
        'advancing_tournament_team_id', prediction.advancing_tournament_team_id,
        'decision_method', prediction.decision_method,
        'joker_applied', prediction.joker_applied
      ) order by match_row.match_number), '[]'::jsonb),
      count(*)::integer
    into match_rows, visible_match_count
    from public.match_predictions prediction
    join public.matches match_row on match_row.id = prediction.match_id
    where prediction.prediction_set_id = prediction_set_row.id
      and match_row.match_number between 37 and 51
      and (
        (match_row.kickoff_at is not null and match_row.kickoff_at <= statement_timestamp())
        or match_row.status in ('live', 'paused', 'completed', 'abandoned')
      );
  end if;

  return jsonb_build_object(
    'visible', visible_match_count > 0,
    'visibility_scope', 'started_ko_matches_only',
    'reason', case when visible_match_count = 0
      then 'KO Predictor picks appear match by match after each fixture starts.'
      else null end,
    'competition_key', p_competition_key,
    'member_user_id', p_member_user_id,
    'display_name', target_name,
    'prediction_revision', coalesce(prediction_set_row.revision, 0),
    'visible_match_count', visible_match_count,
    'match_predictions', match_rows,
    'bracket_predictions', '[]'::jsonb
  );
end;
$$;

create or replace function public.admin_recalculate_match_points(
  p_tournament_id uuid,
  p_match_id uuid,
  p_expected_result_revision bigint,
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
  normalised_note text := private.euro28_normalise_admin_note(p_note);
  scoring_run_id uuid;
begin
  perform private.euro28_require_tournament_admin(p_tournament_id, current_user_id);
  perform private.euro28_require_feature_enabled(p_tournament_id, 'scoring_recalculation');

  if p_expected_result_revision is null or p_expected_result_revision < 0 then
    raise exception using errcode = '22023', message = 'Expected result revision must be zero or greater';
  end if;

  select * into current_match
  from public.matches
  where id = p_match_id and tournament_id = p_tournament_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Match was not found';
  end if;

  if current_match.result_revision <> p_expected_result_revision then
    raise exception using errcode = '40001', message = 'Result changed since it was loaded; refresh before recalculating';
  end if;

  if current_match.result_status <> 'confirmed' then
    raise exception using errcode = '22023', message = 'Only a confirmed result can be recalculated manually';
  end if;

  scoring_run_id := private.euro28_recalculate_points(p_tournament_id, p_match_id);

  insert into public.admin_operation_events (
    tournament_id,
    match_id,
    performed_by_user_id,
    operation_type,
    expected_result_revision,
    resulting_result_revision,
    note,
    payload
  ) values (
    p_tournament_id,
    p_match_id,
    current_user_id,
    'points_recalculated',
    p_expected_result_revision,
    p_expected_result_revision,
    normalised_note,
    jsonb_build_object('scoring_run_id', scoring_run_id)
  );

  return jsonb_build_object(
    'match_id', p_match_id,
    'result_revision', p_expected_result_revision,
    'scoring_run_id', scoring_run_id
  );
end;
$$;

alter table public.tournament_feature_controls enable row level security;

revoke all on table public.tournament_feature_controls from public, anon, authenticated;
grant all on table public.tournament_feature_controls to service_role;

revoke all on function private.euro28_require_tournament_owner(uuid, uuid) from public, anon, authenticated;
revoke all on function private.euro28_is_feature_enabled(uuid, text) from public, anon, authenticated;
revoke all on function private.euro28_require_feature_enabled(uuid, text) from public, anon, authenticated;
revoke all on function private.euro28_guard_prediction_feature() from public, anon, authenticated;
revoke all on function private.euro28_guard_league_create_join_feature() from public, anon, authenticated;
revoke all on function private.euro28_guard_result_entry_feature() from public, anon, authenticated;

revoke all on function public.admin_get_tournament_control_room(uuid) from public, anon, authenticated;
revoke all on function public.admin_apply_global_prediction_lock(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_update_feature_control(uuid, text, bigint, boolean, text) from public, anon, authenticated;
revoke all on function public.admin_search_prediction_users(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.admin_list_prediction_grace(uuid) from public, anon, authenticated;
revoke all on function public.admin_grant_prediction_grace(uuid, uuid, uuid, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.admin_revoke_prediction_grace(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.admin_list_operation_events(uuid, integer) from public, anon, authenticated;

 grant execute on function public.admin_get_tournament_control_room(uuid) to authenticated;
 grant execute on function public.admin_apply_global_prediction_lock(uuid, text) to authenticated;
 grant execute on function public.admin_update_feature_control(uuid, text, bigint, boolean, text) to authenticated;
 grant execute on function public.admin_search_prediction_users(uuid, text, integer) to authenticated;
 grant execute on function public.admin_list_prediction_grace(uuid) to authenticated;
 grant execute on function public.admin_grant_prediction_grace(uuid, uuid, uuid, text, timestamptz, text) to authenticated;
 grant execute on function public.admin_revoke_prediction_grace(uuid, uuid, text) to authenticated;
 grant execute on function public.admin_list_operation_events(uuid, integer) to authenticated;

-- Final-state safety assertions.
do $$
begin
  if (select count(*) from public.tournament_feature_controls
      where tournament_id = 'e0280000-0000-4000-8000-000000000001') <> 5 then
    raise exception 'Euro tournament feature controls were not seeded exactly once';
  end if;
  if exists (
    select 1 from public.tournament_feature_controls
    where tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and is_enabled = false
  ) then
    raise exception 'Stage 12 feature controls must start enabled';
  end if;
  if has_table_privilege('authenticated', 'public.tournament_feature_controls', 'UPDATE') then
    raise exception 'Authenticated browser roles must not update feature controls directly';
  end if;
end;
$$;

commit;
