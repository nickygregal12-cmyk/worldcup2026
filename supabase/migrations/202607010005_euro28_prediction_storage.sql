-- Euro 2028 prediction-storage foundation (Migration 005).
--
-- This migration creates read-secured storage only. It deliberately does not
-- create the final atomic save RPC, browser write policies, authentication UI,
-- profiles, leagues, scoring runs, result entry or guest prediction storage.

begin;

create table public.scoring_rulesets (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  ruleset_key text not null,
  version integer not null check (version > 0),
  status text not null default 'provisional'
    check (status in ('provisional', 'locked', 'retired')),
  match_exact_score_points integer not null check (match_exact_score_points >= 0),
  match_correct_outcome_points integer not null check (match_correct_outcome_points >= 0),
  knockout_advancing_team_points integer not null check (knockout_advancing_team_points >= 0),
  knockout_decision_method_points integer not null check (knockout_decision_method_points >= 0),
  round_of_16_team_points integer not null check (round_of_16_team_points >= 0),
  quarter_final_team_points integer not null check (quarter_final_team_points >= 0),
  semi_final_team_points integer not null check (semi_final_team_points >= 0),
  finalist_points integer not null check (finalist_points >= 0),
  champion_points integer not null check (champion_points >= 0),
  joker_multiplier numeric(8, 3) not null check (joker_multiplier > 0),
  group_stage_joker_cap integer check (group_stage_joker_cap is null or group_stage_joker_cap >= 0),
  knockout_joker_cap integer check (knockout_joker_cap is null or knockout_joker_cap >= 0),
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ruleset_key),
  unique (tournament_id, version),
  unique (id, tournament_id),
  check (match_exact_score_points >= match_correct_outcome_points),
  check (status <> 'provisional' or locked_at is null)
);

comment on table public.scoring_rulesets is
  'Versioned Euro scoring configuration. Prediction rows never copy point values or joker limits.';
comment on column public.scoring_rulesets.ruleset_key is
  'Stable application-facing identifier matching the central scoring configuration version.';
comment on column public.scoring_rulesets.group_stage_joker_cap is
  'Nullable while the exact group-stage joker cap remains unresolved.';
comment on column public.scoring_rulesets.knockout_joker_cap is
  'Nullable while the exact knockout joker cap remains unresolved.';

create or replace function public.guard_scoring_ruleset_state()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.status in ('locked', 'retired') then
    raise exception 'Locked or retired scoring rulesets are immutable';
  end if;

  if new.status = 'locked' and new.locked_at is null then
    new.locked_at = now();
  elsif new.status = 'provisional' and new.locked_at is not null then
    raise exception 'A provisional scoring ruleset cannot have locked_at set';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_scoring_ruleset_state() from public;

create trigger scoring_rulesets_guard_state
before insert or update on public.scoring_rulesets
for each row execute function public.guard_scoring_ruleset_state();

create trigger scoring_rulesets_set_updated_at
before update on public.scoring_rulesets
for each row execute function public.set_updated_at();

alter table public.tournaments
  add column active_scoring_ruleset_id uuid,
  add column prediction_contract_version text not null default 'euro28-prediction-db-v2',
  add column prediction_locked_at timestamptz,
  add constraint tournaments_prediction_contract_version_not_blank
    check (btrim(prediction_contract_version) <> '');

comment on column public.tournaments.active_scoring_ruleset_id is
  'The centrally selected versioned ruleset for new prediction sets.';
comment on column public.tournaments.prediction_contract_version is
  'The active prediction data/behaviour contract version.';
comment on column public.tournaments.prediction_locked_at is
  'Persisted monotonic global content lock. Unlike prediction_lock_at, this cannot be cleared or moved after it is set.';

alter table public.tournaments
  add constraint tournaments_active_scoring_ruleset_same_tournament_fk
  foreign key (active_scoring_ruleset_id, id)
  references public.scoring_rulesets(id, tournament_id)
  on delete restrict;

create or replace function public.guard_tournament_prediction_lock()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.prediction_locked_at is not null
     and new.prediction_locked_at is distinct from old.prediction_locked_at then
    raise exception 'prediction_locked_at is monotonic and cannot be changed or cleared';
  end if;

  if old.prediction_locked_at is null
     and new.prediction_locked_at is not null
     and new.prediction_locked_at > now() then
    raise exception 'prediction_locked_at cannot be persisted in the future';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_tournament_prediction_lock() from public;

