-- WC26 final-settlement hardening.
--
-- This migration deliberately performs no UPDATE and no recalculation when it is
-- installed. Existing awarded points remain untouched. Future recalculations run
-- the previous production functions first, then apply only the difference for:
--   1. extra-time goals in the tournament goal total (shootout kicks excluded);
--   2. the +25 champion pick in league scoring, whose stored stage is `final`.

create or replace function public.wc26_goal_prediction_points(
  p_prediction integer,
  p_actual integer,
  p_exact_points integer default 15
)
returns integer
language sql
immutable
set search_path = public, pg_temp
as $function$
  select case
    when p_prediction is null or p_actual is null then 0
    when abs(p_prediction - p_actual) = 0 then coalesce(p_exact_points, 15)
    when abs(p_prediction - p_actual) <= 5 then 5
    when abs(p_prediction - p_actual) <= 10 then 3
    else 0
  end;
$function$;

create or replace function public.wc26_actual_tournament_goals()
returns integer
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_row_count integer;
  v_unique_count integer;
  v_goal_total integer;
begin
  select count(*), count(distinct match_number)
  into v_row_count, v_unique_count
  from public.matches
  where match_number between 1 and 104
    and status = 'completed';

  if v_row_count <> 104 or v_unique_count <> 104 then
    return null;
  end if;

  if exists (
    select 1
    from public.matches
    where match_number between 1 and 104
      and status = 'completed'
      and (
        home_score is null
        or away_score is null
        or (
          outcome_type in ('et', 'penalties')
          and (coalesce(aet_home_score, home_score_aet) is null
            or coalesce(aet_away_score, away_score_aet) is null)
        )
      )
  ) then
    return null;
  end if;

  select sum(
    case
      when outcome_type in ('et', 'penalties') then
        coalesce(aet_home_score, home_score_aet)
        + coalesce(aet_away_score, away_score_aet)
      else home_score + away_score
    end
  )::integer
  into v_goal_total
  from public.matches
  where match_number between 1 and 104
    and status = 'completed';

  return v_goal_total;
end;
$function$;

-- Keep the exact pre-fix production implementations available. The wrappers
-- below call them first, so established match/group/bracket/award points are not
-- reinterpreted by this migration.
alter function public.recalculate_user_total_points(uuid)
  rename to recalculate_user_total_points_before_final_fix;

alter function public.recalculate_league_points_safe(uuid)
  rename to recalculate_league_points_safe_before_final_fix;

