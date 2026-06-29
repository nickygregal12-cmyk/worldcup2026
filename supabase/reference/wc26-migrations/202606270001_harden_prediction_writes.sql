-- Harden tournament writes with server-time locks and ownership checks.
-- Apply with `npx supabase db push` (linked project) or paste into the Supabase SQL Editor.
-- Safe to run repeatedly.

create or replace function public.request_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.role(), '') = 'service_role'
    or (auth.role() is null and session_user in ('postgres', 'supabase_admin'))
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and is_admin = true
    );
$$;

revoke all on function public.request_is_admin() from public;
grant execute on function public.request_is_admin() to authenticated, service_role;

create or replace function public.enforce_score_prediction_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_user_id public.predictions.user_id%type;
  row_match_id public.matches.id%type;
  kickoff timestamptz;
  joker_count integer;
  new_row jsonb;
  old_row jsonb;
begin
  if public.request_is_admin() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  new_row := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  old_row := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  row_user_id := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  row_match_id := case when tg_op = 'DELETE' then old.match_id else new.match_id end;

  if auth.uid() is null or row_user_id is distinct from auth.uid() then
    raise exception 'You can only change your own predictions';
  end if;

  if tg_op = 'UPDATE' and (
    new.user_id is distinct from old.user_id
    or new.match_id is distinct from old.match_id
  ) then
    raise exception 'Prediction ownership and match cannot be changed';
  end if;

  -- Points are calculated by trusted server functions, never by the browser.
  if tg_op = 'INSERT'
    and coalesce((new_row ->> 'points_awarded')::numeric, 0) <> 0
  then
    raise exception 'Prediction points are server managed';
  end if;

  if tg_op = 'UPDATE' and (
    new_row -> 'points_awarded' is distinct from old_row -> 'points_awarded'
    or new_row -> 'points_breakdown' is distinct from old_row -> 'points_breakdown'
  ) then
    raise exception 'Prediction points are server managed';
  end if;

  select kickoff_time into kickoff
  from public.matches
  where id = row_match_id;

  if kickoff is null then
    raise exception 'Match not found';
  end if;

  if now() >= kickoff then
    raise exception 'This prediction is locked because the match has kicked off';
  end if;

  -- Serialise joker changes per user so two near-simultaneous requests cannot
  -- both pass the count check.
  perform pg_advisory_xact_lock(hashtext(row_user_id::text));

  if tg_op <> 'DELETE'
    and tg_table_name = 'predictions'
    and coalesce((new_row ->> 'is_confident')::boolean, false)
  then
    if tg_op = 'INSERT' then
      select count(*) into joker_count
      from public.predictions
      where user_id = new.user_id and is_confident = true;
    else
      select count(*) into joker_count
      from public.predictions
      where user_id = new.user_id and is_confident = true and id <> old.id;
    end if;

    if joker_count >= 8 then
      raise exception 'Maximum of 8 group-stage jokers reached';
    end if;
  end if;

  if tg_op <> 'DELETE'
    and tg_table_name = 'ko_predictions'
    and coalesce((new_row ->> 'is_joker')::boolean, false)
  then
    if tg_op = 'INSERT' then
      select count(*) into joker_count
      from public.ko_predictions
      where user_id = new.user_id and is_joker = true;
    else
      select count(*) into joker_count
      from public.ko_predictions
      where user_id = new.user_id and is_joker = true and id <> old.id;
    end if;

    if joker_count >= 5 then
      raise exception 'Maximum of 5 KO Predictor jokers reached';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.enforce_score_prediction_write() from public;
grant execute on function public.enforce_score_prediction_write() to authenticated, service_role;

drop trigger if exists predictions_server_lock on public.predictions;
create trigger predictions_server_lock
before insert or update or delete on public.predictions
for each row execute function public.enforce_score_prediction_write();

drop trigger if exists ko_predictions_server_lock on public.ko_predictions;
create trigger ko_predictions_server_lock
before insert or update or delete on public.ko_predictions
for each row execute function public.enforce_score_prediction_write();

-- Protect the main tournament bracket. Normal users may edit only their own
-- bracket and the whole bracket hard-locks after MD1. An admin can explicitly
-- unlock an existing row once; the next user save consumes that unlock.
create or replace function public.enforce_knockout_pick_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_user_id public.knockout_picks.user_id%type;
  bracket_lock timestamptz;
  md1_match_count integer;
  md1_group_count integer;
  was_unlocked boolean := false;
  expected_stage text;
