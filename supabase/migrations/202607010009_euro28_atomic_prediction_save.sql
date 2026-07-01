-- Euro 2028 Stage 6: trusted atomic prediction saving.
--
-- Browsers retain SELECT-only table access. Authenticated writes are available
-- only through save_my_prediction_bundle(), which validates the complete
-- supplied bundle in one transaction.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.prediction_sets
  add column guest_imported_at timestamptz,
  add column last_save_source text not null default 'account'
    check (last_save_source in ('account', 'guest_import'));

comment on column public.prediction_sets.guest_imported_at is
  'Server timestamp of the latest explicit browser-only guest draft import.';
comment on column public.prediction_sets.last_save_source is
  'Source of the latest successful atomic bundle save.';

create or replace function private.euro28_prediction_rows(p_predictions jsonb)
returns table (
  match_id uuid,
  predicted_home_tournament_team_id uuid,
  predicted_away_tournament_team_id uuid,
  home_score_90 integer,
  away_score_90 integer,
  advancing_tournament_team_id uuid,
  decision_method text,
  joker_applied boolean
)
language sql
immutable
set search_path = ''
as $$
  select
    row_data.match_id,
    row_data.predicted_home_tournament_team_id,
    row_data.predicted_away_tournament_team_id,
    row_data.home_score_90,
    row_data.away_score_90,
    row_data.advancing_tournament_team_id,
    row_data.decision_method,
    coalesce(row_data.joker_applied, false)
  from jsonb_to_recordset(coalesce(p_predictions, '[]'::jsonb)) as row_data(
    match_id uuid,
    predicted_home_tournament_team_id uuid,
    predicted_away_tournament_team_id uuid,
    home_score_90 integer,
    away_score_90 integer,
    advancing_tournament_team_id uuid,
    decision_method text,
    joker_applied boolean
  );
$$;