create or replace function public.recalculate_user_total_points(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_old_goals integer;
  v_actual_goals integer;
  v_prediction integer;
  v_old_goal_points integer := 0;
  v_new_goal_points integer := 0;
  v_old_champion_points integer := 0;
  v_new_champion_points integer := 0;
  v_delta integer := 0;
  v_total_matches integer;
  v_completed_matches integer;
begin
  perform public.recalculate_user_total_points_before_final_fix(p_user_id);

  select count(*), count(*) filter (where status = 'completed')
  into v_total_matches, v_completed_matches
  from public.matches;

  select int_value
  into v_prediction
  from public.tournament_predictions
  where user_id = p_user_id
    and prediction_type = 'total_goals'
    and int_value is not null
  limit 1;

  -- Reconstruct exactly what the previous function awarded for total goals.
  if v_total_matches > 0 and v_completed_matches = v_total_matches then
    select coalesce(sum(home_score + away_score), 0)::integer
    into v_old_goals
    from public.matches
    where status = 'completed';

    v_old_goal_points := public.wc26_goal_prediction_points(v_prediction, v_old_goals, 15);
  end if;

  v_actual_goals := public.wc26_actual_tournament_goals();
  v_new_goal_points := public.wc26_goal_prediction_points(v_prediction, v_actual_goals, 15);

  -- Reconstruct the previous cross-join champion calculation, then replace it
  -- with one result tied to the actual final match number.
  select coalesce(sum(25), 0)::integer
  into v_old_champion_points
  from public.knockout_picks kp
  join public.matches m on m.stage = 'final'
  where kp.user_id = p_user_id
    and kp.stage = 'final'
    and m.status = 'completed'
    and kp.winner_team_id = m.winner_team_id;

  if exists (
    select 1
    from public.matches m
    join public.knockout_picks kp
      on kp.user_id = p_user_id
      and kp.match_number = m.match_number
      and kp.stage = 'final'
    where m.match_number = 104
      and m.stage = 'final'
      and m.status = 'completed'
      and m.winner_team_id is not null
      and kp.winner_team_id = m.winner_team_id
  ) then
    v_new_champion_points := 25;
  end if;

  v_delta := (v_new_goal_points - v_old_goal_points)
    + (v_new_champion_points - v_old_champion_points);

  if v_delta <> 0 then
    update public.profiles
    set total_points = coalesce(total_points, 0) + v_delta
    where id = p_user_id;

    -- The previous production function already writes the global total to every
    -- membership. Keep that result consistent until league-specific recalculation
    -- runs immediately afterwards in recalculate_all_points_safe().
    update public.league_members
    set league_points = coalesce(league_points, 0) + v_delta
    where user_id = p_user_id;
  end if;
end;
$function$;

create or replace function public.recalculate_league_points_safe(p_league_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_league public.leagues%rowtype;
  v_member record;
  v_use_snapshot boolean;
  v_exact_points integer;
  v_prediction integer;
  v_actual_goals integer;
  v_old_goals integer;
  v_old_goal_points integer;
  v_new_goal_points integer;
  v_old_champion_points integer;
  v_new_champion_points integer;
  v_total_matches integer;
  v_completed_matches integer;
  v_delta integer;
begin
  perform public.recalculate_league_points_safe_before_final_fix(p_league_id);

  select * into v_league
  from public.leagues
  where id = p_league_id;
  if not found then return; end if;

  v_use_snapshot := v_league.lock_type = 'pre_tournament'
    and v_league.snapshot_taken_at is not null;
  v_exact_points := coalesce((v_league.custom_scoring->>'goals_exact')::integer, 15);
  v_actual_goals := public.wc26_actual_tournament_goals();

  select count(*), count(*) filter (where status = 'completed')
  into v_total_matches, v_completed_matches
  from public.matches;

  if v_total_matches > 0 and v_completed_matches = v_total_matches then
    select coalesce(sum(home_score + away_score), 0)::integer
    into v_old_goals
    from public.matches
    where status = 'completed';
  else
    v_old_goals := null;
  end if;

  for v_member in
    select user_id from public.league_members where league_id = p_league_id
  loop
    v_prediction := null;
    v_old_champion_points := 0;
    v_new_champion_points := 0;

    if v_use_snapshot then
      select int_value into v_prediction
      from public.league_tournament_predictions
      where league_id = p_league_id
        and user_id = v_member.user_id
        and prediction_type = 'total_goals'
        and int_value is not null
      limit 1;

      select coalesce(sum(25), 0)::integer
      into v_old_champion_points
      from public.league_knockout_picks kp
      join public.matches m on m.stage = 'final'
      where kp.league_id = p_league_id
        and kp.user_id = v_member.user_id
        and kp.stage = 'winner'
        and m.status = 'completed'
        and kp.team_id = m.winner_team_id;

      if exists (
        select 1
        from public.matches m
        join public.league_knockout_picks kp
          on kp.league_id = p_league_id
          and kp.user_id = v_member.user_id
          and kp.match_number = m.match_number
          and kp.stage = 'final'
        where m.match_number = 104
          and m.stage = 'final'
          and m.status = 'completed'
          and m.winner_team_id is not null
          and kp.team_id = m.winner_team_id
      ) then
        v_new_champion_points := 25;
      end if;
    else
      select int_value into v_prediction
      from public.tournament_predictions
      where user_id = v_member.user_id
        and prediction_type = 'total_goals'
        and int_value is not null
      limit 1;

      select coalesce(sum(25), 0)::integer
      into v_old_champion_points
      from public.knockout_picks kp
      join public.matches m on m.stage = 'final'
      where kp.user_id = v_member.user_id
        and kp.stage = 'winner'
        and m.status = 'completed'
        and kp.team_id = m.winner_team_id;

      if exists (
        select 1
        from public.matches m
        join public.knockout_picks kp
          on kp.user_id = v_member.user_id
          and kp.match_number = m.match_number
          and kp.stage = 'final'
        where m.match_number = 104
          and m.stage = 'final'
          and m.status = 'completed'
          and m.winner_team_id is not null
          and kp.team_id = m.winner_team_id
      ) then
        v_new_champion_points := 25;
      end if;
    end if;

    v_old_goal_points := public.wc26_goal_prediction_points(v_prediction, v_old_goals, v_exact_points);
    v_new_goal_points := public.wc26_goal_prediction_points(v_prediction, v_actual_goals, v_exact_points);
    v_delta := (v_new_goal_points - v_old_goal_points)
      + (v_new_champion_points - v_old_champion_points);

    if v_delta <> 0 then
      update public.league_members
      set league_points = coalesce(league_points, 0) + v_delta
      where league_id = p_league_id
        and user_id = v_member.user_id;
    end if;
  end loop;
end;
$function$;

-- Read-only settlement report. It does not award or modify points.
create or replace function public.wc26_final_settlement_check()
returns table(check_name text, passed boolean, details text)
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  with tournament_matches as (
    select * from public.matches where match_number between 1 and 104
  ),
  final_match as (
    select * from tournament_matches where match_number = 104
  )
  select '104 unique fixtures',
    count(*) = 104 and count(distinct match_number) = 104,
    format('%s rows / %s unique match numbers', count(*), count(distinct match_number))
  from tournament_matches
  union all
  select 'all fixtures completed',
    count(*) = 104 and count(*) filter (where status = 'completed') = 104,
    format('%s of 104 completed', count(*) filter (where status = 'completed'))
  from tournament_matches
  union all
  select 'final result complete',
    count(*) = 1
      and bool_and(status = 'completed' and winner_team_id is not null
        and home_score is not null and away_score is not null),
    case when count(*) = 1 then 'Match 104 found' else format('%s match 104 rows found', count(*)) end
  from final_match
  union all
  select 'extra-time scores complete',
    count(*) filter (where outcome_type in ('et', 'penalties')
      and (coalesce(aet_home_score, home_score_aet) is null
        or coalesce(aet_away_score, away_score_aet) is null)) = 0,
    format('%s invalid extra-time results', count(*) filter (where outcome_type in ('et', 'penalties')
      and (coalesce(aet_home_score, home_score_aet) is null
        or coalesce(aet_away_score, away_score_aet) is null)))
  from tournament_matches
  union all
  select 'three award results recorded',
    count(distinct award_type) filter (where winner_name is not null and trim(winner_name) <> '') = 3,
    format('%s of 3 awards recorded', count(distinct award_type) filter (where winner_name is not null and trim(winner_name) <> ''))
  from public.award_results
  where award_type::text in ('golden_boot', 'golden_glove', 'player_of_tournament')
  union all
  select 'total goals available',
    public.wc26_actual_tournament_goals() is not null,
    coalesce(public.wc26_actual_tournament_goals()::text || ' goals including extra time', 'not ready');
$function$;

revoke all on function public.wc26_final_settlement_check() from public;
grant execute on function public.wc26_final_settlement_check() to authenticated;
