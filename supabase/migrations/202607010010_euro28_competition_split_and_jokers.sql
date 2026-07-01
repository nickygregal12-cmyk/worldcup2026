-- Euro 2028 competition split and joker controls (Migration 010).
--
-- The original predictor and the KO Predictor are separate competitions:
--   original      = 36 group score predictions + 15 pre-tournament bracket picks
--   ko_predictor  = 15 real knockout-match score predictions once participants resolve
--
-- Original-bracket picks never store scores, decision methods or jokers. KO Predictor
-- rows never contribute to the original prediction set or its future leaderboard.

begin;

alter table public.prediction_sets
  add column competition_key text not null default 'original';

alter table public.prediction_sets
  add constraint prediction_sets_competition_key_check
  check (competition_key in ('original', 'ko_predictor'));

alter table public.prediction_sets
  drop constraint if exists prediction_sets_tournament_id_user_id_key;

alter table public.prediction_sets
  add constraint prediction_sets_tournament_user_competition_key
  unique (tournament_id, user_id, competition_key);

comment on column public.prediction_sets.competition_key is
  'Separate competition namespace. Original and KO Predictor revisions, points and leaderboards must never be combined.';

create table public.bracket_predictions (
  id uuid primary key default gen_random_uuid(),
  prediction_set_id uuid not null,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  match_id uuid not null,
  predicted_home_tournament_team_id uuid not null,
  predicted_away_tournament_team_id uuid not null,
  advancing_tournament_team_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (prediction_set_id, match_id),
  foreign key (prediction_set_id, tournament_id)
    references public.prediction_sets(id, tournament_id) on delete cascade,
  foreign key (match_id, tournament_id)
    references public.matches(id, tournament_id) on delete cascade,
  foreign key (predicted_home_tournament_team_id, tournament_id)
    references public.tournament_teams(id, tournament_id) on delete restrict,
  foreign key (predicted_away_tournament_team_id, tournament_id)
    references public.tournament_teams(id, tournament_id) on delete restrict,
  foreign key (advancing_tournament_team_id, tournament_id)
    references public.tournament_teams(id, tournament_id) on delete restrict,
  check (predicted_home_tournament_team_id <> predicted_away_tournament_team_id),
  check (
    advancing_tournament_team_id in (
      predicted_home_tournament_team_id,
      predicted_away_tournament_team_id
    )
  )
);

comment on table public.bracket_predictions is
  'Original pre-tournament knockout-bracket progression picks. No score, decision method or joker is stored here.';

create trigger bracket_predictions_set_updated_at
before update on public.bracket_predictions
for each row execute function public.set_updated_at();

alter table public.prediction_grace_windows
  add column competition_key text not null default 'original';

alter table public.prediction_grace_windows
  add constraint prediction_grace_windows_competition_key_check
  check (competition_key in ('original', 'ko_predictor'));

comment on column public.prediction_grace_windows.competition_key is
  'The one competition affected by the exception. Grace never crosses between original and KO Predictor.';

-- Preserve any Stage 7 account bracket choices, but deliberately discard the
-- score/method/joker fields that must not exist in the original bracket.
insert into public.bracket_predictions (
  prediction_set_id,
  tournament_id,
  match_id,
  predicted_home_tournament_team_id,
  predicted_away_tournament_team_id,
  advancing_tournament_team_id,
  created_at,
  updated_at
)
select
  prediction.prediction_set_id,
  prediction.tournament_id,
  prediction.match_id,
  prediction.predicted_home_tournament_team_id,
  prediction.predicted_away_tournament_team_id,
  prediction.advancing_tournament_team_id,
  prediction.created_at,
  prediction.updated_at
from public.match_predictions prediction
join public.prediction_sets prediction_set
  on prediction_set.id = prediction.prediction_set_id
 and prediction_set.tournament_id = prediction.tournament_id
join public.matches match_row
  on match_row.id = prediction.match_id
 and match_row.tournament_id = prediction.tournament_id
where prediction_set.competition_key = 'original'
  and match_row.match_number between 37 and 51
  and prediction.advancing_tournament_team_id is not null
on conflict (prediction_set_id, match_id) do nothing;

