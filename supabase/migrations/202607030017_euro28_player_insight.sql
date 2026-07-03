begin;

create or replace function public.get_player_competition_points(
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
  caller_id uuid := auth.uid();
  target_name text;
  target_is_self boolean := false;
  shared_bundle jsonb := '{}'::jsonb;
  totals_row public.prediction_totals%rowtype;
  match_rows jsonb := '[]'::jsonb;
  bracket_rows jsonb := '[]'::jsonb;
  visible_match_points integer := 0;
  visible_match_count integer := 0;
  visible_bracket_points integer := 0;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;

  if p_competition_key not in ('original', 'ko_predictor') then
    raise exception using errcode = '22023', message = 'Competition key is invalid';
  end if;

  if not exists (
    select 1
    from public.tournaments tournament
    where tournament.id = p_tournament_id
      and tournament.is_public = true
  ) then
    raise exception using errcode = '22023', message = 'Tournament is unavailable';
  end if;

  select profile.display_name
  into target_name
  from public.profiles profile
  where profile.id = p_member_user_id;

  if target_name is null then
    raise exception using errcode = '22023', message = 'Predictor profile was not found';
  end if;

  target_is_self := caller_id = p_member_user_id;

  if not target_is_self then
    shared_bundle := private.euro28_build_shared_prediction_bundle(
      p_tournament_id,
      p_member_user_id,
      p_competition_key
    );

    if not coalesce((shared_bundle ->> 'visible')::boolean, false) then
      return jsonb_build_object(
        'visible', false,
        'visibility_scope', shared_bundle ->> 'visibility_scope',
        'reason', shared_bundle ->> 'reason',
        'competition_key', p_competition_key,
        'member_user_id', p_member_user_id,
        'display_name', target_name,
        'state', 'protected',
        'match_points', 0,
        'bracket_points', 0,
        'total_points', 0,
        'scored_match_count', 0,
        'match_breakdown', '[]'::jsonb,
        'bracket_breakdown', '[]'::jsonb
      );
    end if;
  end if;

  select totals.*
  into totals_row
  from public.prediction_totals totals
  where totals.tournament_id = p_tournament_id
    and totals.user_id = p_member_user_id
    and totals.competition_key = p_competition_key;

  if totals_row.prediction_set_id is null then
    return jsonb_build_object(
      'visible', true,
      'visibility_scope', case
        when target_is_self then 'self'
        else shared_bundle ->> 'visibility_scope'
      end,
      'reason', null,
      'competition_key', p_competition_key,
      'member_user_id', p_member_user_id,
      'display_name', target_name,
      'state', 'unscored',
      'match_points', 0,
      'bracket_points', 0,
      'total_points', 0,
      'scored_match_count', 0,
      'match_breakdown', '[]'::jsonb,
      'bracket_breakdown', '[]'::jsonb
    );
  end if;

  if p_competition_key = 'ko_predictor' and not target_is_self then
    select
      coalesce(jsonb_agg(jsonb_build_object(
        'match_id', points.match_id,
        'match_number', match_row.match_number,
        'matchday', match_row.matchday,
        'scheduled_date', match_row.scheduled_date,
        'stage_code', stage.code,
        'exact_score_points', points.exact_score_points,
        'correct_outcome_points', points.correct_outcome_points,
        'advancing_team_points', points.advancing_team_points,
        'decision_method_points', points.decision_method_points,
        'joker_multiplier', points.joker_multiplier,
        'total_points', points.total_points,
        'result_revision', points.result_revision
      ) order by match_row.match_number), '[]'::jsonb),
      coalesce(sum(points.total_points), 0)::integer,
      count(*)::integer
    into match_rows, visible_match_points, visible_match_count
    from public.prediction_match_points points
    join public.matches match_row on match_row.id = points.match_id
    join public.tournament_stages stage on stage.id = match_row.stage_id
    where points.prediction_set_id = totals_row.prediction_set_id
      and (
        (match_row.kickoff_at is not null and match_row.kickoff_at <= statement_timestamp())
        or match_row.status in ('live', 'paused', 'completed', 'abandoned')
      );
  else
    select coalesce(jsonb_agg(jsonb_build_object(
      'match_id', points.match_id,
      'match_number', match_row.match_number,
      'matchday', match_row.matchday,
      'scheduled_date', match_row.scheduled_date,
      'stage_code', stage.code,
      'exact_score_points', points.exact_score_points,
      'correct_outcome_points', points.correct_outcome_points,
      'advancing_team_points', points.advancing_team_points,
      'decision_method_points', points.decision_method_points,
      'joker_multiplier', points.joker_multiplier,
      'total_points', points.total_points,
      'result_revision', points.result_revision
    ) order by match_row.match_number), '[]'::jsonb)
    into match_rows
    from public.prediction_match_points points
    join public.matches match_row on match_row.id = points.match_id
    join public.tournament_stages stage on stage.id = match_row.stage_id
    where points.prediction_set_id = totals_row.prediction_set_id;

    visible_match_points := totals_row.match_points;
    visible_match_count := totals_row.scored_match_count;
  end if;

  if p_competition_key = 'original' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'milestone', points.milestone,
      'tournament_team_id', points.tournament_team_id,
      'points', points.points
    ) order by points.milestone, points.tournament_team_id), '[]'::jsonb)
    into bracket_rows
    from public.prediction_bracket_points points
    where points.prediction_set_id = totals_row.prediction_set_id;

    visible_bracket_points := totals_row.bracket_points;
  end if;

  return jsonb_build_object(
    'visible', true,
    'visibility_scope', case
      when target_is_self then 'self'
      else shared_bundle ->> 'visibility_scope'
    end,
    'reason', null,
    'competition_key', p_competition_key,
    'member_user_id', p_member_user_id,
    'display_name', target_name,
    'state', case
      when visible_match_count > 0 or visible_bracket_points > 0 then 'scored'
      else 'unscored'
    end,
    'match_points', visible_match_points,
    'bracket_points', visible_bracket_points,
    'total_points', visible_match_points + visible_bracket_points,
    'scored_match_count', visible_match_count,
    'match_breakdown', match_rows,
    'bracket_breakdown', bracket_rows
  );
end;
$$;

revoke all on function public.get_player_competition_points(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.get_player_competition_points(uuid, uuid, text) to authenticated;

alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

commit;