begin
  if public.request_is_admin() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  row_user_id := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  if auth.uid() is null or row_user_id is distinct from auth.uid() then
    raise exception 'You can only change your own knockout bracket';
  end if;

  if tg_op = 'UPDATE' and (
    new.user_id is distinct from old.user_id
    or new.match_number is distinct from old.match_number
  ) then
    raise exception 'Bracket ownership and match cannot be changed';
  end if;

  if tg_op <> 'INSERT' then
    was_unlocked := coalesce(old.is_unlocked, false);
  end if;

  if tg_op <> 'DELETE' then
    if coalesce(new.is_unlocked, false) and not was_unlocked then
      raise exception 'Only an admin can unlock a bracket pick';
    end if;

    expected_stage := case
      when new.match_number between 73 and 88 then 'r32'
      when new.match_number between 89 and 96 then 'r16'
      when new.match_number between 97 and 100 then 'qf'
      when new.match_number between 101 and 102 then 'sf'
      when new.match_number = 103 then '3rd'
      when new.match_number = 104 then 'final'
      else null
    end;

    if expected_stage is null then
      raise exception 'Invalid knockout match number';
    end if;

    new.stage := expected_stage;
    new.bracket_version := 'fifa_v2';
    new.team_id := new.winner_team_id;

    if new.home_team_id is not null
      and new.away_team_id is not null
      and new.winner_team_id is distinct from new.home_team_id
      and new.winner_team_id is distinct from new.away_team_id
    then
      raise exception 'Winner must be one of the teams in the predicted match';
    end if;
  end if;

  select
    max(kickoff_time) + interval '2 hours',
    count(*),
    count(distinct group_id)
  into bracket_lock, md1_match_count, md1_group_count
  from (
    select group_id, kickoff_time,
      row_number() over (partition by group_id order by kickoff_time) as group_match_number
    from public.matches
    where stage = 'group'
      and group_id is not null
      and kickoff_time is not null
  ) md1
  where group_match_number <= 2;

  if md1_match_count < 24 or md1_group_count < 12 then
    bracket_lock := '2026-06-18T06:00:00Z'::timestamptz;
  else
    bracket_lock := coalesce(bracket_lock, '2026-06-18T06:00:00Z'::timestamptz);
  end if;

  if now() >= bracket_lock and not was_unlocked then
    raise exception 'The main knockout bracket is locked';
  end if;

  if tg_op = 'UPDATE' and was_unlocked then
    new.is_unlocked := false;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.enforce_knockout_pick_write() from public;
grant execute on function public.enforce_knockout_pick_write() to authenticated, service_role;

drop trigger if exists knockout_picks_server_lock on public.knockout_picks;
create trigger knockout_picks_server_lock
before insert or update or delete on public.knockout_picks
for each row execute function public.enforce_knockout_pick_write();

-- Users can edit ordinary profile preferences, but cannot promote themselves,
-- unban themselves or alter scoring fields even if a broad RLS update policy exists.
create or replace function public.enforce_profile_managed_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  managed_key text;
  managed_keys constant text[] := array[
    'is_admin', 'admin_level', 'is_banned', 'lock_bypass',
    'display_name_locked', 'total_points', 'group_position_points',
    'bracket_points', 'ko_points', 'exact_scores', 'streak_current',
    'streak_best', 'perfect_rounds', 'prediction_accuracy',
    'total_predictions', 'ko_streak_current', 'ko_exact_scores',
    'rank_at_kickoff', 'rank_snapshot_taken_at'
  ];
begin
  if public.request_is_admin() then
    return new;
  end if;

  if auth.uid() is null or new.id is distinct from auth.uid() or new.id is distinct from old.id then
    raise exception 'You can only update your own profile';
  end if;

  foreach managed_key in array managed_keys loop
    if to_jsonb(new) -> managed_key is distinct from to_jsonb(old) -> managed_key then
      raise exception 'Profile field % is server managed', managed_key;
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function public.enforce_profile_managed_fields() from public;
grant execute on function public.enforce_profile_managed_fields() to authenticated, service_role;

