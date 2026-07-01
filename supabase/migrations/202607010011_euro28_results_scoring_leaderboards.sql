-- Euro 2028 canonical results, idempotent scoring and separate leaderboards.
--
-- Results continue to live on public.matches. This migration adds explicit
-- confirmation/revision metadata, an immutable audit trail, idempotent point
-- rows and competition-specific totals. Original and KO Predictor points are
-- never combined.

begin;

alter table public.matches
  add column result_status text not null default 'pending',
  add column result_revision bigint not null default 0,
  add column result_source text,
  add column result_confirmed_at timestamptz,
  add column result_confirmed_by_user_id uuid references auth.users(id) on delete set null,
  add constraint matches_result_status_check
    check (result_status in ('pending', 'confirmed', 'void', 'manual_review')),
  add constraint matches_result_revision_check
    check (result_revision >= 0),
  add constraint matches_result_source_check
    check (result_source is null or result_source in ('manual', 'api', 'system')),
  add constraint matches_confirmed_result_state_check
    check (
      result_status <> 'confirmed'
      or (
        status = 'completed'
        and home_score_90 is not null
        and away_score_90 is not null
        and result_method is not null
        and result_confirmed_at is not null
      )
    );

comment on column public.matches.result_status is
  'Scoring gate. Only completed + confirmed results are scoreable.';
comment on column public.matches.result_revision is
  'Monotonic revision used by idempotent recalculation and correction audits.';

create table public.match_result_events (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  match_id uuid not null,
  result_revision bigint not null check (result_revision > 0),
  event_type text not null check (event_type in ('recorded', 'corrected', 'voided', 'manual_review')),
  result_source text not null check (result_source in ('manual', 'api', 'system')),
  recorded_by_user_id uuid references auth.users(id) on delete set null,
  snapshot jsonb not null,
  recorded_at timestamptz not null default now(),
  unique (match_id, result_revision),
  foreign key (match_id, tournament_id)
    references public.matches(id, tournament_id) on delete cascade
);

comment on table public.match_result_events is
  'Append-only audit trail for every canonical result revision.';

create or replace function private.euro28_prevent_result_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Match result audit events are append-only';
end;
$$;

create trigger match_result_events_append_only
before update or delete on public.match_result_events
for each row execute function private.euro28_prevent_result_event_mutation();

create table public.scoring_runs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  trigger_match_id uuid references public.matches(id) on delete set null,
  scoring_ruleset_id uuid not null,
  run_key text not null unique,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  foreign key (scoring_ruleset_id, tournament_id)
    references public.scoring_rulesets(id, tournament_id) on delete restrict
);

