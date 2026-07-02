-- Euro 2028 Team Profile Sheet (Migration 015).
--
-- Adds centrally stored tournament-team editorial profiles, owner-only audited
-- admin editing and a single privacy-safe profile RPC. Prediction aggregates
-- are omitted until the persisted global Original Predictor lock is effective.
-- Browser roles receive no direct access to curated profile storage or any
-- prediction table. No external football-data source is introduced.

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
    'feature_control_updated',
    'team_profile_updated'
  ));

create table public.tournament_team_profiles (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  tournament_team_id uuid not null,
  ranking integer check (ranking is null or ranking between 1 and 300),
  qualifying_route text,
  best_euro_finish text,
  editorial_note text,
  profile_revision bigint not null default 1 check (profile_revision > 0),
  updated_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tournament_id, tournament_team_id),
  foreign key (tournament_team_id, tournament_id)
    references public.tournament_teams(id, tournament_id) on delete cascade,
  check (qualifying_route is null or char_length(qualifying_route) between 2 and 180),
  check (best_euro_finish is null or char_length(best_euro_finish) between 2 and 120),
  check (editorial_note is null or char_length(editorial_note) between 10 and 700)
);

comment on table public.tournament_team_profiles is
  'Tournament-specific curated team facts edited through owner-only audited RPCs. Browser roles have no direct table access.';
comment on column public.tournament_team_profiles.profile_revision is
  'Optimistic revision used to reject stale admin profile edits.';

create trigger tournament_team_profiles_set_updated_at
before update on public.tournament_team_profiles
for each row execute function public.set_updated_at();

alter table public.tournament_team_profiles enable row level security;

revoke all on table public.tournament_team_profiles from public, anon, authenticated;
grant all on table public.tournament_team_profiles to service_role;

