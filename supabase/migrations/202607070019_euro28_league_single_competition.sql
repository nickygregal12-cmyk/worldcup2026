-- Euro 2028 leagues become single-competition entities.
--
-- Every league now belongs to exactly one competition (Original Predictor or
-- KO Predictor), fixed at creation. Existing leagues backfill as 'original'
-- since KO leagues never existed as a separate concept before this change --
-- that is correct backfill, not data loss. Joining a league no longer
-- requires or accepts a competition choice: it naturally joins whichever
-- competition the league already belongs to. KO Predictor leagues cannot be
-- created until at least one real Round of 16 fixture has resolved
-- participants -- the same "early access" boundary the KO Predictor itself
-- opens on -- enforced here as the authoritative gate, not just hidden in UI.

begin;

alter table public.leagues
  add column competition text not null default 'original';

alter table public.leagues
  add constraint leagues_competition_is_known
  check (competition in ('original', 'ko_predictor'));

alter table public.leagues
  alter column competition drop default;

comment on column public.leagues.competition is
  'Fixed at creation: original or ko_predictor. A league belongs to exactly one competition; a group wanting both creates two separate leagues.';

create or replace function private.euro28_ko_predictor_early_access(p_tournament_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.matches match_row
    join public.tournament_stages stage on stage.id = match_row.stage_id
    where match_row.tournament_id = p_tournament_id
      and stage.code = 'round_of_16'
      and (
        select count(*) filter (where slot.resolved_tournament_team_id is not null)
        from public.match_slots slot
        where slot.match_id = match_row.id
      ) = 2
  );
$$;

comment on function private.euro28_ko_predictor_early_access(uuid) is
  'True once at least one real Round of 16 fixture has both participants resolved -- the same boundary the KO Predictor itself opens on (buildKoReadiness().earlyAccess in src/app/koReadiness.js). Reads already-resolved match_slots rather than duplicating resolver logic.';

drop function if exists public.create_my_league(uuid, text);

create or replace function public.create_my_league(
  p_tournament_id uuid,
  p_name text,
  p_competition text
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

  if p_competition not in ('original', 'ko_predictor') then
    raise exception using errcode = '22023', message = 'Competition must be original or ko_predictor';
  end if;

  if p_competition = 'ko_predictor' and not private.euro28_ko_predictor_early_access(p_tournament_id) then
    raise exception using errcode = '22023', message = 'KO Predictor leagues cannot be created until a real knockout fixture is known';
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
        competition,
        created_by_user_id
      ) values (
        p_tournament_id,
        normalised_name,
        generated_code,
        p_competition,
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
    'competition', league_row.competition,
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
    'competition', league_row.competition,
    'member_role', membership.member_role,
    'member_count', (
      select count(*) from public.league_members member_count
      where member_count.league_id = league_row.id
    )
  );
end;
$$;

drop function if exists public.get_my_leagues(uuid);

create or replace function public.get_my_leagues(p_tournament_id uuid)
returns table (
  league_id uuid,
  league_name text,
  join_code text,
  competition text,
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
    league.competition,
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
  group by league.id, league.name, league.join_code, league.competition, membership.member_role, league.created_at
  order by league.created_at, league.name, league.id;
end;
$$;

revoke all on function private.euro28_ko_predictor_early_access(uuid) from public, anon, authenticated;

revoke all on function public.create_my_league(uuid, text, text) from public, anon, authenticated;
grant execute on function public.create_my_league(uuid, text, text) to authenticated;

revoke all on function public.get_my_leagues(uuid) from public, anon, authenticated;
grant execute on function public.get_my_leagues(uuid) to authenticated;

commit;