create trigger tournaments_guard_prediction_lock
before update of prediction_locked_at on public.tournaments
for each row execute function public.guard_tournament_prediction_lock();

create table public.prediction_sets (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  contract_version text not null,
  scoring_ruleset_id uuid not null,
  revision bigint not null default 0 check (revision >= 0),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, user_id),
  unique (id, tournament_id),
  foreign key (scoring_ruleset_id, tournament_id)
    references public.scoring_rulesets(id, tournament_id) on delete restrict,
  check (btrim(contract_version) <> '')
);

comment on table public.prediction_sets is
  'One always-live prediction set per authenticated user and tournament.';
comment on column public.prediction_sets.submitted_at is
  'Reversible personal review-mode state only. It is not an eligibility or scoring gate.';
comment on column public.prediction_sets.revision is
  'Optimistic revision consumed later by the atomic full-bundle save route.';

create table public.match_predictions (
  id uuid primary key default gen_random_uuid(),
  prediction_set_id uuid not null,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  match_id uuid not null,
  predicted_home_tournament_team_id uuid not null,
  predicted_away_tournament_team_id uuid not null,
  home_score_90 integer not null check (home_score_90 between 0 and 99),
  away_score_90 integer not null check (away_score_90 between 0 and 99),
  advancing_tournament_team_id uuid,
  decision_method text
    check (decision_method is null or decision_method in ('normal_time', 'extra_time', 'penalties')),
  joker_applied boolean not null default false,
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
    (advancing_tournament_team_id is null and decision_method is null)
    or (advancing_tournament_team_id is not null and decision_method is not null)
  ),
  check (
    advancing_tournament_team_id is null
    or advancing_tournament_team_id in (
      predicted_home_tournament_team_id,
      predicted_away_tournament_team_id
    )
  ),
  check (
    decision_method is null
    or (decision_method = 'normal_time' and home_score_90 <> away_score_90)
    or (decision_method in ('extra_time', 'penalties') and home_score_90 = away_score_90)
  )
);

comment on table public.match_predictions is
  'Stored match predictions. Scores always mean 90 minutes plus added time.';
comment on column public.match_predictions.advancing_tournament_team_id is
  'Knockout progression choice, stored separately from the predicted 90-minute score.';
comment on column public.match_predictions.decision_method is
  'Knockout decision method only: normal_time, extra_time or penalties.';
comment on column public.match_predictions.joker_applied is
  'Joker allocation. Future trusted writes must enforce ruleset caps and the target match kick-off.';

create table public.prediction_grace_windows (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid not null,
  granted_by_user_id uuid not null references auth.users(id) on delete restrict,
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  reason text,
  revoked_at timestamptz,
  revoked_by_user_id uuid references auth.users(id) on delete restrict,
  revocation_reason text,
  created_at timestamptz not null default now(),
  foreign key (match_id, tournament_id)
    references public.matches(id, tournament_id) on delete cascade,
  check (expires_at > granted_at),
  check (reason is null or btrim(reason) <> ''),
  check (revocation_reason is null or btrim(revocation_reason) <> ''),
  check (revoked_at is null or revoked_at >= granted_at),
  check (
    (revoked_at is null and revoked_by_user_id is null and revocation_reason is null)
    or (revoked_at is not null and revoked_by_user_id is not null)
  )
);

comment on table public.prediction_grace_windows is
  'Audited exceptional access for one user and one specific match. It never reopens the tournament globally.';
comment on column public.prediction_grace_windows.expires_at is
  'The earlier of this timestamp and match kick-off ends usable grace; database time is authoritative.';

create index scoring_rulesets_tournament_status_idx
  on public.scoring_rulesets (tournament_id, status, version desc);
create index prediction_sets_user_tournament_idx
  on public.prediction_sets (user_id, tournament_id);
create index prediction_sets_ruleset_idx
  on public.prediction_sets (scoring_ruleset_id);
create index match_predictions_set_idx
  on public.match_predictions (prediction_set_id, match_id);
create index match_predictions_match_idx
  on public.match_predictions (match_id);
create index match_predictions_joker_idx
  on public.match_predictions (prediction_set_id, joker_applied)
  where joker_applied = true;
create index prediction_grace_windows_lookup_idx
  on public.prediction_grace_windows (tournament_id, user_id, match_id, expires_at desc);
