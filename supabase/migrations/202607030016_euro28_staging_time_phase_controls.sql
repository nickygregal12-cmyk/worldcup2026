-- Euro 2028 staging-only simulated clock and phase controls (Migration 016).
--
-- Adds one audited, owner-managed time-control row per provisional tournament.
-- The control changes application time only; it never changes fixture, result,
-- lock or scoring records. Production/non-provisional tournaments fail closed.

begin;

alter table public.admin_operation_events
  drop constraint admin_operation_events_operation_type_check;

alter table public.admin_operation_events
  add constraint admin_operation_events_operation_type_check
  check (operation_type in (
    'admin_granted', 'admin_revoked', 'result_recorded', 'result_corrected',
    'result_voided', 'result_manual_review', 'match_status_updated',
    'points_recalculated', 'global_prediction_lock_applied', 'grace_granted',
    'grace_revoked', 'feature_control_updated', 'time_control_updated',
    'time_control_reset'
  ));

create table public.tournament_time_controls (
  tournament_id uuid primary key references public.tournaments(id) on delete cascade,
  is_enabled boolean not null default false,
  simulated_at timestamptz,
  phase_key text check (phase_key is null or phase_key in (
    'custom', 'pre_lock', 'global_lock', 'grace_period', 'group_live',
    'group_complete', 'knockout_unresolved', 'knockout_known',
    'ko_open', 'fixture_locked', 'match_live', 'match_complete',
    'correction_review', 'tournament_complete'
  )),
  revision bigint not null default 1 check (revision > 0),
  note text,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check ((not is_enabled and simulated_at is null) or (is_enabled and simulated_at is not null)),
  check (note is null or char_length(note) between 5 and 500)
);

comment on table public.tournament_time_controls is
  'Staging-only application clock override. It does not mutate fixtures, results, locks or scoring data.';

insert into public.tournament_time_controls (tournament_id)
select id from public.tournaments
where is_provisional = true
on conflict (tournament_id) do nothing;

alter table public.tournament_time_controls enable row level security;
revoke all on table public.tournament_time_controls from public, anon, authenticated;
grant all on table public.tournament_time_controls to service_role;

create or replace function public.get_tournament_time_control(p_tournament_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'is_enabled', control.is_enabled,
    'simulated_at', control.simulated_at,
    'phase_key', control.phase_key,
    'revision', control.revision,
    'updated_at', control.updated_at
  )
  from public.tournament_time_controls control
  join public.tournaments tournament on tournament.id = control.tournament_id
  where control.tournament_id = p_tournament_id
    and tournament.is_provisional = true;
$$;

create or replace function public.admin_set_tournament_time_control(
  p_tournament_id uuid,
  p_expected_revision bigint,
  p_simulated_at timestamptz,
  p_phase_key text,
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
  previous public.tournament_time_controls%rowtype;
  next_revision bigint;
begin
  perform private.euro28_require_tournament_owner(p_tournament_id, current_user_id);

  if not exists (
    select 1 from public.tournaments
    where id = p_tournament_id and is_provisional = true
  ) then
    raise exception using errcode = '42501', message = 'Simulated time is restricted to the provisional staging tournament';
  end if;

  if p_simulated_at is null then
    raise exception using errcode = '22023', message = 'A simulated timestamp is required';
  end if;

  if p_phase_key not in (
    'custom', 'pre_lock', 'global_lock', 'grace_period', 'group_live',
    'group_complete', 'knockout_unresolved', 'knockout_known', 'ko_open',
    'fixture_locked', 'match_live', 'match_complete', 'correction_review',
    'tournament_complete'
  ) then
    raise exception using errcode = '22023', message = 'Unsupported time-control phase';
  end if;

  select * into previous
  from public.tournament_time_controls
  where tournament_id = p_tournament_id
  for update;

  if previous.tournament_id is null then
    raise exception using errcode = 'P0002', message = 'Time control was not initialised';
  end if;
  if previous.revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'Time control changed; refresh before saving';
  end if;

  next_revision := previous.revision + 1;
  update public.tournament_time_controls
  set is_enabled = true,
      simulated_at = p_simulated_at,
      phase_key = p_phase_key,
      revision = next_revision,
      note = normalised_note,
      updated_by_user_id = current_user_id,
      updated_at = now()
  where tournament_id = p_tournament_id;

  insert into public.admin_operation_events (
    tournament_id, performed_by_user_id, operation_type, note, payload
  ) values (
    p_tournament_id, current_user_id, 'time_control_updated', normalised_note,
    jsonb_build_object(
      'previous_enabled', previous.is_enabled,
      'previous_simulated_at', previous.simulated_at,
      'simulated_at', p_simulated_at,
      'phase_key', p_phase_key,
      'revision', next_revision
    )
  );

  return jsonb_build_object('ok', true, 'revision', next_revision);
end;
$$;

create or replace function public.admin_reset_tournament_time_control(
  p_tournament_id uuid,
  p_expected_revision bigint,
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
  previous public.tournament_time_controls%rowtype;
  next_revision bigint;
begin
  perform private.euro28_require_tournament_owner(p_tournament_id, current_user_id);

  select * into previous
  from public.tournament_time_controls
  where tournament_id = p_tournament_id
  for update;

  if previous.tournament_id is null then
    raise exception using errcode = 'P0002', message = 'Time control was not initialised';
  end if;
  if previous.revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'Time control changed; refresh before resetting';
  end if;

  next_revision := previous.revision + 1;
  update public.tournament_time_controls
  set is_enabled = false,
      simulated_at = null,
      phase_key = null,
      revision = next_revision,
      note = normalised_note,
      updated_by_user_id = current_user_id,
      updated_at = now()
  where tournament_id = p_tournament_id;

  insert into public.admin_operation_events (
    tournament_id, performed_by_user_id, operation_type, note, payload
  ) values (
    p_tournament_id, current_user_id, 'time_control_reset', normalised_note,
    jsonb_build_object(
      'previous_simulated_at', previous.simulated_at,
      'previous_phase_key', previous.phase_key,
      'revision', next_revision
    )
  );

  return jsonb_build_object('ok', true, 'revision', next_revision);
end;
$$;

revoke all on function public.get_tournament_time_control(uuid) from public;
revoke all on function public.admin_set_tournament_time_control(uuid, bigint, timestamptz, text, text) from public;
revoke all on function public.admin_reset_tournament_time_control(uuid, bigint, text) from public;

grant execute on function public.get_tournament_time_control(uuid) to anon, authenticated;
grant execute on function public.admin_set_tournament_time_control(uuid, bigint, timestamptz, text, text) to authenticated;
grant execute on function public.admin_reset_tournament_time_control(uuid, bigint, text) to authenticated;

commit;
