-- Stage DP-SCORING — align the runtime scorer with the locked scoring contract
-- (CLAUDE.md §4, owner ruling 2026-07-10).
--
-- STAGING/PRODUCTION SAFETY: this migration changes scoring SQL. It was authored
-- and is committed for LOCAL application + pgTAP verification. It must NOT be
-- applied to Euro staging (gcfdwobpnanjchcnvdco) except as its own backup-first
-- follow-up, and never to WC26 production (ouhxawizadnwrhrjppld). It was NOT
-- applied to any hosted database in the authoring session.
--
-- Two changes:
--   1. Repoint the provisional scoring_rulesets row to the locked values
--      (group 5/3; bracket 8/12/15/20/45; KO advancer 5). The row is provisional
--      and therefore mutable; a fresh `supabase db reset` picks these up here.
--   2. Rewrite the match/KO branch of euro28_recalculate_points:
--        - the "correct 90-minute result" component is now Original-only
--          (KO no longer has an outcome fallback);
--        - the old method-bonus component becomes the KO draw-call component
--          (+5 when the user predicted a level 90-minute score AND it was level
--          at 90), reusing knockout_decision_method_points as the draw-call value.
--      Exact 90-minute score (match_exact_score_points = 5) and the advancer
--      component (knockout_advancing_team_points = 5) are unchanged in shape.
--      Regulation KO max = advancer + exact = 10; a game level at 90 can also
--      earn the draw call → ET/pens max 15; a joker doubles the match total.
--
-- The bracket-reach and prediction_totals sections are unchanged: they read the
-- ladder values from the ruleset row, so the value update above drives them.
--
-- NOT covered here (specified follow-up): group-position scoring
-- (2 per correct final position, +5 perfect group). It needs a predicted-vs-
-- actual group-standings derivation and a prediction_totals component that do
-- not yet exist server-side; the tested JS reference lives in
-- src/journey/groupPositionsModel.js.

update public.scoring_rulesets
set
  match_exact_score_points        = 5,
  match_correct_outcome_points    = 3,
  knockout_advancing_team_points  = 5,
  knockout_decision_method_points = 5,
  round_of_16_team_points         = 8,
  quarter_final_team_points       = 12,
  semi_final_team_points          = 15,
  finalist_points                 = 20,
  champion_points                 = 45,
  group_stage_joker_cap           = 5,
  knockout_joker_cap              = 5,
  updated_at                      = now()
where id = 'e0285000-0000-4000-8000-000000000001'
  and status = 'provisional';

