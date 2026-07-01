-- Euro 2028 secure admin results and tournament operations (Migration 012).
--
-- This migration adds a service-managed tournament-admin registry, authenticated
-- admin RPCs, optimistic result-revision checks, append-only operation auditing,
-- match-status controls and explicit scoring recalculation. It does not add an
-- external score provider, browser table writes, leagues or WC26 dependencies.

begin;

create table private.tournament_admins (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  admin_role text not null check (admin_role in ('owner', 'results_admin')),
  is_active boolean not null default true,
  granted_at timestamptz not null default now(),
  granted_by_user_id uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by_user_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (tournament_id, user_id),
  check (
    (is_active and revoked_at is null and revoked_by_user_id is null)
    or (not is_active and revoked_at is not null)
  )
);

comment on table private.tournament_admins is
  'Service-managed Euro tournament administrators. Browser users can never grant or revoke this access.';

create table public.admin_operation_events (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  match_id uuid,
  performed_by_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  operation_type text not null check (operation_type in (
    'admin_granted',
    'admin_revoked',
    'result_recorded',
    'result_corrected',
    'result_voided',
    'result_manual_review',
    'match_status_updated',
    'points_recalculated'
  )),
  expected_result_revision bigint check (expected_result_revision is null or expected_result_revision >= 0),
  resulting_result_revision bigint check (resulting_result_revision is null or resulting_result_revision >= 0),
  note text not null check (char_length(note) between 5 and 500),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (match_id, tournament_id)
    references public.matches(id, tournament_id) on delete cascade
);

comment on table public.admin_operation_events is
  'Append-only operational audit for admin grants, result entry, status changes and manual recalculation.';

create index tournament_admins_active_user_idx
  on private.tournament_admins (user_id, tournament_id)
  where is_active = true;

create index admin_operation_events_match_created_idx
  on public.admin_operation_events (match_id, created_at desc)
  where match_id is not null;

create index admin_operation_events_tournament_created_idx
  on public.admin_operation_events (tournament_id, created_at desc);

create or replace function private.euro28_prevent_admin_operation_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '42501', message = 'Admin operation events are append-only';
end;
$$;

create trigger admin_operation_events_append_only
before update or delete on public.admin_operation_events
for each row execute function private.euro28_prevent_admin_operation_mutation();