delete from public.match_predictions prediction
using public.prediction_sets prediction_set, public.matches match_row
where prediction_set.id = prediction.prediction_set_id
  and prediction_set.tournament_id = prediction.tournament_id
  and match_row.id = prediction.match_id
  and match_row.tournament_id = prediction.tournament_id
  and prediction_set.competition_key = 'original'
  and match_row.match_number between 37 and 51;

update public.scoring_rulesets
set
  group_stage_joker_cap = 5,
  knockout_joker_cap = 5,
  updated_at = now()
where tournament_id = 'e0280000-0000-4000-8000-000000000001'
  and ruleset_key = 'euro28-scoring-provisional-v2'
  and status = 'provisional';

comment on column public.scoring_rulesets.group_stage_joker_cap is
  'Five jokers across the 36 original group-stage score predictions.';
comment on column public.scoring_rulesets.knockout_joker_cap is
  'Five jokers across the separate KO Predictor real-match competition. Never applies to original bracket picks.';

create or replace function public.guard_prediction_row_competition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  set_competition text;
  target_match_number integer;
begin
  select competition_key
  into set_competition
  from public.prediction_sets
  where id = new.prediction_set_id
    and tournament_id = new.tournament_id;

  select match_number
  into target_match_number
  from public.matches
  where id = new.match_id
    and tournament_id = new.tournament_id;

  if set_competition is null or target_match_number is null then
    raise exception 'Prediction set or match was not found';
  end if;

  if tg_table_name = 'match_predictions' then
    if set_competition = 'original' and target_match_number > 36 then
      raise exception 'Original match predictions may contain group matches only';
    end if;
    if set_competition = 'ko_predictor' and target_match_number < 37 then
      raise exception 'KO Predictor rows may contain knockout matches only';
    end if;
  elsif tg_table_name = 'bracket_predictions' then
    if set_competition <> 'original' or target_match_number < 37 then
      raise exception 'Bracket picks belong only to the original knockout bracket';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_prediction_row_competition() from public, anon, authenticated;

create trigger match_predictions_guard_competition
before insert or update on public.match_predictions
for each row execute function public.guard_prediction_row_competition();

create trigger bracket_predictions_guard_competition
before insert or update on public.bracket_predictions
for each row execute function public.guard_prediction_row_competition();

create or replace function private.euro28_has_active_grace(
  p_tournament_id uuid,
  p_user_id uuid,
  p_match_id uuid,
  p_competition_key text,
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
      and grace.competition_key = p_competition_key
      and grace.revoked_at is null
      and grace.granted_at <= p_at
      and grace.expires_at > p_at
      and match_row.status not in ('live', 'paused', 'completed', 'abandoned')
      and (match_row.kickoff_at is null or match_row.kickoff_at > p_at)
  );
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
  select private.euro28_has_active_grace(
    p_tournament_id,
    p_user_id,
    p_match_id,
    'original',
    p_at
  );
$$;