create or replace function private.euro28_recalculate_points(
  p_tournament_id uuid,
  p_match_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  ruleset public.scoring_rulesets%rowtype;
  run_id uuid;
  run_key text;
begin
  select scoring.* into ruleset
  from public.tournaments tournament
  join public.scoring_rulesets scoring
    on scoring.id = tournament.active_scoring_ruleset_id
   and scoring.tournament_id = tournament.id
  where tournament.id = p_tournament_id;

  if ruleset.id is null then
    raise exception 'Tournament has no active scoring ruleset';
  end if;

  run_key := concat(
    p_tournament_id::text,
    ':', coalesce(p_match_id::text, 'all'),
    ':', extract(epoch from clock_timestamp())::numeric::text,
    ':', gen_random_uuid()::text
  );

  insert into public.scoring_runs (
    tournament_id,
    trigger_match_id,
    scoring_ruleset_id,
    run_key
  ) values (
    p_tournament_id,
    p_match_id,
    ruleset.id,
    run_key
  ) returning id into run_id;

  delete from public.prediction_match_points points
  where points.tournament_id = p_tournament_id
    and (p_match_id is null or points.match_id = p_match_id);

  insert into public.prediction_match_points (
    prediction_set_id,
    tournament_id,
    match_id,
    competition_key,
    scoring_ruleset_id,
    scoring_run_id,
    result_revision,
    exact_score_points,
    correct_outcome_points,
    advancing_team_points,
    decision_method_points,
    joker_multiplier,
    total_before_joker,
    total_points
  )
  select
    prediction_set.id,
    prediction_set.tournament_id,
    prediction.match_id,
    prediction_set.competition_key,
    ruleset.id,
    run_id,
    match_row.result_revision,
    -- Exact 90-minute score: group exact (5) and KO exact-90 (5).
    case
      when prediction.home_score_90 = match_row.home_score_90
       and prediction.away_score_90 = match_row.away_score_90
      then ruleset.match_exact_score_points else 0
    end,
    -- Correct 90-minute result: ORIGINAL only (KO has no outcome fallback now).
    case
      when prediction_set.competition_key = 'original'
       and not (
        prediction.home_score_90 = match_row.home_score_90
        and prediction.away_score_90 = match_row.away_score_90
      )
      and private.euro28_score_outcome(prediction.home_score_90, prediction.away_score_90)
        = private.euro28_score_outcome(match_row.home_score_90, match_row.away_score_90)
      then ruleset.match_correct_outcome_points else 0
    end,
    -- KO advancer (any method).
    case
      when prediction_set.competition_key = 'ko_predictor'
       and prediction.advancing_tournament_team_id = match_row.winner_tournament_team_id
      then ruleset.knockout_advancing_team_points else 0
    end,
    -- KO draw call: predicted level at 90 AND it was level at 90 (uses the
    -- knockout_decision_method_points column as the draw-call value).
    case
      when prediction_set.competition_key = 'ko_predictor'
       and private.euro28_score_outcome(prediction.home_score_90, prediction.away_score_90) = 'draw'
       and private.euro28_score_outcome(match_row.home_score_90, match_row.away_score_90) = 'draw'
      then ruleset.knockout_decision_method_points else 0
    end,
    case when prediction.joker_applied then ruleset.joker_multiplier else 1 end,
    (
      case
        when prediction.home_score_90 = match_row.home_score_90
         and prediction.away_score_90 = match_row.away_score_90
        then ruleset.match_exact_score_points else 0
      end
      + case
        when prediction_set.competition_key = 'original'
         and not (
          prediction.home_score_90 = match_row.home_score_90
          and prediction.away_score_90 = match_row.away_score_90
        )
         and private.euro28_score_outcome(prediction.home_score_90, prediction.away_score_90)
          = private.euro28_score_outcome(match_row.home_score_90, match_row.away_score_90)
        then ruleset.match_correct_outcome_points else 0
      end
      + case
        when prediction_set.competition_key = 'ko_predictor'
         and prediction.advancing_tournament_team_id = match_row.winner_tournament_team_id
        then ruleset.knockout_advancing_team_points else 0
      end
      + case
        when prediction_set.competition_key = 'ko_predictor'
         and private.euro28_score_outcome(prediction.home_score_90, prediction.away_score_90) = 'draw'
         and private.euro28_score_outcome(match_row.home_score_90, match_row.away_score_90) = 'draw'
        then ruleset.knockout_decision_method_points else 0
      end
    )::integer,
    round((
      case
        when prediction.home_score_90 = match_row.home_score_90
         and prediction.away_score_90 = match_row.away_score_90
        then ruleset.match_exact_score_points else 0
      end
      + case
        when prediction_set.competition_key = 'original'
         and not (
          prediction.home_score_90 = match_row.home_score_90
          and prediction.away_score_90 = match_row.away_score_90
        )
         and private.euro28_score_outcome(prediction.home_score_90, prediction.away_score_90)
          = private.euro28_score_outcome(match_row.home_score_90, match_row.away_score_90)
        then ruleset.match_correct_outcome_points else 0
      end
      + case
        when prediction_set.competition_key = 'ko_predictor'
         and prediction.advancing_tournament_team_id = match_row.winner_tournament_team_id
        then ruleset.knockout_advancing_team_points else 0
      end
      + case
        when prediction_set.competition_key = 'ko_predictor'
         and private.euro28_score_outcome(prediction.home_score_90, prediction.away_score_90) = 'draw'
         and private.euro28_score_outcome(match_row.home_score_90, match_row.away_score_90) = 'draw'
        then ruleset.knockout_decision_method_points else 0
      end
    ) * case when prediction.joker_applied then ruleset.joker_multiplier else 1 end)::integer
  from public.match_predictions prediction
  join public.prediction_sets prediction_set
    on prediction_set.id = prediction.prediction_set_id
   and prediction_set.tournament_id = prediction.tournament_id
  join public.matches match_row
    on match_row.id = prediction.match_id
   and match_row.tournament_id = prediction.tournament_id
  where prediction.tournament_id = p_tournament_id
    and (p_match_id is null or prediction.match_id = p_match_id)
    and match_row.status = 'completed'
    and match_row.result_status = 'confirmed'
    and match_row.result_revision > 0
    and match_row.result_method in ('regulation', 'extra_time', 'penalties')
    and (
      (prediction_set.competition_key = 'original' and match_row.match_number between 1 and 36)
      or (prediction_set.competition_key = 'ko_predictor' and match_row.match_number between 37 and 51)
    );

  -- Bracket points are recalculated as a complete replacement because a
  -- corrected result can alter several later milestones.
  delete from public.prediction_bracket_points
  where tournament_id = p_tournament_id;

  with predicted_milestones as (
    select prediction_set.id as prediction_set_id, bracket.tournament_id,
      case
        when match_row.match_number between 37 and 44 then 'round_of_16'
        when match_row.match_number between 45 and 48 then 'quarter_final'
        when match_row.match_number between 49 and 50 then 'semi_final'
        when match_row.match_number = 51 then 'final'
      end as milestone,
      participant.team_id
    from public.bracket_predictions bracket
    join public.prediction_sets prediction_set
      on prediction_set.id = bracket.prediction_set_id
     and prediction_set.competition_key = 'original'
    join public.matches match_row on match_row.id = bracket.match_id
    cross join lateral (
      values
        (bracket.predicted_home_tournament_team_id),
        (bracket.predicted_away_tournament_team_id)
    ) participant(team_id)
    where bracket.tournament_id = p_tournament_id
    union all
    select prediction_set.id, bracket.tournament_id, 'champion', bracket.advancing_tournament_team_id
    from public.bracket_predictions bracket
    join public.prediction_sets prediction_set
      on prediction_set.id = bracket.prediction_set_id
     and prediction_set.competition_key = 'original'
    join public.matches match_row
      on match_row.id = bracket.match_id
     and match_row.match_number = 51
    where bracket.tournament_id = p_tournament_id
  ),
  actual_milestones as (
    select slot.tournament_id,
      case
        when match_row.match_number between 37 and 44 then 'round_of_16'
        when match_row.match_number between 45 and 48 then 'quarter_final'
        when match_row.match_number between 49 and 50 then 'semi_final'
        when match_row.match_number = 51 then 'final'
      end as milestone,
      slot.resolved_tournament_team_id as team_id
    from public.match_slots slot
    join public.matches match_row on match_row.id = slot.match_id
    where slot.tournament_id = p_tournament_id
      and slot.resolved_tournament_team_id is not null
      and match_row.match_number between 37 and 51
    union all
    select match_row.tournament_id, 'champion', match_row.winner_tournament_team_id
    from public.matches match_row
    where match_row.tournament_id = p_tournament_id
      and match_row.match_number = 51
      and match_row.status = 'completed'
      and match_row.result_status = 'confirmed'
      and match_row.winner_tournament_team_id is not null
  )
  insert into public.prediction_bracket_points (
    prediction_set_id,
    tournament_id,
    milestone,
    tournament_team_id,
    points,
    scoring_ruleset_id,
    scoring_run_id
  )
  select distinct
    predicted.prediction_set_id,
    predicted.tournament_id,
    predicted.milestone,
    predicted.team_id,
    case predicted.milestone
      when 'round_of_16' then ruleset.round_of_16_team_points
      when 'quarter_final' then ruleset.quarter_final_team_points
      when 'semi_final' then ruleset.semi_final_team_points
      when 'final' then ruleset.finalist_points
      when 'champion' then ruleset.champion_points
    end,
    ruleset.id,
    run_id
  from predicted_milestones predicted
  join actual_milestones actual
    on actual.tournament_id = predicted.tournament_id
   and actual.milestone = predicted.milestone
   and actual.team_id = predicted.team_id
  where predicted.milestone is not null;

  insert into public.prediction_totals (
    prediction_set_id,
    tournament_id,
    user_id,
    competition_key,
    match_points,
    bracket_points,
    total_points,
    scored_match_count,
    last_scoring_run_id,
    updated_at
  )
  select
    prediction_set.id,
    prediction_set.tournament_id,
    prediction_set.user_id,
    prediction_set.competition_key,
    coalesce(match_totals.points, 0),
    case when prediction_set.competition_key = 'original'
      then coalesce(bracket_totals.points, 0) else 0 end,
    coalesce(match_totals.points, 0)
      + case when prediction_set.competition_key = 'original'
        then coalesce(bracket_totals.points, 0) else 0 end,
    coalesce(match_totals.match_count, 0),
    run_id,
    now()
  from public.prediction_sets prediction_set
  left join lateral (
    select sum(points.total_points)::integer as points, count(*)::integer as match_count
    from public.prediction_match_points points
    where points.prediction_set_id = prediction_set.id
  ) match_totals on true
  left join lateral (
    select sum(points.points)::integer as points
    from public.prediction_bracket_points points
    where points.prediction_set_id = prediction_set.id
  ) bracket_totals on true
  where prediction_set.tournament_id = p_tournament_id
  on conflict (prediction_set_id)
  do update set
    match_points = excluded.match_points,
    bracket_points = excluded.bracket_points,
    total_points = excluded.total_points,
    scored_match_count = excluded.scored_match_count,
    last_scoring_run_id = excluded.last_scoring_run_id,
    updated_at = excluded.updated_at;

  update public.scoring_runs
  set status = 'completed', completed_at = now()
  where id = run_id;

  return run_id;
exception when others then
  if run_id is not null then
    update public.scoring_runs
    set status = 'failed', completed_at = now(), error_message = sqlerrm
    where id = run_id;
  end if;
  raise;
end;
$$;
