-- Euro 2028 private leagues and controlled shared prediction viewing.
--
-- One league membership list is shared across the product, but every standings
-- and prediction-viewing operation requires an explicit competition key.
-- Original Predictor and KO Predictor points are never combined.

begin;

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  join_code text not null,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, join_code),
  unique (id, tournament_id),
  check (char_length(name) between 3 and 40),
  check (name = btrim(name)),
  check (name !~ '[[:space:]]{2,}'),
  check (join_code ~ '^[A-Z0-9]{10}$')
);

comment on table public.leagues is
  'Private Euro league. One membership list supports separate Original Predictor and KO Predictor standings.';
comment on column public.leagues.join_code is
  'Private join code shown only through member-scoped RPCs.';

create table public.league_members (
  league_id uuid not null,
  tournament_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id),
  foreign key (league_id, tournament_id)
    references public.leagues(id, tournament_id) on delete cascade
);

comment on table public.league_members is
  'Private league membership shared by both competition-specific standings tables.';

create unique index league_members_one_owner_idx
  on public.league_members (league_id)
  where member_role = 'owner';

create index league_members_user_tournament_idx
  on public.league_members (user_id, tournament_id, joined_at);

create trigger leagues_set_updated_at
before update on public.leagues
for each row execute function public.set_updated_at();