drop trigger if exists profiles_managed_fields_lock on public.profiles;
create trigger profiles_managed_fields_lock
before update on public.profiles
for each row execute function public.enforce_profile_managed_fields();

-- Match results and fixture details are always admin/server managed.
create or replace function public.enforce_admin_only_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.request_is_admin() then
    raise exception 'Admin access required';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.enforce_admin_only_write() from public;
grant execute on function public.enforce_admin_only_write() to authenticated, service_role;

drop trigger if exists matches_admin_write_lock on public.matches;
create trigger matches_admin_write_lock
before insert or update or delete on public.matches
for each row execute function public.enforce_admin_only_write();

-- Atomically transfer an offline player to an authenticated account. This is
-- callable only through the server-side service role, allowing legitimate old
-- predictions to be copied after kickoff without opening a browser bypass.
create or replace function public.claim_offline_player(
  p_claim_token text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_player public.offline_players%rowtype;
  group_prediction_count integer := 0;
  knockout_pick_count integer := 0;
  ko_pick record;
begin
  if p_user_id is null then
    raise exception 'Authenticated user is required';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'User account not found';
  end if;

  select *
  into claimed_player
  from public.offline_players
  where claim_token = p_claim_token
    and claim_token_expires is not null
    and claim_token_expires > now()
  for update;

  if not found then
    raise exception 'This claim link is invalid, expired or has already been used';
  end if;

  insert into public.predictions (
    user_id, match_id, home_score, away_score, is_confident, bracket_type
  )
  select
    p_user_id,
    offline_prediction.match_id,
    offline_prediction.home_score,
    offline_prediction.away_score,
    coalesce(offline_prediction.is_confident, false),
    'main'
  from public.offline_predictions offline_prediction
  join public.matches match_row on match_row.id = offline_prediction.match_id
  where offline_prediction.offline_player_id = claimed_player.id
    and match_row.stage = 'group'
    and offline_prediction.home_score is not null
    and offline_prediction.away_score is not null
  on conflict (user_id, match_id, bracket_type)
  do update set
    home_score = excluded.home_score,
    away_score = excluded.away_score,
    is_confident = excluded.is_confident;

  get diagnostics group_prediction_count = row_count;

  for ko_pick in
    select
      match_row.match_number,
      match_row.stage,
      match_row.home_team_id,
      match_row.away_team_id,
      offline_prediction.picked_team_id
    from public.offline_predictions offline_prediction
    join public.matches match_row on match_row.id = offline_prediction.match_id
    where offline_prediction.offline_player_id = claimed_player.id
      and match_row.stage in ('r32', 'r16', 'qf', 'sf', '3rd', 'final')
      and offline_prediction.picked_team_id is not null
  loop
    update public.knockout_picks
    set
      stage = ko_pick.stage,
      team_id = ko_pick.picked_team_id,
      winner_team_id = ko_pick.picked_team_id,
      home_team_id = ko_pick.home_team_id,
      away_team_id = ko_pick.away_team_id,
      bracket_version = 'fifa_v2',
      is_unlocked = false
    where user_id = p_user_id
      and match_number = ko_pick.match_number;

    if not found then
      insert into public.knockout_picks (
        user_id, match_number, stage, team_id, winner_team_id,
        home_team_id, away_team_id, bracket_version, is_unlocked
      ) values (
        p_user_id, ko_pick.match_number, ko_pick.stage,
        ko_pick.picked_team_id, ko_pick.picked_team_id,
        ko_pick.home_team_id, ko_pick.away_team_id, 'fifa_v2', false
      );
    end if;

    knockout_pick_count := knockout_pick_count + 1;
  end loop;

  insert into public.league_members (league_id, user_id)
  values (claimed_player.league_id, p_user_id)
  on conflict (league_id, user_id) do nothing;

  delete from public.offline_predictions
  where offline_player_id = claimed_player.id;

  delete from public.offline_players
  where id = claimed_player.id;

  return jsonb_build_object(
    'displayName', claimed_player.display_name,
    'leagueId', claimed_player.league_id,
    'groupPredictions', group_prediction_count,
    'knockoutPicks', knockout_pick_count
  );
end;
$$;

revoke all on function public.claim_offline_player(text, uuid) from public;
revoke all on function public.claim_offline_player(text, uuid) from anon, authenticated;
grant execute on function public.claim_offline_player(text, uuid) to service_role;