create table public.prediction_match_points (
  id uuid primary key default gen_random_uuid(),
  prediction_set_id uuid not null,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  match_id uuid not null,
  competition_key text not null check (competition_key in ('original', 'ko_predictor')),
  scoring_ruleset_id uuid not null,
  scoring_run_id uuid not null references public.scoring_runs(id) on delete restrict,
  result_revision bigint not null check (result_revision > 0),
  exact_score_points integer not null default 0 check (exact_score_points >= 0),
  correct_outcome_points integer not null default 0 check (correct_outcome_points >= 0),
  advancing_team_points integer not null default 0 check (advancing_team_points >= 0),
  decision_method_points integer not null default 0 check (decision_method_points >= 0),
  joker_multiplier numeric(8,3) not null default 1 check (joker_multiplier > 0),
  total_before_joker integer not null default 0 check (total_before_joker >= 0),
  total_points integer not null default 0 check (total_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (prediction_set_id, match_id),
  foreign key (prediction_set_id, tournament_id)
    references public.prediction_sets(id, tournament_id) on delete cascade,
  foreign key (match_id, tournament_id)
    references public.matches(id, tournament_id) on delete cascade,
  foreign key (scoring_ruleset_id, tournament_id)
    references public.scoring_rulesets(id, tournament_id) on delete restrict,
  check (total_points = round(total_before_joker * joker_multiplier)::integer)
);

create table public.prediction_bracket_points (
  id uuid primary key default gen_random_uuid(),
  prediction_set_id uuid not null,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  milestone text not null check (milestone in ('round_of_16', 'quarter_final', 'semi_final', 'final', 'champion')),
  tournament_team_id uuid not null,
  points integer not null check (points >= 0),
  scoring_ruleset_id uuid not null,
  scoring_run_id uuid not null references public.scoring_runs(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (prediction_set_id, milestone, tournament_team_id),
  foreign key (prediction_set_id, tournament_id)
    references public.prediction_sets(id, tournament_id) on delete cascade,
  foreign key (tournament_team_id, tournament_id)
    references public.tournament_teams(id, tournament_id) on delete restrict,
  foreign key (scoring_ruleset_id, tournament_id)
    references public.scoring_rulesets(id, tournament_id) on delete restrict
);

create table public.prediction_totals (
  prediction_set_id uuid primary key,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  competition_key text not null check (competition_key in ('original', 'ko_predictor')),
  match_points integer not null default 0 check (match_points >= 0),
  bracket_points integer not null default 0 check (bracket_points >= 0),
  total_points integer not null default 0 check (total_points >= 0),
  scored_match_count integer not null default 0 check (scored_match_count >= 0),
  last_scoring_run_id uuid references public.scoring_runs(id) on delete set null,
  updated_at timestamptz not null default now(),
  foreign key (prediction_set_id, tournament_id)
    references public.prediction_sets(id, tournament_id) on delete cascade,
  unique (tournament_id, user_id, competition_key),
  check (total_points = match_points + bracket_points),
  check (competition_key <> 'ko_predictor' or bracket_points = 0)
);

create index match_result_events_match_revision_idx
  on public.match_result_events (match_id, result_revision desc);
create index scoring_runs_tournament_started_idx
  on public.scoring_runs (tournament_id, started_at desc);
create index prediction_match_points_set_idx
  on public.prediction_match_points (prediction_set_id, match_id);
create index prediction_match_points_match_idx
  on public.prediction_match_points (match_id, competition_key);
create index prediction_bracket_points_set_idx
  on public.prediction_bracket_points (prediction_set_id, milestone);
create index prediction_totals_leaderboard_idx
  on public.prediction_totals (tournament_id, competition_key, total_points desc);

create trigger prediction_match_points_set_updated_at
before update on public.prediction_match_points
for each row execute function public.set_updated_at();

create trigger prediction_bracket_points_set_updated_at
before update on public.prediction_bracket_points
for each row execute function public.set_updated_at();

create or replace function private.euro28_score_outcome(
  p_home integer,
  p_away integer
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_home > p_away then 'home'
    when p_away > p_home then 'away'
    else 'draw'
  end;
$$;

create or replace function private.euro28_guard_point_competition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  stored_competition text;
begin
  select competition_key into stored_competition
  from public.prediction_sets
  where id = new.prediction_set_id
    and tournament_id = new.tournament_id;

  if stored_competition is null or stored_competition <> new.competition_key then
    raise exception 'Point row competition does not match its prediction set';
  end if;

  return new;
end;
$$;

create trigger prediction_match_points_guard_competition
before insert or update on public.prediction_match_points
for each row execute function private.euro28_guard_point_competition();

create trigger prediction_totals_guard_competition
before insert or update on public.prediction_totals
for each row execute function private.euro28_guard_point_competition();

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
    case
      when prediction.home_score_90 = match_row.home_score_90
       and prediction.away_score_90 = match_row.away_score_90
      then ruleset.match_exact_score_points else 0
    end,
    case
      when not (
        prediction.home_score_90 = match_row.home_score_90
        and prediction.away_score_90 = match_row.away_score_90
      )
      and private.euro28_score_outcome(prediction.home_score_90, prediction.away_score_90)
        = private.euro28_score_outcome(match_row.home_score_90, match_row.away_score_90)
      then ruleset.match_correct_outcome_points else 0
    end,
    case
      when prediction_set.competition_key = 'ko_predictor'
       and prediction.advancing_tournament_team_id = match_row.winner_tournament_team_id
      then ruleset.knockout_advancing_team_points else 0
    end,
    case
      when prediction_set.competition_key = 'ko_predictor'
       and prediction.advancing_tournament_team_id = match_row.winner_tournament_team_id
       and prediction.decision_method = case match_row.result_method
         when 'regulation' then 'normal_time'
         when 'extra_time' then 'extra_time'
         when 'penalties' then 'penalties'
         else null
       end
      then ruleset.knockout_decision_method_points else 0
    end,
    case when prediction.joker_applied then ruleset.joker_multiplier else 1 end,
    (
      case
        when prediction.home_score_90 = match_row.home_score_90
         and prediction.away_score_90 = match_row.away_score_90
        then ruleset.match_exact_score_points
        when private.euro28_score_outcome(prediction.home_score_90, prediction.away_score_90)
          = private.euro28_score_outcome(match_row.home_score_90, match_row.away_score_90)
        then ruleset.match_correct_outcome_points
        else 0
      end
      + case
        when prediction_set.competition_key = 'ko_predictor'
         and prediction.advancing_tournament_team_id = match_row.winner_tournament_team_id
        then ruleset.knockout_advancing_team_points else 0
      end
      + case
        when prediction_set.competition_key = 'ko_predictor'
         and prediction.advancing_tournament_team_id = match_row.winner_tournament_team_id
         and prediction.decision_method = case match_row.result_method
           when 'regulation' then 'normal_time'
           when 'extra_time' then 'extra_time'
           when 'penalties' then 'penalties'
           else null
         end
        then ruleset.knockout_decision_method_points else 0
      end
    )::integer,
    round((
      case
        when prediction.home_score_90 = match_row.home_score_90
         and prediction.away_score_90 = match_row.away_score_90
        then ruleset.match_exact_score_points
        when private.euro28_score_outcome(prediction.home_score_90, prediction.away_score_90)
          = private.euro28_score_outcome(match_row.home_score_90, match_row.away_score_90)
        then ruleset.match_correct_outcome_points
        else 0
      end
      + case
        when prediction_set.competition_key = 'ko_predictor'
         and prediction.advancing_tournament_team_id = match_row.winner_tournament_team_id
        then ruleset.knockout_advancing_team_points else 0
      end
      + case
        when prediction_set.competition_key = 'ko_predictor'
         and prediction.advancing_tournament_team_id = match_row.winner_tournament_team_id
         and prediction.decision_method = case match_row.result_method
           when 'regulation' then 'normal_time'
           when 'extra_time' then 'extra_time'
           when 'penalties' then 'penalties'
           else null
         end
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

create or replace function private.euro28_record_match_result(
  p_tournament_id uuid,
  p_match_id uuid,
  p_match_status text,
  p_result_status text,
  p_normal_time_home_goals integer,
  p_normal_time_away_goals integer,
  p_after_extra_time_home_goals integer,
  p_after_extra_time_away_goals integer,
  p_penalty_home_goals integer,
  p_penalty_away_goals integer,
  p_decision_method text,
  p_winner_tournament_team_id uuid,
  p_result_source text,
  p_recorded_by_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches%rowtype;
  home_team_id uuid;
  away_team_id uuid;
  expected_winner uuid;
  next_revision bigint;
  event_type text;
  stored_method text;
  scoring_run_id uuid;
begin
  if p_match_status not in ('scheduled', 'live', 'paused', 'completed', 'postponed', 'cancelled', 'abandoned') then
    raise exception using errcode = '22023', message = 'Unsupported match status';
  end if;
  if p_result_status not in ('pending', 'confirmed', 'void', 'manual_review') then
    raise exception using errcode = '22023', message = 'Unsupported result status';
  end if;
  if p_result_source not in ('manual', 'api', 'system') then
    raise exception using errcode = '22023', message = 'Unsupported result source';
  end if;

  select * into match_row
  from public.matches
  where id = p_match_id and tournament_id = p_tournament_id
  for update;

  if not found then raise exception 'Match was not found'; end if;

  select resolved_tournament_team_id into home_team_id
  from public.match_slots
  where match_id = p_match_id and tournament_id = p_tournament_id and side = 'home';
  select resolved_tournament_team_id into away_team_id
  from public.match_slots
  where match_id = p_match_id and tournament_id = p_tournament_id and side = 'away';

  if home_team_id is null or away_team_id is null or home_team_id = away_team_id then
    raise exception using errcode = '22023', message = 'Both match participants must be resolved';
  end if;

  if p_result_status = 'confirmed' and p_match_status <> 'completed' then
    raise exception using errcode = '22023', message = 'Only a completed match can have a confirmed result';
  end if;

  if p_result_status in ('void', 'manual_review') then
    stored_method := case when p_decision_method = 'administrative' then 'awarded' else null end;
  else
    if p_normal_time_home_goals is null or p_normal_time_away_goals is null
       or p_normal_time_home_goals < 0 or p_normal_time_away_goals < 0 then
      raise exception using errcode = '22023', message = 'A live or confirmed result requires non-negative normal-time scores';
    end if;

    if p_decision_method = 'normal_time' then
      stored_method := 'regulation';
    elsif p_decision_method in ('extra_time', 'penalties') then
      stored_method := p_decision_method;
    else
      raise exception using errcode = '22023', message = 'Unsupported automatic decision method';
    end if;
  end if;

  if p_result_status = 'confirmed' then
    if match_row.match_number <= 36 then
      if p_decision_method <> 'normal_time'
        or p_after_extra_time_home_goals is not null
        or p_after_extra_time_away_goals is not null
        or p_penalty_home_goals is not null
        or p_penalty_away_goals is not null then
        raise exception using errcode = '22023', message = 'Group results must contain normal-time scores only';
      end if;
      expected_winner := case
        when p_normal_time_home_goals > p_normal_time_away_goals then home_team_id
        when p_normal_time_away_goals > p_normal_time_home_goals then away_team_id
        else null
      end;
    elsif p_decision_method = 'normal_time' then
      if p_normal_time_home_goals = p_normal_time_away_goals
        or p_after_extra_time_home_goals is not null
        or p_after_extra_time_away_goals is not null
        or p_penalty_home_goals is not null
        or p_penalty_away_goals is not null then
        raise exception using errcode = '22023', message = 'A normal-time knockout result must have a 90-minute winner only';
      end if;
      expected_winner := case when p_normal_time_home_goals > p_normal_time_away_goals then home_team_id else away_team_id end;
    elsif p_decision_method = 'extra_time' then
      if p_normal_time_home_goals <> p_normal_time_away_goals
        or p_after_extra_time_home_goals is null
        or p_after_extra_time_away_goals is null
        or p_after_extra_time_home_goals < p_normal_time_home_goals
        or p_after_extra_time_away_goals < p_normal_time_away_goals
        or p_after_extra_time_home_goals = p_after_extra_time_away_goals
        or p_penalty_home_goals is not null
        or p_penalty_away_goals is not null then
        raise exception using errcode = '22023', message = 'Invalid extra-time result';
      end if;
      expected_winner := case when p_after_extra_time_home_goals > p_after_extra_time_away_goals then home_team_id else away_team_id end;
    elsif p_decision_method = 'penalties' then
      if p_normal_time_home_goals <> p_normal_time_away_goals
        or p_after_extra_time_home_goals is null
        or p_after_extra_time_away_goals is null
        or p_after_extra_time_home_goals < p_normal_time_home_goals
        or p_after_extra_time_away_goals < p_normal_time_away_goals
        or p_after_extra_time_home_goals <> p_after_extra_time_away_goals
        or p_penalty_home_goals is null
        or p_penalty_away_goals is null
        or p_penalty_home_goals = p_penalty_away_goals then
        raise exception using errcode = '22023', message = 'Invalid penalty result';
      end if;
      expected_winner := case when p_penalty_home_goals > p_penalty_away_goals then home_team_id else away_team_id end;
    end if;

    if p_winner_tournament_team_id is distinct from expected_winner then
      raise exception using errcode = '22023', message = 'Winner does not match the confirmed result';
    end if;
  end if;

  next_revision := match_row.result_revision + 1;
  event_type := case
    when p_result_status = 'void' then 'voided'
    when p_result_status = 'manual_review' then 'manual_review'
    when match_row.result_revision = 0 then 'recorded'
    else 'corrected'
  end;

  update public.matches
  set
    status = p_match_status,
    result_status = p_result_status,
    home_score_90 = case when p_result_status in ('void', 'manual_review') then null else p_normal_time_home_goals end,
    away_score_90 = case when p_result_status in ('void', 'manual_review') then null else p_normal_time_away_goals end,
    home_score_aet = case when p_result_status = 'confirmed' then p_after_extra_time_home_goals else null end,
    away_score_aet = case when p_result_status = 'confirmed' then p_after_extra_time_away_goals else null end,
    home_penalties = case when p_result_status = 'confirmed' then p_penalty_home_goals else null end,
    away_penalties = case when p_result_status = 'confirmed' then p_penalty_away_goals else null end,
    result_method = stored_method,
    winner_tournament_team_id = case when p_result_status = 'confirmed' then p_winner_tournament_team_id else null end,
    result_revision = next_revision,
    result_source = p_result_source,
    result_confirmed_at = case when p_result_status = 'confirmed' then now() else null end,
    result_confirmed_by_user_id = case when p_result_status = 'confirmed' then p_recorded_by_user_id else null end,
    last_synced_at = case when p_result_source = 'api' then now() else last_synced_at end
  where id = p_match_id;

  insert into public.match_result_events (
    tournament_id,
    match_id,
    result_revision,
    event_type,
    result_source,
    recorded_by_user_id,
    snapshot
  ) values (
    p_tournament_id,
    p_match_id,
    next_revision,
    event_type,
    p_result_source,
    p_recorded_by_user_id,
    jsonb_build_object(
      'match_status', p_match_status,
      'result_status', p_result_status,
      'home_team_id', home_team_id,
      'away_team_id', away_team_id,
      'normal_time_home_goals', p_normal_time_home_goals,
      'normal_time_away_goals', p_normal_time_away_goals,
      'after_extra_time_home_goals', p_after_extra_time_home_goals,
      'after_extra_time_away_goals', p_after_extra_time_away_goals,
      'penalty_home_goals', p_penalty_home_goals,
      'penalty_away_goals', p_penalty_away_goals,
      'decision_method', p_decision_method,
      'winner_tournament_team_id', p_winner_tournament_team_id
    )
  );

  update public.match_slots
  set resolved_tournament_team_id = null, resolved_at = null
  where tournament_id = p_tournament_id
    and source_match_id = p_match_id
    and source_type in ('match_winner', 'match_loser');

  if p_result_status = 'confirmed' and p_winner_tournament_team_id is not null then
    update public.match_slots
    set
      resolved_tournament_team_id = case
        when source_type = 'match_winner' then p_winner_tournament_team_id
        when source_type = 'match_loser' then case
          when p_winner_tournament_team_id = home_team_id then away_team_id else home_team_id end
      end,
      resolved_at = now()
    where tournament_id = p_tournament_id
      and source_match_id = p_match_id
      and source_type in ('match_winner', 'match_loser');
  end if;

  scoring_run_id := private.euro28_recalculate_points(p_tournament_id, p_match_id);

  return jsonb_build_object(
    'match_id', p_match_id,
    'result_revision', next_revision,
    'result_status', p_result_status,
    'scoring_run_id', scoring_run_id
  );
end;
$$;

create or replace function public.get_competition_leaderboard(
  p_tournament_id uuid,
  p_competition_key text
)
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  match_points integer,
  bracket_points integer,
  total_points integer,
  scored_match_count integer,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    dense_rank() over (order by totals.total_points desc) as rank,
    totals.user_id,
    profile.display_name,
    totals.match_points,
    totals.bracket_points,
    totals.total_points,
    totals.scored_match_count,
    totals.updated_at
  from public.prediction_totals totals
  join public.profiles profile on profile.id = totals.user_id
  join public.tournaments tournament on tournament.id = totals.tournament_id
  where totals.tournament_id = p_tournament_id
    and totals.competition_key = p_competition_key
    and p_competition_key in ('original', 'ko_predictor')
    and tournament.is_public = true
  order by totals.total_points desc, profile.display_name, totals.user_id;
$$;

create or replace function public.get_my_competition_points(
  p_tournament_id uuid,
  p_competition_key text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'competition_key', totals.competition_key,
    'match_points', totals.match_points,
    'bracket_points', totals.bracket_points,
    'total_points', totals.total_points,
    'scored_match_count', totals.scored_match_count,
    'match_breakdown', coalesce((
      select jsonb_agg(jsonb_build_object(
        'match_id', points.match_id,
        'exact_score_points', points.exact_score_points,
        'correct_outcome_points', points.correct_outcome_points,
        'advancing_team_points', points.advancing_team_points,
        'decision_method_points', points.decision_method_points,
        'joker_multiplier', points.joker_multiplier,
        'total_points', points.total_points,
        'result_revision', points.result_revision
      ) order by match_row.match_number)
      from public.prediction_match_points points
      join public.matches match_row on match_row.id = points.match_id
      where points.prediction_set_id = totals.prediction_set_id
    ), '[]'::jsonb),
    'bracket_breakdown', coalesce((
      select jsonb_agg(jsonb_build_object(
        'milestone', points.milestone,
        'tournament_team_id', points.tournament_team_id,
        'points', points.points
      ) order by points.milestone, points.tournament_team_id)
      from public.prediction_bracket_points points
      where points.prediction_set_id = totals.prediction_set_id
    ), '[]'::jsonb)
  )
  from public.prediction_totals totals
  where totals.tournament_id = p_tournament_id
    and totals.user_id = auth.uid()
    and totals.competition_key = p_competition_key
    and p_competition_key in ('original', 'ko_predictor');
$$;

alter table public.match_result_events enable row level security;
alter table public.scoring_runs enable row level security;
alter table public.prediction_match_points enable row level security;
alter table public.prediction_bracket_points enable row level security;
alter table public.prediction_totals enable row level security;

create policy prediction_match_points_owner_read
on public.prediction_match_points
for select to authenticated
using (
  exists (
    select 1 from public.prediction_sets prediction_set
    where prediction_set.id = prediction_match_points.prediction_set_id
      and prediction_set.user_id = auth.uid()
  )
);

create policy prediction_bracket_points_owner_read
on public.prediction_bracket_points
for select to authenticated
using (
  exists (
    select 1 from public.prediction_sets prediction_set
    where prediction_set.id = prediction_bracket_points.prediction_set_id
      and prediction_set.user_id = auth.uid()
  )
);

create policy prediction_totals_owner_read
on public.prediction_totals
for select to authenticated
using (user_id = auth.uid());

revoke all on table
  public.match_result_events,
  public.scoring_runs,
  public.prediction_match_points,
  public.prediction_bracket_points,
  public.prediction_totals
from public, anon, authenticated;

grant select on table
  public.prediction_match_points,
  public.prediction_bracket_points,
  public.prediction_totals
to authenticated;

grant all on table
  public.match_result_events,
  public.scoring_runs,
  public.prediction_match_points,
  public.prediction_bracket_points,
  public.prediction_totals
to service_role;

revoke all on function private.euro28_score_outcome(integer, integer) from public, anon, authenticated;
revoke all on function private.euro28_prevent_result_event_mutation() from public, anon, authenticated;
revoke all on function private.euro28_guard_point_competition() from public, anon, authenticated;
revoke all on function private.euro28_recalculate_points(uuid, uuid) from public, anon, authenticated;
revoke all on function private.euro28_record_match_result(uuid, uuid, text, text, integer, integer, integer, integer, integer, integer, text, uuid, text, uuid) from public, anon, authenticated;

grant execute on function private.euro28_recalculate_points(uuid, uuid) to service_role;
grant execute on function private.euro28_record_match_result(uuid, uuid, text, text, integer, integer, integer, integer, integer, integer, text, uuid, text, uuid) to service_role;

revoke all on function public.get_competition_leaderboard(uuid, text) from public, anon, authenticated;
revoke all on function public.get_my_competition_points(uuid, text) from public, anon, authenticated;
grant execute on function public.get_competition_leaderboard(uuid, text) to authenticated;
grant execute on function public.get_my_competition_points(uuid, text) to authenticated;

revoke insert, update, delete on table
  public.matches,
  public.match_slots,
  public.match_result_events,
  public.scoring_runs,
  public.prediction_match_points,
  public.prediction_bracket_points,
  public.prediction_totals
from anon, authenticated;

alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

commit;