create or replace function private.euro28_normalise_league_name(candidate text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  normalised text := regexp_replace(btrim(coalesce(candidate, '')), '[[:space:]]+', ' ', 'g');
begin
  if char_length(normalised) < 3 or char_length(normalised) > 40 then
    raise exception using errcode = '22023', message = 'League name must be between 3 and 40 characters';
  end if;

  if normalised !~ '^[[:alnum:]][[:alnum:] ._''&-]*[[:alnum:]]$' then
    raise exception using errcode = '22023', message = 'League name contains unsupported characters';
  end if;

  return normalised;
end;
$$;

alter table public.leagues
  add constraint leagues_name_is_canonical
  check (name = private.euro28_normalise_league_name(name));

create or replace function private.euro28_require_league_member(
  p_league_id uuid,
  p_user_id uuid
)
returns public.league_members
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  membership public.league_members%rowtype;
begin
  select member_row.* into membership
  from public.league_members member_row
  join public.leagues league on league.id = member_row.league_id
  where member_row.league_id = p_league_id
    and member_row.user_id = p_user_id
    and league.is_active = true;

  if membership.league_id is null then
    raise exception using errcode = '42501', message = 'League membership is required';
  end if;

  return membership;
end;
$$;

create or replace function private.euro28_guard_league_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  league_row public.leagues%rowtype;
begin
  select league.* into league_row
  from public.leagues league
  where league.id = new.league_id;

  if league_row.id is null then
    raise exception 'League does not exist';
  end if;

  if new.tournament_id <> league_row.tournament_id then
    raise exception 'League membership tournament does not match the league';
  end if;

  if new.member_role = 'owner' and new.user_id <> league_row.created_by_user_id then
    raise exception 'League owner membership must belong to the league creator';
  end if;

  return new;
end;
$$;

create trigger league_members_guard
before insert or update on public.league_members
for each row execute function private.euro28_guard_league_member();

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
  attempt integer;
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

create or replace function public.join_league_by_code(
  p_tournament_id uuid,
  p_join_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  normalised_code text := regexp_replace(upper(btrim(coalesce(p_join_code, ''))), '[^A-Z0-9]', '', 'g');
  league_row public.leagues%rowtype;
  membership public.league_members%rowtype;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;

  select league.* into league_row
  from public.leagues league
  where league.tournament_id = p_tournament_id
    and league.join_code = normalised_code
    and league.is_active = true;

  if league_row.id is null then
    raise exception using errcode = '22023', message = 'League code was not found';
  end if;

  insert into public.league_members (
    league_id,
    tournament_id,
    user_id,
    member_role
  ) values (
    league_row.id,
    league_row.tournament_id,
    caller_id,
    case when caller_id = league_row.created_by_user_id then 'owner' else 'member' end
  )
  on conflict (league_id, user_id) do nothing;

  select member_row.* into membership
  from public.league_members member_row
  where member_row.league_id = league_row.id
    and member_row.user_id = caller_id;

  return jsonb_build_object(
    'league_id', league_row.id,
    'tournament_id', league_row.tournament_id,
    'name', league_row.name,
    'join_code', league_row.join_code,
    'member_role', membership.member_role,
    'member_count', (
      select count(*) from public.league_members member_count
      where member_count.league_id = league_row.id
    )
  );
end;
$$;

create or replace function public.leave_my_league(p_league_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  membership public.league_members%rowtype;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;

  membership := private.euro28_require_league_member(p_league_id, caller_id);

  if membership.member_role = 'owner' then
    raise exception using errcode = '22023', message = 'The league owner must delete the league rather than leave it';
  end if;

  delete from public.league_members
  where league_id = p_league_id
    and user_id = caller_id;

  return jsonb_build_object('league_id', p_league_id, 'left', true);
end;
$$;

create or replace function public.delete_my_league(p_league_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  membership public.league_members%rowtype;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;

  membership := private.euro28_require_league_member(p_league_id, caller_id);

  if membership.member_role <> 'owner' then
    raise exception using errcode = '42501', message = 'Only the league owner can delete the league';
  end if;

  delete from public.leagues where id = p_league_id;

  return jsonb_build_object('league_id', p_league_id, 'deleted', true);
end;
$$;

create or replace function public.get_my_leagues(p_tournament_id uuid)
returns table (
  league_id uuid,
  league_name text,
  join_code text,
  member_role text,
  member_count bigint,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;

  return query
  select
    league.id,
    league.name,
    league.join_code,
    membership.member_role,
    count(all_members.user_id),
    league.created_at
  from public.league_members membership
  join public.leagues league
    on league.id = membership.league_id
   and league.tournament_id = membership.tournament_id
  join public.league_members all_members
    on all_members.league_id = league.id
  where membership.user_id = caller_id
    and membership.tournament_id = p_tournament_id
    and league.is_active = true
  group by league.id, league.name, league.join_code, membership.member_role, league.created_at
  order by league.created_at, league.name, league.id;
end;
$$;

create or replace function public.get_league_standings(
  p_league_id uuid,
  p_competition_key text
)
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  member_role text,
  match_points integer,
  bracket_points integer,
  total_points integer,
  scored_match_count integer,
  is_current_user boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_membership public.league_members%rowtype;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;

  if p_competition_key not in ('original', 'ko_predictor') then
    raise exception using errcode = '22023', message = 'Competition key is invalid';
  end if;

  caller_membership := private.euro28_require_league_member(p_league_id, caller_id);

  return query
  select
    dense_rank() over (
      order by coalesce(totals.total_points, 0) desc
    ) as rank,
    member_row.user_id,
    profile.display_name,
    member_row.member_role,
    coalesce(totals.match_points, 0),
    coalesce(totals.bracket_points, 0),
    coalesce(totals.total_points, 0),
    coalesce(totals.scored_match_count, 0),
    member_row.user_id = caller_id
  from public.league_members member_row
  join public.profiles profile on profile.id = member_row.user_id
  left join public.prediction_totals totals
    on totals.tournament_id = caller_membership.tournament_id
   and totals.user_id = member_row.user_id
   and totals.competition_key = p_competition_key
  where member_row.league_id = p_league_id
  order by coalesce(totals.total_points, 0) desc, lower(profile.display_name), member_row.user_id;
end;
$$;

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
      and tournament_row.prediction_locked_at <= clock_timestamp();

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
        (match_row.kickoff_at is not null and match_row.kickoff_at <= clock_timestamp())
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

create or replace function public.get_member_predictions_after_lock(
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
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;

  return private.euro28_build_shared_prediction_bundle(
    p_tournament_id,
    p_member_user_id,
    p_competition_key
  );
end;
$$;

create or replace function public.get_league_member_predictions(
  p_league_id uuid,
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
  caller_id uuid := auth.uid();
  caller_membership public.league_members%rowtype;
  target_membership public.league_members%rowtype;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;

  caller_membership := private.euro28_require_league_member(p_league_id, caller_id);
  target_membership := private.euro28_require_league_member(p_league_id, p_member_user_id);

  if target_membership.tournament_id <> caller_membership.tournament_id then
    raise exception 'League member tournament mismatch';
  end if;

  return private.euro28_build_shared_prediction_bundle(
    caller_membership.tournament_id,
    p_member_user_id,
    p_competition_key
  );
end;
$$;

alter table public.leagues enable row level security;
alter table public.league_members enable row level security;

revoke all on table public.leagues, public.league_members from public, anon, authenticated;
grant all on table public.leagues, public.league_members to service_role;

revoke all on function private.euro28_normalise_league_name(text) from public, anon, authenticated;
revoke all on function private.euro28_require_league_member(uuid, uuid) from public, anon, authenticated;
revoke all on function private.euro28_guard_league_member() from public, anon, authenticated;
revoke all on function private.euro28_build_shared_prediction_bundle(uuid, uuid, text) from public, anon, authenticated;

revoke all on function public.create_my_league(uuid, text) from public, anon, authenticated;
revoke all on function public.join_league_by_code(uuid, text) from public, anon, authenticated;
revoke all on function public.leave_my_league(uuid) from public, anon, authenticated;
revoke all on function public.delete_my_league(uuid) from public, anon, authenticated;
revoke all on function public.get_my_leagues(uuid) from public, anon, authenticated;
revoke all on function public.get_league_standings(uuid, text) from public, anon, authenticated;
revoke all on function public.get_member_predictions_after_lock(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.get_league_member_predictions(uuid, uuid, text) from public, anon, authenticated;

grant execute on function public.create_my_league(uuid, text) to authenticated;
grant execute on function public.join_league_by_code(uuid, text) to authenticated;
grant execute on function public.leave_my_league(uuid) to authenticated;
grant execute on function public.delete_my_league(uuid) to authenticated;
grant execute on function public.get_my_leagues(uuid) to authenticated;
grant execute on function public.get_league_standings(uuid, text) to authenticated;
grant execute on function public.get_member_predictions_after_lock(uuid, uuid, text) to authenticated;
grant execute on function public.get_league_member_predictions(uuid, uuid, text) to authenticated;

revoke insert, update, delete on table public.leagues, public.league_members from anon, authenticated;

alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

commit;