create index prediction_grace_windows_grantor_idx
  on public.prediction_grace_windows (granted_by_user_id, granted_at desc);

create trigger prediction_sets_set_updated_at
before update on public.prediction_sets
for each row execute function public.set_updated_at();

create trigger match_predictions_set_updated_at
before update on public.match_predictions
for each row execute function public.set_updated_at();

-- RLS is enabled at creation time. Prediction data has authenticated read paths
-- only; no browser role receives INSERT, UPDATE or DELETE privileges or policies.
alter table public.scoring_rulesets enable row level security;
alter table public.prediction_sets enable row level security;
alter table public.match_predictions enable row level security;
alter table public.prediction_grace_windows enable row level security;

create policy scoring_rulesets_public_read
on public.scoring_rulesets
for select
to anon, authenticated
using (
  status <> 'retired'
  and exists (
    select 1
    from public.tournaments t
    where t.id = scoring_rulesets.tournament_id
      and t.is_public = true
  )
);

create policy prediction_sets_owner_or_post_lock_read
on public.prediction_sets
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.tournaments t
    where t.id = prediction_sets.tournament_id
      and t.is_public = true
      and (
        t.prediction_locked_at is not null
        or (t.prediction_lock_at is not null and now() >= t.prediction_lock_at)
      )
  )
);

create policy match_predictions_owner_or_post_lock_read
on public.match_predictions
for select
to authenticated
using (
  exists (
    select 1
    from public.prediction_sets ps
    join public.tournaments t on t.id = ps.tournament_id
    where ps.id = match_predictions.prediction_set_id
      and ps.tournament_id = match_predictions.tournament_id
      and (
        ps.user_id = auth.uid()
        or (
          t.is_public = true
          and (
            t.prediction_locked_at is not null
            or (t.prediction_lock_at is not null and now() >= t.prediction_lock_at)
          )
        )
      )
  )
);

create policy prediction_grace_windows_subject_or_grantor_read
on public.prediction_grace_windows
for select
to authenticated
using (
  auth.uid() = user_id
  or auth.uid() = granted_by_user_id
  or auth.uid() = revoked_by_user_id
);

revoke all on table
  public.scoring_rulesets,
  public.prediction_sets,
  public.match_predictions,
  public.prediction_grace_windows
from public, anon, authenticated;

grant select on table public.scoring_rulesets to anon, authenticated;
grant select on table
  public.prediction_sets,
  public.match_predictions,
  public.prediction_grace_windows
to authenticated;

grant all on table
  public.scoring_rulesets,
  public.prediction_sets,
  public.match_predictions,
  public.prediction_grace_windows
to service_role;

insert into public.scoring_rulesets (
  id,
  tournament_id,
  ruleset_key,
  version,
  status,
  match_exact_score_points,
  match_correct_outcome_points,
  knockout_advancing_team_points,
  knockout_decision_method_points,
  round_of_16_team_points,
  quarter_final_team_points,
  semi_final_team_points,
  finalist_points,
  champion_points,
  joker_multiplier,
  group_stage_joker_cap,
  knockout_joker_cap
)
values (
  'e0285000-0000-4000-8000-000000000001',
  'e0280000-0000-4000-8000-000000000001',
  'euro28-scoring-provisional-v2',
  2,
  'provisional',
  30,
  10,
  10,
  5,
  10,
  15,
  20,
  25,
  50,
  2.000,
  null,
  null
);

update public.tournaments
set
  active_scoring_ruleset_id = 'e0285000-0000-4000-8000-000000000001',
  prediction_contract_version = 'euro28-prediction-db-v2'
where id = 'e0280000-0000-4000-8000-000000000001';

-- Fail the migration if the canonical tournament was not linked to the seed
-- ruleset. This guards against silently applying Migration 005 to the wrong
-- tournament foundation.
do $$
begin
  if not exists (
    select 1
    from public.tournaments t
    join public.scoring_rulesets sr
      on sr.id = t.active_scoring_ruleset_id
     and sr.tournament_id = t.id
    where t.id = 'e0280000-0000-4000-8000-000000000001'
      and t.prediction_contract_version = 'euro28-prediction-db-v2'
      and sr.ruleset_key = 'euro28-scoring-provisional-v2'
      and sr.group_stage_joker_cap is null
      and sr.knockout_joker_cap is null
  ) then
    raise exception 'Euro 2028 prediction ruleset foundation was not linked correctly';
  end if;
end;
$$;

commit;