create or replace function private.euro28_group_stats(
  p_tournament_id uuid,
  p_group_id uuid,
  p_predictions jsonb,
  p_scope uuid[] default null
)
returns table (
  team_id uuid,
  points integer,
  goal_difference integer,
  goals_for integer,
  wins integer,
  fair_play_points numeric,
  qualifier_rank numeric,
  stable_key text
)
language sql
stable
security definer
set search_path = ''
as $$
  with members as (
    select
      gm.tournament_team_id as team_id,
      gm.position_code as stable_key,
      case
        when coalesce(tt.metadata->>'fairPlayPoints', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
          then (tt.metadata->>'fairPlayPoints')::numeric
        else null
      end as fair_play_points,
      case
        when coalesce(tt.metadata->>'qualifierRank', '') ~ '^[0-9]+(\.[0-9]+)?$'
          then (tt.metadata->>'qualifierRank')::numeric
        else tt.display_order::numeric
      end as qualifier_rank
    from public.group_memberships gm
    join public.tournament_teams tt
      on tt.id = gm.tournament_team_id
     and tt.tournament_id = gm.tournament_id
    where gm.tournament_id = p_tournament_id
      and gm.group_id = p_group_id
      and (p_scope is null or gm.tournament_team_id = any(p_scope))
  ),
  predictions as (
    select prediction.*
    from private.euro28_prediction_rows(p_predictions) prediction
    join public.matches match_row
      on match_row.id = prediction.match_id
     and match_row.tournament_id = p_tournament_id
     and match_row.group_id = p_group_id
    where p_scope is null
       or (
         prediction.predicted_home_tournament_team_id = any(p_scope)
         and prediction.predicted_away_tournament_team_id = any(p_scope)
       )
  ),
  team_results as (
    select
      predicted_home_tournament_team_id as team_id,
      home_score_90 as goals_for,
      away_score_90 as goals_against,
      case when home_score_90 > away_score_90 then 3 when home_score_90 = away_score_90 then 1 else 0 end as points,
      case when home_score_90 > away_score_90 then 1 else 0 end as wins
    from predictions
    union all
    select
      predicted_away_tournament_team_id as team_id,
      away_score_90 as goals_for,
      home_score_90 as goals_against,
      case when away_score_90 > home_score_90 then 3 when home_score_90 = away_score_90 then 1 else 0 end as points,
      case when away_score_90 > home_score_90 then 1 else 0 end as wins
    from predictions
  )
  select
    members.team_id,
    coalesce(sum(team_results.points), 0)::integer as points,
    (coalesce(sum(team_results.goals_for), 0) - coalesce(sum(team_results.goals_against), 0))::integer as goal_difference,
    coalesce(sum(team_results.goals_for), 0)::integer as goals_for,
    coalesce(sum(team_results.wins), 0)::integer as wins,
    members.fair_play_points,
    members.qualifier_rank,
    members.stable_key
  from members
  left join team_results on team_results.team_id = members.team_id
  group by members.team_id, members.fair_play_points, members.qualifier_rank, members.stable_key;
$$;

create or replace function private.euro28_metric_partitions(
  p_tournament_id uuid,
  p_group_id uuid,
  p_predictions jsonb,
  p_team_ids uuid[],
  p_scope uuid[],
  p_metric text,
  p_direction text default 'desc',
  p_require_all boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
  missing_metric boolean;
begin
  if coalesce(array_length(p_team_ids, 1), 0) < 2 then
    return jsonb_build_array(to_jsonb(coalesce(p_team_ids, array[]::uuid[])));
  end if;
  if p_metric not in ('points', 'goal_difference', 'goals_for', 'wins', 'fair_play_points', 'qualifier_rank') then
    raise exception using errcode = '22023', message = 'Unsupported tournament resolver metric';
  end if;
  if p_direction not in ('asc', 'desc') then
    raise exception using errcode = '22023', message = 'Unsupported tournament resolver direction';
  end if;

  select exists (
    select 1
    from private.euro28_group_stats(p_tournament_id, p_group_id, p_predictions, p_scope) stats
    where stats.team_id = any(p_team_ids)
      and case p_metric
        when 'fair_play_points' then stats.fair_play_points
        when 'qualifier_rank' then stats.qualifier_rank
        else 0::numeric
      end is null
  ) into missing_metric;

  if p_require_all and missing_metric then
    return jsonb_build_array(to_jsonb(p_team_ids));
  end if;

  with metric_rows as (
    select
      stats.team_id,
      stats.stable_key,
      case p_metric
        when 'points' then stats.points::numeric
        when 'goal_difference' then stats.goal_difference::numeric
        when 'goals_for' then stats.goals_for::numeric
        when 'wins' then stats.wins::numeric
        when 'fair_play_points' then stats.fair_play_points
        when 'qualifier_rank' then stats.qualifier_rank
      end as metric_value
    from private.euro28_group_stats(p_tournament_id, p_group_id, p_predictions, p_scope) stats
    where stats.team_id = any(p_team_ids)
  ),
  buckets as (
    select metric_value, array_agg(team_id order by stable_key) as team_ids
    from metric_rows
    group by metric_value
  )
  select coalesce(
    jsonb_agg(
      to_jsonb(team_ids)
      order by
        case when p_direction = 'desc' then metric_value end desc nulls last,
        case when p_direction = 'asc' then metric_value end asc nulls last
    ),
    '[]'::jsonb
  ) into result
  from buckets;

  return result;
end;
$$;

create or replace function private.euro28_refine_group_partitions(
  p_tournament_id uuid,
  p_group_id uuid,
  p_predictions jsonb,
  p_partitions jsonb,
  p_scope uuid[],
  p_metric text,
  p_direction text default 'desc',
  p_require_all boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb := '[]'::jsonb;
  partition_value jsonb;
  bucket_value jsonb;
  team_ids uuid[];
  buckets jsonb;
begin
  for partition_value in select value from jsonb_array_elements(p_partitions)
  loop
    select coalesce(array_agg(value::uuid), array[]::uuid[])
    into team_ids
    from jsonb_array_elements_text(partition_value);

    if coalesce(array_length(team_ids, 1), 0) < 2 then
      result := result || jsonb_build_array(partition_value);
    else
      buckets := private.euro28_metric_partitions(
        p_tournament_id, p_group_id, p_predictions, team_ids, p_scope,
        p_metric, p_direction, p_require_all
      );
      for bucket_value in select value from jsonb_array_elements(buckets)
      loop
        result := result || jsonb_build_array(bucket_value);
      end loop;
    end if;
  end loop;
  return result;
end;
$$;

create or replace function private.euro28_head_to_head_partitions(
  p_tournament_id uuid,
  p_group_id uuid,
  p_predictions jsonb,
  p_team_ids uuid[]
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  partitions jsonb := jsonb_build_array(to_jsonb(p_team_ids));
  refined jsonb := '[]'::jsonb;
  partition_value jsonb;
  recursive_value jsonb;
  subset uuid[];
begin
  if coalesce(array_length(p_team_ids, 1), 0) < 2 then
    return partitions;
  end if;

  partitions := private.euro28_refine_group_partitions(p_tournament_id, p_group_id, p_predictions, partitions, p_team_ids, 'points');
  partitions := private.euro28_refine_group_partitions(p_tournament_id, p_group_id, p_predictions, partitions, p_team_ids, 'goal_difference');
  partitions := private.euro28_refine_group_partitions(p_tournament_id, p_group_id, p_predictions, partitions, p_team_ids, 'goals_for');

  if jsonb_array_length(partitions) = 1 then
    return jsonb_build_array(to_jsonb(p_team_ids));
  end if;

  for partition_value in select value from jsonb_array_elements(partitions)
  loop
    select coalesce(array_agg(value::uuid), array[]::uuid[])
    into subset
    from jsonb_array_elements_text(partition_value);

    if coalesce(array_length(subset, 1), 0) < 2 then
      refined := refined || jsonb_build_array(partition_value);
    else
      for recursive_value in
        select value from jsonb_array_elements(
          private.euro28_head_to_head_partitions(p_tournament_id, p_group_id, p_predictions, subset)
        )
      loop
        refined := refined || jsonb_build_array(recursive_value);
      end loop;
    end if;
  end loop;

  return refined;
end;
$$;

create or replace function private.euro28_group_order(
  p_tournament_id uuid,
  p_group_id uuid,
  p_predictions jsonb
)
returns uuid[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  all_team_ids uuid[];
  points_partitions jsonb;
  partitions jsonb := '[]'::jsonb;
  partition_value jsonb;
  bucket_value jsonb;
  team_ids uuid[];
  final_ids uuid[] := array[]::uuid[];
begin
  select array_agg(stats.team_id order by stats.stable_key)
  into all_team_ids
  from private.euro28_group_stats(p_tournament_id, p_group_id, p_predictions, null) stats;

  points_partitions := private.euro28_metric_partitions(
    p_tournament_id, p_group_id, p_predictions, all_team_ids, null, 'points'
  );

  for partition_value in select value from jsonb_array_elements(points_partitions)
  loop
    select coalesce(array_agg(value::uuid), array[]::uuid[])
    into team_ids
    from jsonb_array_elements_text(partition_value);

    if coalesce(array_length(team_ids, 1), 0) < 2 then
      partitions := partitions || jsonb_build_array(partition_value);
    else
      for bucket_value in select value from jsonb_array_elements(
        private.euro28_head_to_head_partitions(p_tournament_id, p_group_id, p_predictions, team_ids)
      )
      loop
        partitions := partitions || jsonb_build_array(bucket_value);
      end loop;
    end if;
  end loop;

  partitions := private.euro28_refine_group_partitions(p_tournament_id, p_group_id, p_predictions, partitions, null, 'goal_difference');
  partitions := private.euro28_refine_group_partitions(p_tournament_id, p_group_id, p_predictions, partitions, null, 'goals_for');
  partitions := private.euro28_refine_group_partitions(p_tournament_id, p_group_id, p_predictions, partitions, null, 'wins');
  partitions := private.euro28_refine_group_partitions(p_tournament_id, p_group_id, p_predictions, partitions, null, 'fair_play_points', 'asc', true);
  partitions := private.euro28_refine_group_partitions(p_tournament_id, p_group_id, p_predictions, partitions, null, 'qualifier_rank', 'asc', true);

  for partition_value in select value from jsonb_array_elements(partitions)
  loop
    select array_agg(stats.team_id order by stats.stable_key)
    into team_ids
    from jsonb_array_elements_text(partition_value) member
    join private.euro28_group_stats(p_tournament_id, p_group_id, p_predictions, null) stats
      on stats.team_id = member.value::uuid;
    final_ids := final_ids || coalesce(team_ids, array[]::uuid[]);
  end loop;

  return final_ids;
end;
$$;

create or replace function private.euro28_best_third_rows(
  p_tournament_id uuid,
  p_predictions jsonb
)
returns table (
  group_code text,
  team_id uuid,
  points integer,
  goal_difference integer,
  goals_for integer,
  wins integer,
  fair_play_points numeric,
  qualifier_rank numeric,
  stable_key text
)
language sql
stable
security definer
set search_path = ''
as $$
  with group_orders as (
    select
      group_row.id as group_id,
      group_row.code as group_code,
      private.euro28_group_order(p_tournament_id, group_row.id, p_predictions) as ordered_ids
    from public.groups group_row
    where group_row.tournament_id = p_tournament_id
  )
  select
    group_orders.group_code,
    stats.team_id,
    stats.points,
    stats.goal_difference,
    stats.goals_for,
    stats.wins,
    stats.fair_play_points,
    stats.qualifier_rank,
    stats.stable_key
  from group_orders
  join lateral private.euro28_group_stats(p_tournament_id, group_orders.group_id, p_predictions, null) stats
    on stats.team_id = group_orders.ordered_ids[3];
$$;

create or replace function private.euro28_best_third_order(
  p_tournament_id uuid,
  p_predictions jsonb
)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select array_agg(team_id order by
    points desc,
    goal_difference desc,
    goals_for desc,
    wins desc,
    fair_play_points asc nulls last,
    qualifier_rank asc nulls last,
    stable_key asc
  )
  from private.euro28_best_third_rows(p_tournament_id, p_predictions);
$$;

create or replace function private.euro28_best_third_group(
  p_target_group_winner text,
  p_combination text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_target_group_winner
    when 'B' then case p_combination
      when 'ABCD' then 'A' when 'ABCE' then 'A' when 'ABCF' then 'A' when 'ABDE' then 'D' when 'ABDF' then 'D'
      when 'ABEF' then 'E' when 'ACDE' then 'E' when 'ACDF' then 'F' when 'ACEF' then 'E' when 'ADEF' then 'E'
      when 'BCDE' then 'E' when 'BCDF' then 'F' when 'BCEF' then 'F' when 'BDEF' then 'F' when 'CDEF' then 'F' end
    when 'C' then case p_combination
      when 'ABCD' then 'D' when 'ABCE' then 'E' when 'ABCF' then 'F' when 'ABDE' then 'E' when 'ABDF' then 'F'
      when 'ABEF' then 'F' when 'ACDE' then 'D' when 'ACDF' then 'D' when 'ACEF' then 'F' when 'ADEF' then 'F'
      when 'BCDE' then 'D' when 'BCDF' then 'D' when 'BCEF' then 'E' when 'BDEF' then 'E' when 'CDEF' then 'E' end
    when 'F' then case p_combination
      when 'ABCD' then 'C' when 'ABCE' then 'C' when 'ABCF' then 'C' when 'ABDE' then 'B' when 'ABDF' then 'B'
      when 'ABEF' then 'A' when 'ACDE' then 'A' when 'ACDF' then 'A' when 'ACEF' then 'A' when 'ADEF' then 'A'
      when 'BCDE' then 'C' when 'BCDF' then 'B' when 'BCEF' then 'B' when 'BDEF' then 'B' when 'CDEF' then 'C' end
    when 'E' then case p_combination
      when 'ABCD' then 'B' when 'ABCE' then 'B' when 'ABCF' then 'B' when 'ABDE' then 'A' when 'ABDF' then 'A'
      when 'ABEF' then 'B' when 'ACDE' then 'C' when 'ACDF' then 'C' when 'ACEF' then 'C' when 'ADEF' then 'D'
      when 'BCDE' then 'B' when 'BCDF' then 'C' when 'BCEF' then 'C' when 'BDEF' then 'D' when 'CDEF' then 'D' end
  end;
$$;

create or replace function private.euro28_expected_knockout_participants(
  p_tournament_id uuid,
  p_predictions jsonb
)
returns table (
  match_id uuid,
  match_number integer,
  home_team_id uuid,
  away_team_id uuid,
  participants_resolved boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  group_orders jsonb := '{}'::jsonb;
  third_rows jsonb := '{}'::jsonb;
  third_order uuid[];
  combination text;
  group_row record;
  team uuid;
  n integer;
  home_id uuid;
  away_id uuid;
  home_source integer;
  away_source integer;
  target_group text;
begin
  for group_row in
    select id, code from public.groups where tournament_id = p_tournament_id order by sequence
  loop
    group_orders := group_orders || jsonb_build_object(
      group_row.code,
      to_jsonb(private.euro28_group_order(p_tournament_id, group_row.id, p_predictions))
    );
  end loop;

  third_order := private.euro28_best_third_order(p_tournament_id, p_predictions);
  if coalesce(array_length(third_order, 1), 0) >= 4 then
    for n in 1..4 loop
      select rows.group_code into target_group
      from private.euro28_best_third_rows(p_tournament_id, p_predictions) rows
      where rows.team_id = third_order[n];
      third_rows := third_rows || jsonb_build_object(target_group, third_order[n]);
    end loop;
    select string_agg(key, '' order by key) into combination
    from jsonb_object_keys(third_rows) key;
  end if;

  for n in 37..51 loop
    home_id := null;
    away_id := null;
    home_source := null;
    away_source := null;
    target_group := null;

    case n
      when 37 then home_id := (group_orders->'A'->>0)::uuid; away_id := (group_orders->'C'->>1)::uuid;
      when 38 then home_id := (group_orders->'A'->>1)::uuid; away_id := (group_orders->'B'->>1)::uuid;
      when 39 then home_id := (group_orders->'B'->>0)::uuid; target_group := 'B';
      when 40 then home_id := (group_orders->'C'->>0)::uuid; target_group := 'C';
      when 41 then home_id := (group_orders->'F'->>0)::uuid; target_group := 'F';
      when 42 then home_id := (group_orders->'D'->>1)::uuid; away_id := (group_orders->'E'->>1)::uuid;
      when 43 then home_id := (group_orders->'D'->>0)::uuid; away_id := (group_orders->'F'->>1)::uuid;
      when 44 then home_id := (group_orders->'E'->>0)::uuid; target_group := 'E';
      when 45 then home_source := 39; away_source := 37;
      when 46 then home_source := 41; away_source := 42;
      when 47 then home_source := 44; away_source := 43;
      when 48 then home_source := 40; away_source := 38;
      when 49 then home_source := 45; away_source := 46;
      when 50 then home_source := 47; away_source := 48;
      when 51 then home_source := 49; away_source := 50;
    end case;

    if target_group is not null and combination is not null then
      away_id := (third_rows->>private.euro28_best_third_group(target_group, combination))::uuid;
    end if;

    if home_source is not null then
      select prediction.advancing_tournament_team_id into home_id
      from private.euro28_prediction_rows(p_predictions) prediction
      join public.matches source_match on source_match.id = prediction.match_id
      where source_match.tournament_id = p_tournament_id and source_match.match_number = home_source;
    end if;
    if away_source is not null then
      select prediction.advancing_tournament_team_id into away_id
      from private.euro28_prediction_rows(p_predictions) prediction
      join public.matches source_match on source_match.id = prediction.match_id
      where source_match.tournament_id = p_tournament_id and source_match.match_number = away_source;
    end if;

    return query
    select m.id, m.match_number, home_id, away_id, home_id is not null and away_id is not null
    from public.matches m
    where m.tournament_id = p_tournament_id and m.match_number = n;
  end loop;
end;
$$;

create or replace function private.euro28_has_active_grace(
  p_tournament_id uuid,
  p_user_id uuid,
  p_match_id uuid,
  p_at timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.prediction_grace_windows grace
    join public.matches match_row
      on match_row.id = grace.match_id
     and match_row.tournament_id = grace.tournament_id
    where grace.tournament_id = p_tournament_id
      and grace.user_id = p_user_id
      and grace.match_id = p_match_id
      and grace.revoked_at is null
      and grace.granted_at <= p_at
      and grace.expires_at > p_at
      and match_row.status not in ('live', 'paused', 'completed', 'abandoned')
      and (match_row.kickoff_at is null or match_row.kickoff_at > p_at)
  );
$$;

create or replace function public.save_my_prediction_bundle(
  p_tournament_id uuid,
  p_expected_revision bigint,
  p_submitted boolean,
  p_predictions jsonb,
  p_source text default 'account'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := auth.uid();
  save_time timestamptz := clock_timestamp();
  tournament_row public.tournaments%rowtype;
  prediction_set_row public.prediction_sets%rowtype;
  active_ruleset public.scoring_rulesets%rowtype;
  prediction_count integer;
  group_prediction_count integer;
  knockout_prediction_count integer;
  group_joker_count integer;
  knockout_joker_count integer;
  global_locked boolean;
  set_exists boolean := false;
  content_change_without_grace boolean;
  locked_joker_change boolean;
  submitted_change boolean;
begin
  if caller_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required to save predictions';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception using errcode = '22023', message = 'expected_revision must be a non-negative integer';
  end if;
  if p_submitted is null then
    raise exception using errcode = '22023', message = 'submitted must be true or false';
  end if;
  if p_source not in ('account', 'guest_import') then
    raise exception using errcode = '22023', message = 'Unsupported prediction save source';
  end if;
  if p_predictions is null or jsonb_typeof(p_predictions) <> 'array' then
    raise exception using errcode = '22023', message = 'predictions must be a JSON array';
  end if;

  select * into tournament_row
  from public.tournaments
  where id = p_tournament_id
  for update;

  if not found or tournament_row.code <> 'euro-2028' then
    raise exception using errcode = 'P0002', message = 'Euro 2028 tournament was not found';
  end if;
  if tournament_row.prediction_lock_at is null and tournament_row.prediction_locked_at is null then
    raise exception using errcode = 'P0001', message = 'Prediction lock is not configured';
  end if;

  global_locked := tournament_row.prediction_locked_at is not null
    or (tournament_row.prediction_lock_at is not null and save_time >= tournament_row.prediction_lock_at);

  select * into active_ruleset
  from public.scoring_rulesets
  where id = tournament_row.active_scoring_ruleset_id
    and tournament_id = tournament_row.id;

  if not found or active_ruleset.status = 'retired' then
    raise exception using errcode = 'P0001', message = 'The active scoring ruleset is unavailable';
  end if;

  select count(*) into prediction_count from private.euro28_prediction_rows(p_predictions);
  if prediction_count > 51 then
    raise exception using errcode = '22023', message = 'A Euro prediction bundle cannot contain more than 51 matches';
  end if;
  if prediction_count <> jsonb_array_length(p_predictions) then
    raise exception using errcode = '22023', message = 'Every prediction row must match the expected schema';
  end if;
  if exists (
    select 1 from private.euro28_prediction_rows(p_predictions) prediction
    group by prediction.match_id having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'Prediction bundle contains duplicate matches';
  end if;
  if exists (
    select 1 from private.euro28_prediction_rows(p_predictions) prediction
    where prediction.match_id is null
       or prediction.predicted_home_tournament_team_id is null
       or prediction.predicted_away_tournament_team_id is null
       or prediction.predicted_home_tournament_team_id = prediction.predicted_away_tournament_team_id
       or prediction.home_score_90 is null or prediction.away_score_90 is null
       or prediction.home_score_90 not between 0 and 99
       or prediction.away_score_90 not between 0 and 99
  ) then
    raise exception using errcode = '22023', message = 'Prediction rows must contain complete participants and 90-minute scores';
  end if;
  if exists (
    select 1
    from private.euro28_prediction_rows(p_predictions) prediction
    left join public.matches match_row on match_row.id = prediction.match_id and match_row.tournament_id = p_tournament_id
    left join public.tournament_teams home_team on home_team.id = prediction.predicted_home_tournament_team_id and home_team.tournament_id = p_tournament_id
    left join public.tournament_teams away_team on away_team.id = prediction.predicted_away_tournament_team_id and away_team.tournament_id = p_tournament_id
    where match_row.id is null or home_team.id is null or away_team.id is null
  ) then
    raise exception using errcode = '22023', message = 'Prediction bundle contains a match or team outside this tournament';
  end if;
  if exists (
    select 1
    from private.euro28_prediction_rows(p_predictions) prediction
    join public.matches match_row on match_row.id = prediction.match_id
    where match_row.tournament_id = p_tournament_id
      and (
        (match_row.match_number <= 36 and (prediction.advancing_tournament_team_id is not null or prediction.decision_method is not null))
        or
        (match_row.match_number >= 37 and (
          prediction.advancing_tournament_team_id is null
          or prediction.decision_method not in ('normal_time', 'extra_time', 'penalties')
          or prediction.advancing_tournament_team_id not in (prediction.predicted_home_tournament_team_id, prediction.predicted_away_tournament_team_id)
          or (prediction.decision_method = 'normal_time' and prediction.home_score_90 = prediction.away_score_90)
          or (prediction.decision_method in ('extra_time', 'penalties') and prediction.home_score_90 <> prediction.away_score_90)
        ))
      )
  ) then
    raise exception using errcode = '22023', message = 'Prediction bundle contains invalid group or knockout fields';
  end if;
  if exists (
    select 1
    from private.euro28_prediction_rows(p_predictions) prediction
    join public.matches match_row on match_row.id = prediction.match_id and match_row.tournament_id = p_tournament_id and match_row.match_number <= 36
    join public.match_slots home_slot on home_slot.match_id = match_row.id and home_slot.side = 'home'
    join public.match_slots away_slot on away_slot.match_id = match_row.id and away_slot.side = 'away'
    where prediction.predicted_home_tournament_team_id <> coalesce(home_slot.resolved_tournament_team_id, home_slot.source_tournament_team_id)
       or prediction.predicted_away_tournament_team_id <> coalesce(away_slot.resolved_tournament_team_id, away_slot.source_tournament_team_id)
  ) then
    raise exception using errcode = '22023', message = 'Group prediction participants do not match the official fixture';
  end if;

  select
    count(*) filter (where match_row.match_number <= 36),
    count(*) filter (where match_row.match_number >= 37),
    count(*) filter (where match_row.match_number <= 36 and prediction.joker_applied),
    count(*) filter (where match_row.match_number >= 37 and prediction.joker_applied)
  into group_prediction_count, knockout_prediction_count, group_joker_count, knockout_joker_count
  from private.euro28_prediction_rows(p_predictions) prediction
  join public.matches match_row on match_row.id = prediction.match_id
  where match_row.tournament_id = p_tournament_id;

  if knockout_prediction_count > 0 and group_prediction_count <> 36 then
    raise exception using errcode = '22023', message = 'All 36 group predictions are required before saving knockout predictions';
  end if;
  if knockout_prediction_count > 0 and exists (
    select 1
    from private.euro28_prediction_rows(p_predictions) prediction
    join public.matches match_row on match_row.id = prediction.match_id and match_row.tournament_id = p_tournament_id and match_row.match_number >= 37
    left join private.euro28_expected_knockout_participants(p_tournament_id, p_predictions) expected on expected.match_id = prediction.match_id
    where expected.match_id is null
       or not expected.participants_resolved
       or prediction.predicted_home_tournament_team_id <> expected.home_team_id
       or prediction.predicted_away_tournament_team_id <> expected.away_team_id
  ) then
    raise exception using errcode = '22023', message = 'Knockout prediction participants do not match the canonical bracket';
  end if;

  if group_joker_count > 0 and active_ruleset.group_stage_joker_cap is null then
    raise exception using errcode = 'P0001', message = 'The group-stage joker cap is not configured';
  end if;
  if knockout_joker_count > 0 and active_ruleset.knockout_joker_cap is null then
    raise exception using errcode = 'P0001', message = 'The knockout joker cap is not configured';
  end if;
  if active_ruleset.group_stage_joker_cap is not null and group_joker_count > active_ruleset.group_stage_joker_cap then
    raise exception using errcode = '22023', message = 'The group-stage joker cap has been exceeded';
  end if;
  if active_ruleset.knockout_joker_cap is not null and knockout_joker_count > active_ruleset.knockout_joker_cap then
    raise exception using errcode = '22023', message = 'The knockout joker cap has been exceeded';
  end if;
  if p_submitted and prediction_count <> 51 then
    raise exception using errcode = '22023', message = 'All 51 predictions are required before entering review mode';
  end if;
  if p_source = 'guest_import' and (global_locked or prediction_count <> 51) then
    raise exception using errcode = 'P0001', message = 'Guest import requires a complete 51-match bundle before the global lock';
  end if;

  select * into prediction_set_row
  from public.prediction_sets
  where tournament_id = p_tournament_id and user_id = caller_user_id
  for update;
  set_exists := found;

  if set_exists then
    if prediction_set_row.revision <> p_expected_revision then
      raise exception using errcode = '40001', message = 'Prediction revision is stale';
    end if;
  else
    if p_expected_revision <> 0 then
      raise exception using errcode = '40001', message = 'Prediction revision is stale';
    end if;
    insert into public.prediction_sets (
      tournament_id, user_id, contract_version, scoring_ruleset_id, revision, submitted_at, last_save_source
    ) values (
      p_tournament_id, caller_user_id, tournament_row.prediction_contract_version,
      active_ruleset.id, 0, null, 'account'
    ) returning * into prediction_set_row;
  end if;

  if p_source = 'guest_import' and exists (
    select 1 from public.match_predictions where prediction_set_id = prediction_set_row.id
  ) then
    raise exception using errcode = 'P0001', message = 'Guest import cannot overwrite existing account predictions';
  end if;

  with incoming as (
    select * from private.euro28_prediction_rows(p_predictions)
  ),
  existing_rows as (
    select * from public.match_predictions where prediction_set_id = prediction_set_row.id
  ),
  changes as (
    select
      coalesce(existing.match_id, incoming.match_id) as match_id,
      existing.id is null as is_insert,
      incoming.match_id is null as is_delete,
      existing.predicted_home_tournament_team_id is distinct from incoming.predicted_home_tournament_team_id
        or existing.predicted_away_tournament_team_id is distinct from incoming.predicted_away_tournament_team_id
        or existing.home_score_90 is distinct from incoming.home_score_90
        or existing.away_score_90 is distinct from incoming.away_score_90
        or existing.advancing_tournament_team_id is distinct from incoming.advancing_tournament_team_id
        or existing.decision_method is distinct from incoming.decision_method as content_changed
    from existing_rows existing
    full join incoming on incoming.match_id = existing.match_id
  )
  select exists (
    select 1 from changes
    where (is_insert or is_delete or content_changed)
      and not private.euro28_has_active_grace(p_tournament_id, caller_user_id, match_id, save_time)
  ) into content_change_without_grace;

  with incoming as (
    select * from private.euro28_prediction_rows(p_predictions)
  ),
  existing_rows as (
    select * from public.match_predictions where prediction_set_id = prediction_set_row.id
  ),
  changes as (
    select coalesce(existing.match_id, incoming.match_id) as match_id,
      existing.joker_applied is distinct from incoming.joker_applied as joker_changed
    from existing_rows existing
    full join incoming on incoming.match_id = existing.match_id
  )
  select exists (
    select 1
    from changes
    join public.matches match_row on match_row.id = changes.match_id
    where changes.joker_changed
      and (
        match_row.status in ('live', 'paused', 'completed', 'abandoned')
        or (match_row.kickoff_at is not null and match_row.kickoff_at <= save_time)
      )
  ) into locked_joker_change;

  submitted_change := prediction_set_row.submitted_at is distinct from
    case when p_submitted then coalesce(prediction_set_row.submitted_at, save_time) else null end;

  if global_locked and content_change_without_grace then
    raise exception using errcode = 'P0001', message = 'Prediction content is globally locked';
  end if;
  if locked_joker_change then
    raise exception using errcode = 'P0001', message = 'A joker cannot be changed after its match has started';
  end if;
  if global_locked and submitted_change then
    raise exception using errcode = 'P0001', message = 'Review mode cannot be changed after the global lock';
  end if;

  delete from public.match_predictions existing
  where existing.prediction_set_id = prediction_set_row.id
    and not exists (
      select 1 from private.euro28_prediction_rows(p_predictions) incoming where incoming.match_id = existing.match_id
    );

  insert into public.match_predictions (
    prediction_set_id, tournament_id, match_id,
    predicted_home_tournament_team_id, predicted_away_tournament_team_id,
    home_score_90, away_score_90, advancing_tournament_team_id,
    decision_method, joker_applied
  )
  select
    prediction_set_row.id, p_tournament_id, prediction.match_id,
    prediction.predicted_home_tournament_team_id, prediction.predicted_away_tournament_team_id,
    prediction.home_score_90, prediction.away_score_90, prediction.advancing_tournament_team_id,
    prediction.decision_method, prediction.joker_applied
  from private.euro28_prediction_rows(p_predictions) prediction
  on conflict (prediction_set_id, match_id)
  do update set
    predicted_home_tournament_team_id = excluded.predicted_home_tournament_team_id,
    predicted_away_tournament_team_id = excluded.predicted_away_tournament_team_id,
    home_score_90 = excluded.home_score_90,
    away_score_90 = excluded.away_score_90,
    advancing_tournament_team_id = excluded.advancing_tournament_team_id,
    decision_method = excluded.decision_method,
    joker_applied = excluded.joker_applied;

  update public.prediction_sets
  set
    revision = revision + 1,
    submitted_at = case when global_locked then submitted_at when p_submitted then coalesce(submitted_at, save_time) else null end,
    guest_imported_at = case when p_source = 'guest_import' then save_time else guest_imported_at end,
    last_save_source = p_source
  where id = prediction_set_row.id
  returning * into prediction_set_row;

  return jsonb_build_object(
    'prediction_set_id', prediction_set_row.id,
    'tournament_id', prediction_set_row.tournament_id,
    'revision', prediction_set_row.revision,
    'submitted_at', prediction_set_row.submitted_at,
    'guest_imported_at', prediction_set_row.guest_imported_at,
    'last_save_source', prediction_set_row.last_save_source,
    'saved_prediction_count', prediction_count
  );
end;
$$;

revoke all on function private.euro28_prediction_rows(jsonb) from public, anon, authenticated;
revoke all on function private.euro28_group_stats(uuid, uuid, jsonb, uuid[]) from public, anon, authenticated;
revoke all on function private.euro28_metric_partitions(uuid, uuid, jsonb, uuid[], uuid[], text, text, boolean) from public, anon, authenticated;
revoke all on function private.euro28_refine_group_partitions(uuid, uuid, jsonb, jsonb, uuid[], text, text, boolean) from public, anon, authenticated;
revoke all on function private.euro28_head_to_head_partitions(uuid, uuid, jsonb, uuid[]) from public, anon, authenticated;
revoke all on function private.euro28_group_order(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function private.euro28_best_third_rows(uuid, jsonb) from public, anon, authenticated;
revoke all on function private.euro28_best_third_order(uuid, jsonb) from public, anon, authenticated;
revoke all on function private.euro28_best_third_group(text, text) from public, anon, authenticated;
revoke all on function private.euro28_expected_knockout_participants(uuid, jsonb) from public, anon, authenticated;
revoke all on function private.euro28_has_active_grace(uuid, uuid, uuid, timestamptz) from public, anon, authenticated;

revoke all on function public.save_my_prediction_bundle(uuid, bigint, boolean, jsonb, text)
from public, anon, authenticated;
grant execute on function public.save_my_prediction_bundle(uuid, bigint, boolean, jsonb, text)
to authenticated;

commit;