create or replace function private.euro28_normalise_admin_note(candidate text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  normalised text := regexp_replace(btrim(coalesce(candidate, '')), '[[:space:]]+', ' ', 'g');
begin
  if char_length(normalised) < 5 or char_length(normalised) > 500 then
    raise exception using errcode = '22023', message = 'Admin operation note must be between 5 and 500 characters';
  end if;
  return normalised;
end;
$$;

create or replace function private.euro28_require_tournament_admin(
  p_tournament_id uuid,
  p_user_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  resolved_role text;
begin
  if p_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required for tournament administration';
  end if;

  select admin.admin_role
  into resolved_role
  from private.tournament_admins admin
  where admin.tournament_id = p_tournament_id
    and admin.user_id = p_user_id
    and admin.is_active = true;

  if resolved_role is null then
    raise exception using errcode = '42501', message = 'Tournament administrator access is required';
  end if;

  return resolved_role;
end;
$$;

create or replace function private.euro28_set_tournament_admin(
  p_tournament_id uuid,
  p_user_id uuid,
  p_admin_role text,
  p_is_active boolean,
  p_changed_by_user_id uuid,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalised_note text := private.euro28_normalise_admin_note(p_note);
  operation text;
begin
  if p_admin_role not in ('owner', 'results_admin') then
    raise exception using errcode = '22023', message = 'Unsupported tournament administrator role';
  end if;

  if not exists (select 1 from public.tournaments where id = p_tournament_id) then
    raise exception using errcode = 'P0002', message = 'Tournament was not found';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception using errcode = 'P0002', message = 'Administrator account was not found';
  end if;

  if p_changed_by_user_id is not null
    and not exists (select 1 from auth.users where id = p_changed_by_user_id) then
    raise exception using errcode = 'P0002', message = 'Granting account was not found';
  end if;

  if p_is_active then
    insert into private.tournament_admins (
      tournament_id,
      user_id,
      admin_role,
      is_active,
      granted_at,
      granted_by_user_id,
      revoked_at,
      revoked_by_user_id,
      updated_at
    ) values (
      p_tournament_id,
      p_user_id,
      p_admin_role,
      true,
      now(),
      p_changed_by_user_id,
      null,
      null,
      now()
    )
    on conflict (tournament_id, user_id) do update
    set
      admin_role = excluded.admin_role,
      is_active = true,
      granted_at = now(),
      granted_by_user_id = p_changed_by_user_id,
      revoked_at = null,
      revoked_by_user_id = null,
      updated_at = now();
    operation := 'admin_granted';
  else
    update private.tournament_admins
    set
      is_active = false,
      revoked_at = now(),
      revoked_by_user_id = p_changed_by_user_id,
      updated_at = now()
    where tournament_id = p_tournament_id
      and user_id = p_user_id;

    if not found then
      raise exception using errcode = 'P0002', message = 'Tournament administrator assignment was not found';
    end if;
    operation := 'admin_revoked';
  end if;

  insert into public.admin_operation_events (
    tournament_id,
    performed_by_user_id,
    target_user_id,
    operation_type,
    note,
    payload
  ) values (
    p_tournament_id,
    p_changed_by_user_id,
    p_user_id,
    operation,
    normalised_note,
    jsonb_build_object('admin_role', p_admin_role, 'is_active', p_is_active)
  );

  return jsonb_build_object(
    'tournament_id', p_tournament_id,
    'user_id', p_user_id,
    'admin_role', p_admin_role,
    'is_active', p_is_active
  );
end;
$$;

create or replace function public.get_my_tournament_admin_access(
  p_tournament_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'is_admin', coalesce(admin.is_active, false),
    'admin_role', case when admin.is_active then admin.admin_role else null end,
    'tournament_id', p_tournament_id
  )
  from (select 1) seed
  left join private.tournament_admins admin
    on admin.tournament_id = p_tournament_id
   and admin.user_id = auth.uid()
   and admin.is_active = true;
$$;

create or replace function public.admin_list_tournament_matches(
  p_tournament_id uuid
)
returns table (
  match_id uuid,
  match_number integer,
  stage_code text,
  stage_name text,
  group_code text,
  kickoff_at timestamptz,
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
    stage.code,
    stage.name,
    group_row.code,
    match_row.kickoff_at,
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
  join public.match_slots home_slot on home_slot.match_id = match_row.id and home_slot.side = 'home'
  join public.match_slots away_slot on away_slot.match_id = match_row.id and away_slot.side = 'away'
  left join public.tournament_teams home_tournament_team on home_tournament_team.id = home_slot.resolved_tournament_team_id
  left join public.teams home_team on home_team.id = home_tournament_team.team_id
  left join public.tournament_teams away_tournament_team on away_tournament_team.id = away_slot.resolved_tournament_team_id
  left join public.teams away_team on away_team.id = away_tournament_team.team_id
  where match_row.tournament_id = p_tournament_id
  order by match_row.match_number;
end;
$$;

create or replace function public.admin_get_match_result_history(
  p_tournament_id uuid,
  p_match_id uuid
)
returns table (
  event_id uuid,
  result_revision bigint,
  event_type text,
  result_source text,
  recorded_by_user_id uuid,
  recorded_by_display_name text,
  admin_note text,
  snapshot jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.euro28_require_tournament_admin(p_tournament_id, auth.uid());

  if not exists (
    select 1 from public.matches
    where id = p_match_id and tournament_id = p_tournament_id
  ) then
    raise exception using errcode = 'P0002', message = 'Match was not found';
  end if;

  return query
  select
    event.id,
    event.result_revision,
    event.event_type,
    event.result_source,
    event.recorded_by_user_id,
    profile.display_name,
    operation.note,
    event.snapshot,
    event.recorded_at
  from public.match_result_events event
  left join public.profiles profile on profile.id = event.recorded_by_user_id
  left join lateral (
    select admin_event.note
    from public.admin_operation_events admin_event
    where admin_event.tournament_id = event.tournament_id
      and admin_event.match_id = event.match_id
      and admin_event.resulting_result_revision = event.result_revision
      and admin_event.operation_type in (
        'result_recorded',
        'result_corrected',
        'result_voided',
        'result_manual_review'
      )
    order by admin_event.created_at desc
    limit 1
  ) operation on true
  where event.tournament_id = p_tournament_id
    and event.match_id = p_match_id
  order by event.result_revision desc;
end;
$$;

create or replace function public.admin_list_scoring_runs(
  p_tournament_id uuid,
  p_limit integer default 25
)
returns table (
  scoring_run_id uuid,
  trigger_match_id uuid,
  trigger_match_number integer,
  run_key text,
  status text,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.euro28_require_tournament_admin(p_tournament_id, auth.uid());

  if p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'Scoring run limit must be between 1 and 100';
  end if;

  return query
  select
    run.id,
    run.trigger_match_id,
    match_row.match_number,
    run.run_key,
    run.status,
    run.started_at,
    run.completed_at,
    run.error_message
  from public.scoring_runs run
  left join public.matches match_row on match_row.id = run.trigger_match_id
  where run.tournament_id = p_tournament_id
  order by run.started_at desc
  limit p_limit;
end;
$$;

create or replace function public.admin_record_match_result(
  p_tournament_id uuid,
  p_match_id uuid,
  p_expected_result_revision bigint,
  p_payload jsonb,
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
  result jsonb;
  resulting_revision bigint;
  operation_type text;
  winner_id uuid;
begin
  perform private.euro28_require_tournament_admin(p_tournament_id, current_user_id);

  if p_expected_result_revision is null or p_expected_result_revision < 0 then
    raise exception using errcode = '22023', message = 'Expected result revision must be zero or greater';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'Result payload must be a JSON object';
  end if;

  select * into current_match
  from public.matches
  where id = p_match_id and tournament_id = p_tournament_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Match was not found';
  end if;

  if current_match.result_revision <> p_expected_result_revision then
    raise exception using errcode = '40001', message = 'Result changed since it was loaded; refresh before saving';
  end if;

  winner_id := nullif(p_payload ->> 'winner_tournament_team_id', '')::uuid;

  result := private.euro28_record_match_result(
    p_tournament_id,
    p_match_id,
    p_payload ->> 'match_status',
    p_payload ->> 'result_status',
    nullif(p_payload ->> 'normal_time_home_goals', '')::integer,
    nullif(p_payload ->> 'normal_time_away_goals', '')::integer,
    nullif(p_payload ->> 'after_extra_time_home_goals', '')::integer,
    nullif(p_payload ->> 'after_extra_time_away_goals', '')::integer,
    nullif(p_payload ->> 'penalty_home_goals', '')::integer,
    nullif(p_payload ->> 'penalty_away_goals', '')::integer,
    p_payload ->> 'decision_method',
    winner_id,
    'manual',
    current_user_id
  );

  resulting_revision := (result ->> 'result_revision')::bigint;
  operation_type := case
    when p_payload ->> 'result_status' = 'void' then 'result_voided'
    when p_payload ->> 'result_status' = 'manual_review' then 'result_manual_review'
    when p_expected_result_revision = 0 then 'result_recorded'
    else 'result_corrected'
  end;

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
    operation_type,
    p_expected_result_revision,
    resulting_revision,
    normalised_note,
    p_payload
  );

  return result || jsonb_build_object(
    'operation_type', operation_type,
    'admin_note', normalised_note
  );
end;
$$;

create or replace function public.admin_update_match_status(
  p_tournament_id uuid,
  p_match_id uuid,
  p_expected_result_revision bigint,
  p_match_status text,
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
begin
  perform private.euro28_require_tournament_admin(p_tournament_id, current_user_id);

  if p_expected_result_revision is null or p_expected_result_revision < 0 then
    raise exception using errcode = '22023', message = 'Expected result revision must be zero or greater';
  end if;

  if p_match_status not in ('scheduled', 'live', 'paused', 'completed', 'postponed', 'cancelled', 'abandoned') then
    raise exception using errcode = '22023', message = 'Unsupported match status';
  end if;

  select * into current_match
  from public.matches
  where id = p_match_id and tournament_id = p_tournament_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Match was not found';
  end if;

  if current_match.result_revision <> p_expected_result_revision then
    raise exception using errcode = '40001', message = 'Result changed since it was loaded; refresh before changing status';
  end if;

  if current_match.result_status = 'confirmed' and p_match_status <> 'completed' then
    raise exception using errcode = '22023', message = 'A confirmed result must remain completed; void or review the result first';
  end if;

  update public.matches
  set status = p_match_status
  where id = p_match_id and tournament_id = p_tournament_id;

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
    'match_status_updated',
    p_expected_result_revision,
    p_expected_result_revision,
    normalised_note,
    jsonb_build_object(
      'previous_match_status', current_match.status,
      'match_status', p_match_status
    )
  );

  return jsonb_build_object(
    'match_id', p_match_id,
    'match_status', p_match_status,
    'result_revision', p_expected_result_revision
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

alter table private.tournament_admins enable row level security;
alter table public.admin_operation_events enable row level security;

revoke all on table private.tournament_admins from public, anon, authenticated;
revoke all on table public.admin_operation_events from public, anon, authenticated;

grant all on table private.tournament_admins to service_role;
grant all on table public.admin_operation_events to service_role;

revoke all on function private.euro28_prevent_admin_operation_mutation() from public, anon, authenticated;
revoke all on function private.euro28_normalise_admin_note(text) from public, anon, authenticated;
revoke all on function private.euro28_require_tournament_admin(uuid, uuid) from public, anon, authenticated;
revoke all on function private.euro28_set_tournament_admin(uuid, uuid, text, boolean, uuid, text) from public, anon, authenticated;

grant execute on function private.euro28_set_tournament_admin(uuid, uuid, text, boolean, uuid, text) to service_role;

revoke all on function public.get_my_tournament_admin_access(uuid) from public, anon, authenticated;
revoke all on function public.admin_list_tournament_matches(uuid) from public, anon, authenticated;
revoke all on function public.admin_get_match_result_history(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_list_scoring_runs(uuid, integer) from public, anon, authenticated;
revoke all on function public.admin_record_match_result(uuid, uuid, bigint, jsonb, text) from public, anon, authenticated;
revoke all on function public.admin_update_match_status(uuid, uuid, bigint, text, text) from public, anon, authenticated;
revoke all on function public.admin_recalculate_match_points(uuid, uuid, bigint, text) from public, anon, authenticated;

grant execute on function public.get_my_tournament_admin_access(uuid) to authenticated;
grant execute on function public.admin_list_tournament_matches(uuid) to authenticated;
grant execute on function public.admin_get_match_result_history(uuid, uuid) to authenticated;
grant execute on function public.admin_list_scoring_runs(uuid, integer) to authenticated;
grant execute on function public.admin_record_match_result(uuid, uuid, bigint, jsonb, text) to authenticated;
grant execute on function public.admin_update_match_status(uuid, uuid, bigint, text, text) to authenticated;
grant execute on function public.admin_recalculate_match_points(uuid, uuid, bigint, text) to authenticated;

alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

commit;