create or replace function public.get_team_profile_sheet(
  p_tournament_id uuid,
  p_tournament_team_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  team_row record;
  profile_row public.tournament_team_profiles%rowtype;
  aggregate_visible boolean := false;
  eligible_prediction_count integer := 0;
  group_winner_count integer := 0;
  round_of_16_count integer := 0;
  quarter_final_count integer := 0;
  semi_final_count integer := 0;
  final_count integer := 0;
  champion_count integer := 0;
  viewer_prediction_set_id uuid;
  viewer_bracket_pick_count integer := 0;
  winner_slot_match_id uuid;
  winner_slot_side text;
  viewer_prediction jsonb;
  aggregate_payload jsonb;
  curated_payload jsonb;
begin
  select
    tournament.id as tournament_id,
    tournament.prediction_locked_at,
    tournament.is_public,
    tournament_team.id as tournament_team_id,
    tournament_team.team_id,
    tournament_team.slot_code,
    tournament_team.qualification_status,
    tournament_team.is_host,
    tournament_team.is_provisional,
    tournament_team.metadata,
    coalesce(team.name, tournament_team.metadata ->> 'label', tournament_team.slot_code) as team_name,
    coalesce(team.short_name, team.name, tournament_team.metadata ->> 'label', tournament_team.slot_code) as short_name,
    coalesce(team.uefa_code, tournament_team.metadata ->> 'isoCode', tournament_team.metadata ->> 'fifaCode') as iso_code,
    membership.group_id,
    group_row.code as group_code
  into team_row
  from public.tournament_teams tournament_team
  join public.tournaments tournament on tournament.id = tournament_team.tournament_id
  left join public.teams team on team.id = tournament_team.team_id
  left join public.group_memberships membership
    on membership.tournament_id = tournament_team.tournament_id
   and membership.tournament_team_id = tournament_team.id
  left join public.groups group_row
    on group_row.id = membership.group_id
   and group_row.tournament_id = membership.tournament_id
  where tournament_team.tournament_id = p_tournament_id
    and tournament_team.id = p_tournament_team_id
    and tournament.is_public = true;

  if not found then
    raise exception using errcode = 'P0002', message = 'Published tournament team was not found';
  end if;

  select * into profile_row
  from public.tournament_team_profiles profile
  where profile.tournament_id = p_tournament_id
    and profile.tournament_team_id = p_tournament_team_id;

  aggregate_visible := team_row.prediction_locked_at is not null
    and team_row.prediction_locked_at <= clock_timestamp();

  select slot.match_id, slot.side
  into winner_slot_match_id, winner_slot_side
  from public.match_slots slot
  join public.matches match_row
    on match_row.id = slot.match_id
   and match_row.tournament_id = slot.tournament_id
  where slot.tournament_id = p_tournament_id
    and slot.source_type = 'group_position'
    and slot.source_group_id = team_row.group_id
    and slot.source_position = 1
    and match_row.match_number between 37 and 44
  limit 1;

  if auth.uid() is not null then
    select prediction_set.id
    into viewer_prediction_set_id
    from public.prediction_sets prediction_set
    where prediction_set.tournament_id = p_tournament_id
      and prediction_set.user_id = auth.uid()
      and prediction_set.competition_key = 'original';
  end if;

  if viewer_prediction_set_id is not null then
    select count(*)::integer
    into viewer_bracket_pick_count
    from public.bracket_predictions prediction
    where prediction.prediction_set_id = viewer_prediction_set_id;

    viewer_prediction := jsonb_build_object(
      'has_original_prediction_set', true,
      'bracket_pick_count', viewer_bracket_pick_count,
      'predicted_group_winner', exists (
        select 1
        from public.bracket_predictions prediction
        where prediction.prediction_set_id = viewer_prediction_set_id
          and prediction.match_id = winner_slot_match_id
          and case winner_slot_side
            when 'home' then prediction.predicted_home_tournament_team_id
            when 'away' then prediction.predicted_away_tournament_team_id
            else null
          end = p_tournament_team_id
      ),
      'predicted_round_of_16', exists (
        select 1
        from public.bracket_predictions prediction
        join public.matches match_row on match_row.id = prediction.match_id
        where prediction.prediction_set_id = viewer_prediction_set_id
          and match_row.match_number between 37 and 44
          and p_tournament_team_id in (
            prediction.predicted_home_tournament_team_id,
            prediction.predicted_away_tournament_team_id
          )
      ),
      'predicted_quarter_final', exists (
        select 1
        from public.bracket_predictions prediction
        join public.matches match_row on match_row.id = prediction.match_id
        where prediction.prediction_set_id = viewer_prediction_set_id
          and match_row.match_number between 37 and 44
          and prediction.advancing_tournament_team_id = p_tournament_team_id
      ),
      'predicted_semi_final', exists (
        select 1
        from public.bracket_predictions prediction
        join public.matches match_row on match_row.id = prediction.match_id
        where prediction.prediction_set_id = viewer_prediction_set_id
          and match_row.match_number between 45 and 48
          and prediction.advancing_tournament_team_id = p_tournament_team_id
      ),
      'predicted_final', exists (
        select 1
        from public.bracket_predictions prediction
        join public.matches match_row on match_row.id = prediction.match_id
        where prediction.prediction_set_id = viewer_prediction_set_id
          and match_row.match_number between 49 and 50
          and prediction.advancing_tournament_team_id = p_tournament_team_id
      ),
      'predicted_champion', exists (
        select 1
        from public.bracket_predictions prediction
        join public.matches match_row on match_row.id = prediction.match_id
        where prediction.prediction_set_id = viewer_prediction_set_id
          and match_row.match_number = 51
          and prediction.advancing_tournament_team_id = p_tournament_team_id
      )
    );
  else
    viewer_prediction := case
      when auth.uid() is null then null
      else jsonb_build_object(
        'has_original_prediction_set', false,
        'bracket_pick_count', 0,
        'predicted_group_winner', false,
        'predicted_round_of_16', false,
        'predicted_quarter_final', false,
        'predicted_semi_final', false,
        'predicted_final', false,
        'predicted_champion', false
      )
    end;
  end if;

  if aggregate_visible then
    with eligible_sets as (
      select prediction_set.id
      from public.prediction_sets prediction_set
      where prediction_set.tournament_id = p_tournament_id
        and prediction_set.competition_key = 'original'
        and (
          select count(*)
          from public.bracket_predictions prediction
          where prediction.prediction_set_id = prediction_set.id
        ) = 15
    )
    select
      count(*)::integer,
      count(*) filter (where exists (
        select 1
        from public.bracket_predictions prediction
        where prediction.prediction_set_id = eligible.id
          and prediction.match_id = winner_slot_match_id
          and case winner_slot_side
            when 'home' then prediction.predicted_home_tournament_team_id
            when 'away' then prediction.predicted_away_tournament_team_id
            else null
          end = p_tournament_team_id
      ))::integer,
      count(*) filter (where exists (
        select 1
        from public.bracket_predictions prediction
        join public.matches match_row on match_row.id = prediction.match_id
        where prediction.prediction_set_id = eligible.id
          and match_row.match_number between 37 and 44
          and p_tournament_team_id in (
            prediction.predicted_home_tournament_team_id,
            prediction.predicted_away_tournament_team_id
          )
      ))::integer,
      count(*) filter (where exists (
        select 1
        from public.bracket_predictions prediction
        join public.matches match_row on match_row.id = prediction.match_id
        where prediction.prediction_set_id = eligible.id
          and match_row.match_number between 37 and 44
          and prediction.advancing_tournament_team_id = p_tournament_team_id
      ))::integer,
      count(*) filter (where exists (
        select 1
        from public.bracket_predictions prediction
        join public.matches match_row on match_row.id = prediction.match_id
        where prediction.prediction_set_id = eligible.id
          and match_row.match_number between 45 and 48
          and prediction.advancing_tournament_team_id = p_tournament_team_id
      ))::integer,
      count(*) filter (where exists (
        select 1
        from public.bracket_predictions prediction
        join public.matches match_row on match_row.id = prediction.match_id
        where prediction.prediction_set_id = eligible.id
          and match_row.match_number between 49 and 50
          and prediction.advancing_tournament_team_id = p_tournament_team_id
      ))::integer,
      count(*) filter (where exists (
        select 1
        from public.bracket_predictions prediction
        join public.matches match_row on match_row.id = prediction.match_id
        where prediction.prediction_set_id = eligible.id
          and match_row.match_number = 51
          and prediction.advancing_tournament_team_id = p_tournament_team_id
      ))::integer
    into
      eligible_prediction_count,
      group_winner_count,
      round_of_16_count,
      quarter_final_count,
      semi_final_count,
      final_count,
      champion_count
    from eligible_sets eligible;

    aggregate_payload := jsonb_build_object(
      'group_winner_percentage', case when eligible_prediction_count = 0 then null else round(group_winner_count::numeric * 100 / eligible_prediction_count, 1) end,
      'round_of_16_percentage', case when eligible_prediction_count = 0 then null else round(round_of_16_count::numeric * 100 / eligible_prediction_count, 1) end,
      'quarter_final_percentage', case when eligible_prediction_count = 0 then null else round(quarter_final_count::numeric * 100 / eligible_prediction_count, 1) end,
      'semi_final_percentage', case when eligible_prediction_count = 0 then null else round(semi_final_count::numeric * 100 / eligible_prediction_count, 1) end,
      'final_percentage', case when eligible_prediction_count = 0 then null else round(final_count::numeric * 100 / eligible_prediction_count, 1) end,
      'champion_percentage', case when eligible_prediction_count = 0 then null else round(champion_count::numeric * 100 / eligible_prediction_count, 1) end
    );
  else
    aggregate_payload := null;
  end if;

  curated_payload := case
    when profile_row.tournament_team_id is null then jsonb_build_object(
      'status', 'empty',
      'ranking', null,
      'qualifying_route', null,
      'best_euro_finish', null,
      'editorial_note', null,
      'profile_revision', 0,
      'updated_at', null
    )
    else jsonb_build_object(
      'status', 'ready',
      'ranking', profile_row.ranking,
      'qualifying_route', profile_row.qualifying_route,
      'best_euro_finish', profile_row.best_euro_finish,
      'editorial_note', profile_row.editorial_note,
      'profile_revision', profile_row.profile_revision,
      'updated_at', profile_row.updated_at
    )
  end;

  return jsonb_build_object(
    'team', jsonb_build_object(
      'tournament_team_id', team_row.tournament_team_id,
      'team_id', team_row.team_id,
      'name', team_row.team_name,
      'short_name', team_row.short_name,
      'iso_code', team_row.iso_code,
      'slot_code', team_row.slot_code,
      'group_code', team_row.group_code,
      'qualification_status', team_row.qualification_status,
      'is_host', team_row.is_host,
      'is_provisional', team_row.is_provisional
    ),
    'curated', curated_payload,
    'predictions', jsonb_build_object(
      'aggregates_visible', aggregate_visible,
      'visibility_reason', case
        when aggregate_visible then null
        else 'Community prediction percentages unlock after the global Original Predictor lock.'
      end,
      'eligible_prediction_count', case when aggregate_visible then eligible_prediction_count else null end,
      'aggregates', aggregate_payload,
      'viewer_prediction', viewer_prediction
    )
  );
end;
$$;

create or replace function public.admin_list_team_profiles(
  p_tournament_id uuid
)
returns table (
  tournament_team_id uuid,
  team_name text,
  short_name text,
  iso_code text,
  slot_code text,
  group_code text,
  is_provisional boolean,
  ranking integer,
  qualifying_route text,
  best_euro_finish text,
  editorial_note text,
  profile_revision bigint,
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
    tournament_team.id,
    coalesce(team.name, tournament_team.metadata ->> 'label', tournament_team.slot_code),
    coalesce(team.short_name, team.name, tournament_team.metadata ->> 'label', tournament_team.slot_code),
    coalesce(team.uefa_code, tournament_team.metadata ->> 'isoCode', tournament_team.metadata ->> 'fifaCode'),
    tournament_team.slot_code,
    group_row.code,
    tournament_team.is_provisional,
    profile.ranking,
    profile.qualifying_route,
    profile.best_euro_finish,
    profile.editorial_note,
    coalesce(profile.profile_revision, 0),
    profile.updated_at
  from public.tournament_teams tournament_team
  left join public.teams team on team.id = tournament_team.team_id
  left join public.group_memberships membership
    on membership.tournament_id = tournament_team.tournament_id
   and membership.tournament_team_id = tournament_team.id
  left join public.groups group_row
    on group_row.id = membership.group_id
   and group_row.tournament_id = membership.tournament_id
  left join public.tournament_team_profiles profile
    on profile.tournament_id = tournament_team.tournament_id
   and profile.tournament_team_id = tournament_team.id
  where tournament_team.tournament_id = p_tournament_id
  order by tournament_team.display_order nulls last, tournament_team.slot_code;
end;
$$;

create or replace function public.admin_upsert_team_profile(
  p_tournament_id uuid,
  p_tournament_team_id uuid,
  p_expected_revision bigint,
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
  normalised_note text := private.euro28_normalise_admin_note(p_note);
  current_profile public.tournament_team_profiles%rowtype;
  next_revision bigint;
  ranking_value integer;
  qualifying_route_value text;
  best_euro_finish_value text;
  editorial_note_value text;
  saved_profile public.tournament_team_profiles%rowtype;
begin
  perform private.euro28_require_tournament_owner(p_tournament_id, current_user_id);

  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception using errcode = '22023', message = 'Expected profile revision must be zero or greater';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'Team profile payload must be a JSON object';
  end if;

  if not exists (
    select 1
    from public.tournament_teams tournament_team
    where tournament_team.tournament_id = p_tournament_id
      and tournament_team.id = p_tournament_team_id
  ) then
    raise exception using errcode = 'P0002', message = 'Tournament team was not found';
  end if;

  if nullif(btrim(coalesce(p_payload ->> 'ranking', '')), '') is not null
     and btrim(p_payload ->> 'ranking') !~ '^[0-9]+$' then
    raise exception using errcode = '22023', message = 'Ranking must be a whole number between 1 and 300';
  end if;

  ranking_value := nullif(btrim(coalesce(p_payload ->> 'ranking', '')), '')::integer;
  qualifying_route_value := nullif(regexp_replace(btrim(coalesce(p_payload ->> 'qualifying_route', '')), '[[:space:]]+', ' ', 'g'), '');
  best_euro_finish_value := nullif(regexp_replace(btrim(coalesce(p_payload ->> 'best_euro_finish', '')), '[[:space:]]+', ' ', 'g'), '');
  editorial_note_value := nullif(regexp_replace(btrim(coalesce(p_payload ->> 'editorial_note', '')), '[[:space:]]+', ' ', 'g'), '');

  if ranking_value is not null and (ranking_value < 1 or ranking_value > 300) then
    raise exception using errcode = '22023', message = 'Ranking must be between 1 and 300';
  end if;
  if qualifying_route_value is not null and char_length(qualifying_route_value) not between 2 and 180 then
    raise exception using errcode = '22023', message = 'Qualifying route must be between 2 and 180 characters';
  end if;
  if best_euro_finish_value is not null and char_length(best_euro_finish_value) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'Best Euro finish must be between 2 and 120 characters';
  end if;
  if editorial_note_value is not null and char_length(editorial_note_value) not between 10 and 700 then
    raise exception using errcode = '22023', message = 'Editorial note must be between 10 and 700 characters';
  end if;

  select * into current_profile
  from public.tournament_team_profiles profile
  where profile.tournament_id = p_tournament_id
    and profile.tournament_team_id = p_tournament_team_id
  for update;

  if found then
    if current_profile.profile_revision <> p_expected_revision then
      raise exception using errcode = '40001', message = 'Team profile changed since it was loaded; refresh before saving';
    end if;
    next_revision := current_profile.profile_revision + 1;

    update public.tournament_team_profiles profile
    set
      ranking = ranking_value,
      qualifying_route = qualifying_route_value,
      best_euro_finish = best_euro_finish_value,
      editorial_note = editorial_note_value,
      profile_revision = next_revision,
      updated_by_user_id = current_user_id
    where profile.tournament_id = p_tournament_id
      and profile.tournament_team_id = p_tournament_team_id
    returning * into saved_profile;
  else
    if p_expected_revision <> 0 then
      raise exception using errcode = '40001', message = 'Team profile changed since it was loaded; refresh before saving';
    end if;
    next_revision := 1;

    insert into public.tournament_team_profiles (
      tournament_id,
      tournament_team_id,
      ranking,
      qualifying_route,
      best_euro_finish,
      editorial_note,
      profile_revision,
      updated_by_user_id
    ) values (
      p_tournament_id,
      p_tournament_team_id,
      ranking_value,
      qualifying_route_value,
      best_euro_finish_value,
      editorial_note_value,
      next_revision,
      current_user_id
    )
    returning * into saved_profile;
  end if;

  insert into public.admin_operation_events (
    tournament_id,
    performed_by_user_id,
    operation_type,
    note,
    payload
  ) values (
    p_tournament_id,
    current_user_id,
    'team_profile_updated',
    normalised_note,
    jsonb_build_object(
      'tournament_team_id', p_tournament_team_id,
      'profile_revision', saved_profile.profile_revision,
      'ranking', saved_profile.ranking,
      'qualifying_route', saved_profile.qualifying_route,
      'best_euro_finish', saved_profile.best_euro_finish,
      'editorial_note', saved_profile.editorial_note
    )
  );

  return jsonb_build_object(
    'tournament_team_id', saved_profile.tournament_team_id,
    'ranking', saved_profile.ranking,
    'qualifying_route', saved_profile.qualifying_route,
    'best_euro_finish', saved_profile.best_euro_finish,
    'editorial_note', saved_profile.editorial_note,
    'profile_revision', saved_profile.profile_revision,
    'updated_at', saved_profile.updated_at
  );
end;
$$;

revoke all on function public.get_team_profile_sheet(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_list_team_profiles(uuid) from public, anon, authenticated;
revoke all on function public.admin_upsert_team_profile(uuid, uuid, bigint, jsonb, text) from public, anon, authenticated;

grant execute on function public.get_team_profile_sheet(uuid, uuid) to anon, authenticated;
grant execute on function public.admin_list_team_profiles(uuid) to authenticated;
grant execute on function public.admin_upsert_team_profile(uuid, uuid, bigint, jsonb, text) to authenticated;

grant execute on function public.get_team_profile_sheet(uuid, uuid) to service_role;
grant execute on function public.admin_list_team_profiles(uuid) to service_role;
grant execute on function public.admin_upsert_team_profile(uuid, uuid, bigint, jsonb, text) to service_role;

commit;