create or replace function private.euro28_grant_prediction_grace(
  p_tournament_id uuid,
  p_user_id uuid,
  p_match_id uuid,
  p_competition_key text,
  p_granted_by_user_id uuid,
  p_expires_at timestamptz,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches%rowtype;
  grace_id uuid;
begin
  if p_competition_key not in ('original', 'ko_predictor') then
    raise exception using errcode = '22023', message = 'Unsupported prediction competition';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception using errcode = '22023', message = 'A grace reason is required';
  end if;

  select * into match_row
  from public.matches
  where id = p_match_id and tournament_id = p_tournament_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'The grace target match was not found';
  end if;
  if match_row.status in ('live', 'paused', 'completed', 'abandoned')
     or (match_row.kickoff_at is not null and match_row.kickoff_at <= clock_timestamp()) then
    raise exception using errcode = 'P0001', message = 'Grace cannot be granted for a started match';
  end if;
  if p_expires_at <= clock_timestamp() then
    raise exception using errcode = '22023', message = 'Grace expiry must be in the future';
  end if;
  if match_row.kickoff_at is not null and p_expires_at > match_row.kickoff_at then
    raise exception using errcode = '22023', message = 'Grace cannot extend beyond match kick-off';
  end if;

  insert into public.prediction_grace_windows (
    tournament_id,
    user_id,
    match_id,
    competition_key,
    granted_by_user_id,
    expires_at,
    reason
  ) values (
    p_tournament_id,
    p_user_id,
    p_match_id,
    p_competition_key,
    p_granted_by_user_id,
    p_expires_at,
    btrim(p_reason)
  ) returning id into grace_id;

  return grace_id;
end;
$$;

create or replace function private.euro28_revoke_prediction_grace(
  p_grace_id uuid,
  p_revoked_by_user_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception using errcode = '22023', message = 'A revocation reason is required';
  end if;

  update public.prediction_grace_windows
  set
    revoked_at = clock_timestamp(),
    revoked_by_user_id = p_revoked_by_user_id,
    revocation_reason = btrim(p_reason)
  where id = p_grace_id
    and revoked_at is null;

  if not found then
    raise exception using errcode = 'P0002', message = 'Active grace window was not found';
  end if;
end;
$$;

-- The original competition accepts group score rows and bracket-pick rows in one
-- atomic request. Bracket rows use null scores/method and can never carry jokers.
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
  bracket_prediction_count integer;
  group_joker_count integer;
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

  select count(*) into prediction_count
  from private.euro28_prediction_rows(p_predictions);

  if prediction_count > 51 or prediction_count <> jsonb_array_length(p_predictions) then
    raise exception using errcode = '22023', message = 'Every original prediction row must match the expected schema';
  end if;
  if exists (
    select 1 from private.euro28_prediction_rows(p_predictions)
    group by match_id having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'Prediction bundle contains duplicate matches';
  end if;

  if exists (
    select 1
    from private.euro28_prediction_rows(p_predictions) prediction
    left join public.matches match_row
      on match_row.id = prediction.match_id
     and match_row.tournament_id = p_tournament_id
    where match_row.id is null
       or prediction.predicted_home_tournament_team_id is null
       or prediction.predicted_away_tournament_team_id is null
       or prediction.predicted_home_tournament_team_id = prediction.predicted_away_tournament_team_id
  ) then
    raise exception using errcode = '22023', message = 'Prediction rows must contain a valid match and two participants';
  end if;

  if exists (
    select 1
    from private.euro28_prediction_rows(p_predictions) prediction
    join public.matches match_row
      on match_row.id = prediction.match_id
     and match_row.tournament_id = p_tournament_id
    where match_row.match_number <= 36
      and (
        prediction.home_score_90 is null
        or prediction.away_score_90 is null
        or prediction.home_score_90 not between 0 and 99
        or prediction.away_score_90 not between 0 and 99
        or prediction.advancing_tournament_team_id is not null
        or prediction.decision_method is not null
      )
  ) then
    raise exception using errcode = '22023', message = 'Original group rows require only complete 90-minute scores';
  end if;

  if exists (
    select 1
    from private.euro28_prediction_rows(p_predictions) prediction
    join public.matches match_row
      on match_row.id = prediction.match_id
     and match_row.tournament_id = p_tournament_id
    where match_row.match_number >= 37
      and (
        prediction.home_score_90 is not null
        or prediction.away_score_90 is not null
        or prediction.advancing_tournament_team_id is null
        or prediction.decision_method is not null
        or prediction.joker_applied
      )
  ) then
    raise exception using errcode = '22023', message = 'Original bracket picks contain only an advancing team and never a score, method or joker';
  end if;

  if exists (
    select 1
    from private.euro28_prediction_rows(p_predictions) prediction
    join public.matches match_row
      on match_row.id = prediction.match_id
     and match_row.tournament_id = p_tournament_id
    join public.match_slots home_slot
      on home_slot.match_id = match_row.id and home_slot.side = 'home'
    join public.match_slots away_slot
      on away_slot.match_id = match_row.id and away_slot.side = 'away'
    where match_row.match_number <= 36
      and (
        prediction.predicted_home_tournament_team_id <> home_slot.source_tournament_team_id
        or prediction.predicted_away_tournament_team_id <> away_slot.source_tournament_team_id
      )
  ) then
    raise exception using errcode = '22023', message = 'Group prediction participants do not match the official fixture';
  end if;

  select
    count(*) filter (where match_row.match_number <= 36),
    count(*) filter (where match_row.match_number >= 37),
    count(*) filter (where match_row.match_number <= 36 and prediction.joker_applied)
  into group_prediction_count, bracket_prediction_count, group_joker_count
  from private.euro28_prediction_rows(p_predictions) prediction
  join public.matches match_row
    on match_row.id = prediction.match_id
   and match_row.tournament_id = p_tournament_id;

  if bracket_prediction_count > 0 and group_prediction_count <> 36 then
    raise exception using errcode = '22023', message = 'All 36 group predictions are required before saving bracket picks';
  end if;

  if bracket_prediction_count > 0 and exists (
    select 1
    from private.euro28_prediction_rows(p_predictions) prediction
    join public.matches match_row
      on match_row.id = prediction.match_id
     and match_row.tournament_id = p_tournament_id
     and match_row.match_number >= 37
    left join private.euro28_expected_knockout_participants(p_tournament_id, p_predictions) expected
      on expected.match_id = prediction.match_id
    where expected.match_id is null
       or not expected.participants_resolved
       or prediction.predicted_home_tournament_team_id <> expected.home_team_id
       or prediction.predicted_away_tournament_team_id <> expected.away_team_id
       or prediction.advancing_tournament_team_id not in (expected.home_team_id, expected.away_team_id)
  ) then
    raise exception using errcode = '22023', message = 'Bracket pick participants do not match the canonical predicted bracket';
  end if;

  if active_ruleset.group_stage_joker_cap is null then
    raise exception using errcode = 'P0001', message = 'The group-stage joker cap is not configured';
  end if;
  if group_joker_count > active_ruleset.group_stage_joker_cap then
    raise exception using errcode = '22023', message = 'The group-stage joker cap has been exceeded';
  end if;
  if p_submitted and (group_prediction_count <> 36 or bracket_prediction_count <> 15) then
    raise exception using errcode = '22023', message = 'All 36 group scores and 15 bracket picks are required before entering review mode';
  end if;
  if p_source = 'guest_import' and (global_locked or group_prediction_count <> 36 or bracket_prediction_count <> 15) then
    raise exception using errcode = 'P0001', message = 'Guest import requires a complete original predictor before the global lock';
  end if;

  select * into prediction_set_row
  from public.prediction_sets
  where tournament_id = p_tournament_id
    and user_id = caller_user_id
    and competition_key = 'original'
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
      tournament_id,
      user_id,
      competition_key,
      contract_version,
      scoring_ruleset_id,
      revision,
      submitted_at,
      last_save_source
    ) values (
      p_tournament_id,
      caller_user_id,
      'original',
      'euro28-original-predictor-v1',
      active_ruleset.id,
      0,
      null,
      'account'
    ) returning * into prediction_set_row;
  end if;

  if p_source = 'guest_import' and (
    exists (select 1 from public.match_predictions where prediction_set_id = prediction_set_row.id)
    or exists (select 1 from public.bracket_predictions where prediction_set_id = prediction_set_row.id)
  ) then
    raise exception using errcode = 'P0001', message = 'Guest import cannot overwrite existing account predictions';
  end if;

  with incoming as (
    select prediction.*, match_row.match_number
    from private.euro28_prediction_rows(p_predictions) prediction
    join public.matches match_row on match_row.id = prediction.match_id
  ),
  existing_rows as (
    select
      prediction.match_id,
      prediction.predicted_home_tournament_team_id,
      prediction.predicted_away_tournament_team_id,
      prediction.home_score_90,
      prediction.away_score_90,
      null::uuid as advancing_tournament_team_id
    from public.match_predictions prediction
    where prediction.prediction_set_id = prediction_set_row.id
    union all
    select
      bracket.match_id,
      bracket.predicted_home_tournament_team_id,
      bracket.predicted_away_tournament_team_id,
      null::integer,
      null::integer,
      bracket.advancing_tournament_team_id
    from public.bracket_predictions bracket
    where bracket.prediction_set_id = prediction_set_row.id
  ),
  changes as (
    select
      coalesce(existing.match_id, incoming.match_id) as match_id,
      existing.match_id is null as is_insert,
      incoming.match_id is null as is_delete,
      existing.predicted_home_tournament_team_id is distinct from incoming.predicted_home_tournament_team_id
        or existing.predicted_away_tournament_team_id is distinct from incoming.predicted_away_tournament_team_id
        or existing.home_score_90 is distinct from incoming.home_score_90
        or existing.away_score_90 is distinct from incoming.away_score_90
        or existing.advancing_tournament_team_id is distinct from incoming.advancing_tournament_team_id as content_changed
    from existing_rows existing
    full join incoming on incoming.match_id = existing.match_id
  )
  select exists (
    select 1
    from changes
    where (is_insert or is_delete or content_changed)
      and not private.euro28_has_active_grace(
        p_tournament_id,
        caller_user_id,
        match_id,
        'original',
        save_time
      )
  ) into content_change_without_grace;

  with incoming as (
    select prediction.*
    from private.euro28_prediction_rows(p_predictions) prediction
    join public.matches match_row
      on match_row.id = prediction.match_id
     and match_row.match_number <= 36
  ),
  existing_rows as (
    select * from public.match_predictions
    where prediction_set_id = prediction_set_row.id
  ),
  changes as (
    select
      coalesce(existing.match_id, incoming.match_id) as match_id,
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
    raise exception using errcode = 'P0001', message = 'Original predictor content is globally locked';
  end if;
  if locked_joker_change then
    raise exception using errcode = 'P0001', message = 'A group joker cannot be changed after its match has started';
  end if;
  if global_locked and submitted_change then
    raise exception using errcode = 'P0001', message = 'Review mode cannot be changed after the global lock';
  end if;

  delete from public.match_predictions existing
  where existing.prediction_set_id = prediction_set_row.id
    and not exists (
      select 1
      from private.euro28_prediction_rows(p_predictions) incoming
      join public.matches match_row on match_row.id = incoming.match_id
      where match_row.match_number <= 36
        and incoming.match_id = existing.match_id
    );

  delete from public.bracket_predictions existing
  where existing.prediction_set_id = prediction_set_row.id
    and not exists (
      select 1
      from private.euro28_prediction_rows(p_predictions) incoming
      join public.matches match_row on match_row.id = incoming.match_id
      where match_row.match_number >= 37
        and incoming.match_id = existing.match_id
    );

  insert into public.match_predictions (
    prediction_set_id,
    tournament_id,
    match_id,
    predicted_home_tournament_team_id,
    predicted_away_tournament_team_id,
    home_score_90,
    away_score_90,
    advancing_tournament_team_id,
    decision_method,
    joker_applied
  )
  select
    prediction_set_row.id,
    p_tournament_id,
    prediction.match_id,
    prediction.predicted_home_tournament_team_id,
    prediction.predicted_away_tournament_team_id,
    prediction.home_score_90,
    prediction.away_score_90,
    null,
    null,
    prediction.joker_applied
  from private.euro28_prediction_rows(p_predictions) prediction
  join public.matches match_row
    on match_row.id = prediction.match_id
   and match_row.match_number <= 36
  on conflict (prediction_set_id, match_id)
  do update set
    predicted_home_tournament_team_id = excluded.predicted_home_tournament_team_id,
    predicted_away_tournament_team_id = excluded.predicted_away_tournament_team_id,
    home_score_90 = excluded.home_score_90,
    away_score_90 = excluded.away_score_90,
    advancing_tournament_team_id = null,
    decision_method = null,
    joker_applied = excluded.joker_applied;

  insert into public.bracket_predictions (
    prediction_set_id,
    tournament_id,
    match_id,
    predicted_home_tournament_team_id,
    predicted_away_tournament_team_id,
    advancing_tournament_team_id
  )
  select
    prediction_set_row.id,
    p_tournament_id,
    prediction.match_id,
    prediction.predicted_home_tournament_team_id,
    prediction.predicted_away_tournament_team_id,
    prediction.advancing_tournament_team_id
  from private.euro28_prediction_rows(p_predictions) prediction
  join public.matches match_row
    on match_row.id = prediction.match_id
   and match_row.match_number >= 37
  on conflict (prediction_set_id, match_id)
  do update set
    predicted_home_tournament_team_id = excluded.predicted_home_tournament_team_id,
    predicted_away_tournament_team_id = excluded.predicted_away_tournament_team_id,
    advancing_tournament_team_id = excluded.advancing_tournament_team_id;

  update public.prediction_sets
  set
    revision = revision + 1,
    contract_version = 'euro28-original-predictor-v1',
    submitted_at = case
      when global_locked then submitted_at
      when p_submitted then coalesce(submitted_at, save_time)
      else null
    end,
    guest_imported_at = case when p_source = 'guest_import' then save_time else guest_imported_at end,
    last_save_source = p_source
  where id = prediction_set_row.id
  returning * into prediction_set_row;

  return jsonb_build_object(
    'prediction_set_id', prediction_set_row.id,
    'tournament_id', prediction_set_row.tournament_id,
    'competition_key', prediction_set_row.competition_key,
    'revision', prediction_set_row.revision,
    'submitted_at', prediction_set_row.submitted_at,
    'guest_imported_at', prediction_set_row.guest_imported_at,
    'last_save_source', prediction_set_row.last_save_source,
    'saved_prediction_count', prediction_count,
    'saved_group_count', group_prediction_count,
    'saved_bracket_count', bracket_prediction_count
  );
end;
$$;

create or replace function public.save_my_ko_prediction_bundle(
  p_tournament_id uuid,
  p_expected_revision bigint,
  p_predictions jsonb
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
  joker_count integer;
  set_exists boolean := false;
  locked_change_without_grace boolean;
begin
  if caller_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required to save KO Predictor entries';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception using errcode = '22023', message = 'expected_revision must be a non-negative integer';
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

  select * into active_ruleset
  from public.scoring_rulesets
  where id = tournament_row.active_scoring_ruleset_id
    and tournament_id = tournament_row.id;

  if not found or active_ruleset.status = 'retired' then
    raise exception using errcode = 'P0001', message = 'The active scoring ruleset is unavailable';
  end if;
  if active_ruleset.knockout_joker_cap is null then
    raise exception using errcode = 'P0001', message = 'The KO Predictor joker cap is not configured';
  end if;

  select count(*) into prediction_count
  from private.euro28_prediction_rows(p_predictions);

  if prediction_count > 15 or prediction_count <> jsonb_array_length(p_predictions) then
    raise exception using errcode = '22023', message = 'Every KO Predictor row must match the expected schema';
  end if;
  if exists (
    select 1 from private.euro28_prediction_rows(p_predictions)
    group by match_id having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'KO Predictor bundle contains duplicate matches';
  end if;

  if exists (
    select 1
    from private.euro28_prediction_rows(p_predictions) prediction
    left join public.matches match_row
      on match_row.id = prediction.match_id
     and match_row.tournament_id = p_tournament_id
    left join public.match_slots home_slot
      on home_slot.match_id = match_row.id and home_slot.side = 'home'
    left join public.match_slots away_slot
      on away_slot.match_id = match_row.id and away_slot.side = 'away'
    where match_row.id is null
       or match_row.match_number < 37
       or home_slot.resolved_tournament_team_id is null
       or away_slot.resolved_tournament_team_id is null
       or prediction.predicted_home_tournament_team_id <> home_slot.resolved_tournament_team_id
       or prediction.predicted_away_tournament_team_id <> away_slot.resolved_tournament_team_id
       or prediction.home_score_90 is null
       or prediction.away_score_90 is null
       or prediction.home_score_90 not between 0 and 99
       or prediction.away_score_90 not between 0 and 99
       or prediction.advancing_tournament_team_id not in (
         home_slot.resolved_tournament_team_id,
         away_slot.resolved_tournament_team_id
       )
       or prediction.decision_method is null
       or (prediction.decision_method = 'normal_time' and prediction.home_score_90 = prediction.away_score_90)
       or (prediction.decision_method in ('extra_time', 'penalties') and prediction.home_score_90 <> prediction.away_score_90)
  ) then
    raise exception using errcode = '22023', message = 'KO Predictor rows require a resolved real fixture, 90-minute score, advancing team and valid decision method';
  end if;

  select count(*) filter (where joker_applied)
  into joker_count
  from private.euro28_prediction_rows(p_predictions);

  if joker_count > active_ruleset.knockout_joker_cap then
    raise exception using errcode = '22023', message = 'The KO Predictor joker cap has been exceeded';
  end if;

  select * into prediction_set_row
  from public.prediction_sets
  where tournament_id = p_tournament_id
    and user_id = caller_user_id
    and competition_key = 'ko_predictor'
  for update;
  set_exists := found;

  if set_exists then
    if prediction_set_row.revision <> p_expected_revision then
      raise exception using errcode = '40001', message = 'KO Predictor revision is stale';
    end if;
  else
    if p_expected_revision <> 0 then
      raise exception using errcode = '40001', message = 'KO Predictor revision is stale';
    end if;
    insert into public.prediction_sets (
      tournament_id,
      user_id,
      competition_key,
      contract_version,
      scoring_ruleset_id,
      revision,
      submitted_at,
      last_save_source
    ) values (
      p_tournament_id,
      caller_user_id,
      'ko_predictor',
      'euro28-ko-predictor-v1',
      active_ruleset.id,
      0,
      null,
      'account'
    ) returning * into prediction_set_row;
  end if;

  with incoming as (
    select * from private.euro28_prediction_rows(p_predictions)
  ),
  existing_rows as (
    select * from public.match_predictions
    where prediction_set_id = prediction_set_row.id
  ),
  changes as (
    select
      coalesce(existing.match_id, incoming.match_id) as match_id,
      existing.match_id is null as is_insert,
      incoming.match_id is null as is_delete,
      existing.predicted_home_tournament_team_id is distinct from incoming.predicted_home_tournament_team_id
        or existing.predicted_away_tournament_team_id is distinct from incoming.predicted_away_tournament_team_id
        or existing.home_score_90 is distinct from incoming.home_score_90
        or existing.away_score_90 is distinct from incoming.away_score_90
        or existing.advancing_tournament_team_id is distinct from incoming.advancing_tournament_team_id
        or existing.decision_method is distinct from incoming.decision_method
        or existing.joker_applied is distinct from incoming.joker_applied as changed
    from existing_rows existing
    full join incoming on incoming.match_id = existing.match_id
  )
  select exists (
    select 1
    from changes
    join public.matches match_row on match_row.id = changes.match_id
    where (is_insert or is_delete or changed)
      and (
        match_row.status in ('live', 'paused', 'completed', 'abandoned')
        or (match_row.kickoff_at is not null and match_row.kickoff_at <= save_time)
      )
      and not private.euro28_has_active_grace(
        p_tournament_id,
        caller_user_id,
        changes.match_id,
        'ko_predictor',
        save_time
      )
  ) into locked_change_without_grace;

  if locked_change_without_grace then
    raise exception using errcode = 'P0001', message = 'A KO Predictor entry cannot change after its real match has started';
  end if;

  delete from public.match_predictions existing
  where existing.prediction_set_id = prediction_set_row.id
    and not exists (
      select 1
      from private.euro28_prediction_rows(p_predictions) incoming
      where incoming.match_id = existing.match_id
    );

  insert into public.match_predictions (
    prediction_set_id,
    tournament_id,
    match_id,
    predicted_home_tournament_team_id,
    predicted_away_tournament_team_id,
    home_score_90,
    away_score_90,
    advancing_tournament_team_id,
    decision_method,
    joker_applied
  )
  select
    prediction_set_row.id,
    p_tournament_id,
    prediction.match_id,
    prediction.predicted_home_tournament_team_id,
    prediction.predicted_away_tournament_team_id,
    prediction.home_score_90,
    prediction.away_score_90,
    prediction.advancing_tournament_team_id,
    prediction.decision_method,
    prediction.joker_applied
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
    contract_version = 'euro28-ko-predictor-v1',
    submitted_at = null,
    last_save_source = 'account'
  where id = prediction_set_row.id
  returning * into prediction_set_row;

  return jsonb_build_object(
    'prediction_set_id', prediction_set_row.id,
    'tournament_id', prediction_set_row.tournament_id,
    'competition_key', prediction_set_row.competition_key,
    'revision', prediction_set_row.revision,
    'saved_prediction_count', prediction_count,
    'joker_count', joker_count
  );
end;
$$;

-- Replace read policies so the original competition can become visible after
-- its global lock while KO Predictor entries remain private until a later,
-- explicitly controlled leaderboard/read stage.
drop policy if exists prediction_sets_owner_or_post_lock_read on public.prediction_sets;
create policy prediction_sets_owner_or_original_post_lock_read
on public.prediction_sets
for select
to authenticated
using (
  auth.uid() = user_id
  or (
    competition_key = 'original'
    and exists (
      select 1
      from public.tournaments tournament
      where tournament.id = prediction_sets.tournament_id
        and tournament.is_public = true
        and (
          tournament.prediction_locked_at is not null
          or (tournament.prediction_lock_at is not null and now() >= tournament.prediction_lock_at)
        )
    )
  )
);

drop policy if exists match_predictions_owner_or_post_lock_read on public.match_predictions;
create policy match_predictions_owner_or_original_post_lock_read
on public.match_predictions
for select
to authenticated
using (
  exists (
    select 1
    from public.prediction_sets prediction_set
    join public.tournaments tournament
      on tournament.id = prediction_set.tournament_id
    where prediction_set.id = match_predictions.prediction_set_id
      and prediction_set.tournament_id = match_predictions.tournament_id
      and (
        prediction_set.user_id = auth.uid()
        or (
          prediction_set.competition_key = 'original'
          and tournament.is_public = true
          and (
            tournament.prediction_locked_at is not null
            or (tournament.prediction_lock_at is not null and now() >= tournament.prediction_lock_at)
          )
        )
      )
  )
);

alter table public.bracket_predictions enable row level security;
create policy bracket_predictions_owner_or_original_post_lock_read
on public.bracket_predictions
for select
to authenticated
using (
  exists (
    select 1
    from public.prediction_sets prediction_set
    join public.tournaments tournament
      on tournament.id = prediction_set.tournament_id
    where prediction_set.id = bracket_predictions.prediction_set_id
      and prediction_set.tournament_id = bracket_predictions.tournament_id
      and prediction_set.competition_key = 'original'
      and (
        prediction_set.user_id = auth.uid()
        or (
          tournament.is_public = true
          and (
            tournament.prediction_locked_at is not null
            or (tournament.prediction_lock_at is not null and now() >= tournament.prediction_lock_at)
          )
        )
      )
  )
);

revoke all on table public.bracket_predictions from public, anon, authenticated;
grant select on table public.bracket_predictions to authenticated;
grant all on table public.bracket_predictions to service_role;

revoke all on function private.euro28_has_active_grace(uuid, uuid, uuid, text, timestamptz)
from public, anon, authenticated;
revoke all on function private.euro28_has_active_grace(uuid, uuid, uuid, timestamptz)
from public, anon, authenticated;
revoke all on function private.euro28_grant_prediction_grace(uuid, uuid, uuid, text, uuid, timestamptz, text)
from public, anon, authenticated;
revoke all on function private.euro28_revoke_prediction_grace(uuid, uuid, text)
from public, anon, authenticated;

grant execute on function private.euro28_grant_prediction_grace(uuid, uuid, uuid, text, uuid, timestamptz, text)
to service_role;
grant execute on function private.euro28_revoke_prediction_grace(uuid, uuid, text)
to service_role;

revoke all on function public.save_my_prediction_bundle(uuid, bigint, boolean, jsonb, text)
from public, anon, authenticated;
grant execute on function public.save_my_prediction_bundle(uuid, bigint, boolean, jsonb, text)
to authenticated;

revoke all on function public.save_my_ko_prediction_bundle(uuid, bigint, jsonb)
from public, anon, authenticated;
grant execute on function public.save_my_ko_prediction_bundle(uuid, bigint, jsonb)
to authenticated;

-- Ensure direct table writes remain unavailable to browser roles.
revoke insert, update, delete on table
  public.prediction_sets,
  public.match_predictions,
  public.bracket_predictions,
  public.prediction_grace_windows
from anon, authenticated;

-- Future public-schema functions remain fail-closed unless explicitly granted.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

-- Final migration guards.
do $$
begin
  if not exists (
    select 1
    from public.scoring_rulesets
    where tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and ruleset_key = 'euro28-scoring-provisional-v2'
      and group_stage_joker_cap = 5
      and knockout_joker_cap = 5
  ) then
    raise exception 'Euro joker caps were not configured as 5 group and 5 KO Predictor jokers';
  end if;

  if exists (
    select 1
    from public.match_predictions prediction
    join public.prediction_sets prediction_set on prediction_set.id = prediction.prediction_set_id
    join public.matches match_row on match_row.id = prediction.match_id
    where prediction_set.competition_key = 'original'
      and match_row.match_number >= 37
  ) then
    raise exception 'Original prediction sets still contain knockout score rows';
  end if;
end;
$$;

commit;
