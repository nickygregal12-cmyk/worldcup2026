-- Euro 2028 core tournament/reference schema.
--
-- This is the first active Euro migration. It deliberately does not include
-- users, predictions, leagues or scoring. Those areas will be added through
-- separate reviewed migrations after this foundation is verified locally.
--
-- The inherited WC26 migration is preserved under:
-- supabase/reference/wc26-migrations/

begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  short_name text not null,
  edition_year integer not null check (edition_year between 1900 and 2200),
  timezone text not null default 'Europe/London',
  format_code text not null,
  team_count integer not null check (team_count > 1),
  group_count integer not null check (group_count >= 0),
  teams_per_group integer check (teams_per_group is null or teams_per_group > 1),
  best_third_qualifiers integer not null default 0 check (best_third_qualifiers >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'configured', 'open', 'live', 'complete', 'archived')),
  is_public boolean not null default false,
  is_provisional boolean not null default true,
  prediction_lock_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  format_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at is null or ends_at is null or ends_at > starts_at),
  check (prediction_lock_at is null or starts_at is null or prediction_lock_at <= starts_at)
);

comment on table public.tournaments is
  'Tournament editions and their format-level configuration.';
comment on column public.tournaments.format_config is
  'Version-controlled tournament structure. Team identities and fixtures belong in related tables.';

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_name text not null,
  country_code text,
  uefa_code text,
  flag_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  check (uefa_code is null or uefa_code ~ '^[A-Z]{3}$')
);

create unique index teams_uefa_code_unique
  on public.teams (uefa_code)
  where uefa_code is not null;

comment on table public.teams is
  'Reusable national-team reference data. Tournament participation is stored separately.';

create table public.tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid references public.teams(id) on delete restrict,
  slot_code text not null,
  qualification_status text not null default 'provisional'
    check (qualification_status in ('provisional', 'qualified', 'withdrawn', 'replaced')),
  seed_pot integer check (seed_pot is null or seed_pot > 0),
  is_host boolean not null default false,
  is_provisional boolean not null default true,
  display_order integer check (display_order is null or display_order > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, slot_code),
  unique (tournament_id, team_id),
  unique (id, tournament_id)
);

comment on table public.tournament_teams is
  'Teams occupying tournament slots. A slot may remain unresolved until qualification or the draw.';

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  city text not null,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  timezone text not null,
  capacity integer check (capacity is null or capacity > 0),
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180)
);

create table public.tournament_venues (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete restrict,
  is_provisional boolean not null default true,
  display_order integer check (display_order is null or display_order > 0),
  created_at timestamptz not null default now(),
  primary key (tournament_id, venue_id)
);

create table public.tournament_stages (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  code text not null,
  name text not null,
  stage_type text not null check (stage_type in ('group', 'knockout', 'classification')),
  sequence integer not null check (sequence > 0),
  expected_match_count integer check (expected_match_count is null or expected_match_count >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, code),
  unique (tournament_id, sequence),
  unique (id, tournament_id),
  check (starts_at is null or ends_at is null or ends_at > starts_at)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  stage_id uuid not null,
  code text not null,
  name text not null,
  sequence integer not null check (sequence > 0),
  team_limit integer not null check (team_limit > 1),
  automatic_qualifier_count integer not null default 0
    check (automatic_qualifier_count >= 0),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, code),
  unique (stage_id, sequence),
  unique (id, tournament_id),
  foreign key (stage_id, tournament_id)
    references public.tournament_stages(id, tournament_id) on delete cascade,
  check (automatic_qualifier_count <= team_limit)
);

create table public.group_memberships (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  group_id uuid not null,
  tournament_team_id uuid not null,
  draw_position integer not null check (draw_position > 0),
  position_code text not null,
  is_provisional boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, draw_position),
  unique (group_id, tournament_team_id),
  unique (tournament_id, position_code),
  foreign key (group_id, tournament_id)
    references public.groups(id, tournament_id) on delete cascade,
  foreign key (tournament_team_id, tournament_id)
    references public.tournament_teams(id, tournament_id) on delete cascade
);

comment on column public.group_memberships.position_code is
  'Stable bracket-facing slot such as A1, A2, B3. It is not a final-table position.';

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  stage_id uuid not null,
  group_id uuid,
  venue_id uuid,
  match_number integer not null check (match_number > 0),
  external_id text,
  kickoff_at timestamptz,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'paused', 'completed', 'postponed', 'cancelled', 'abandoned')),
  home_score_90 integer check (home_score_90 is null or home_score_90 >= 0),
  away_score_90 integer check (away_score_90 is null or away_score_90 >= 0),
  home_score_aet integer check (home_score_aet is null or home_score_aet >= 0),
  away_score_aet integer check (away_score_aet is null or away_score_aet >= 0),
  home_penalties integer check (home_penalties is null or home_penalties >= 0),
  away_penalties integer check (away_penalties is null or away_penalties >= 0),
  result_method text
    check (result_method is null or result_method in ('regulation', 'extra_time', 'penalties', 'awarded')),
  winner_tournament_team_id uuid,
  attendance integer check (attendance is null or attendance >= 0),
  source_payload jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, match_number),
  unique (tournament_id, external_id),
  unique (id, tournament_id),
  foreign key (stage_id, tournament_id)
    references public.tournament_stages(id, tournament_id) on delete restrict,
  foreign key (group_id, tournament_id)
    references public.groups(id, tournament_id) on delete restrict,
  foreign key (tournament_id, venue_id)
    references public.tournament_venues(tournament_id, venue_id) on delete restrict,
  foreign key (winner_tournament_team_id, tournament_id)
    references public.tournament_teams(id, tournament_id) on delete restrict,
  check (
    (home_score_aet is null and away_score_aet is null)
    or (home_score_aet is not null and away_score_aet is not null)
  ),
  check (
    (home_penalties is null and away_penalties is null)
    or (home_penalties is not null and away_penalties is not null)
  ),
  check (
    result_method <> 'extra_time'
    or (home_score_aet is not null and away_score_aet is not null)
  ),
  check (
    result_method <> 'penalties'
    or (
      home_score_aet is not null
      and away_score_aet is not null
      and home_penalties is not null
      and away_penalties is not null
    )
  )
);

comment on table public.matches is
  'Tournament fixtures and official results. Match participants are resolved through match_slots.';
comment on column public.matches.home_score_90 is
  'Score after regulation time, excluding extra time and penalties.';
comment on column public.matches.home_score_aet is
  'Score after extra time, excluding penalty-shootout kicks.';

create table public.match_slots (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  match_id uuid not null,
  side text not null check (side in ('home', 'away')),
  source_type text not null
    check (source_type in (
      'tournament_team',
      'group_position',
      'best_third',
      'match_winner',
      'match_loser',
      'placeholder'
    )),
  source_tournament_team_id uuid,
  source_group_id uuid,
  source_match_id uuid,
  source_position integer check (source_position is null or source_position > 0),
  rule_code text,
  rule_data jsonb not null default '{}'::jsonb,
  resolved_tournament_team_id uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, side),
  foreign key (match_id, tournament_id)
    references public.matches(id, tournament_id) on delete cascade,
  foreign key (source_tournament_team_id, tournament_id)
    references public.tournament_teams(id, tournament_id) on delete restrict,
  foreign key (source_group_id, tournament_id)
    references public.groups(id, tournament_id) on delete restrict,
  foreign key (source_match_id, tournament_id)
    references public.matches(id, tournament_id) on delete restrict,
  foreign key (resolved_tournament_team_id, tournament_id)
    references public.tournament_teams(id, tournament_id) on delete restrict,
  check (source_match_id is null or source_match_id <> match_id),
  check (
    case source_type
      when 'tournament_team' then source_tournament_team_id is not null
      when 'group_position' then source_group_id is not null and source_position is not null
      when 'best_third' then rule_code is not null
      when 'match_winner' then source_match_id is not null
      when 'match_loser' then source_match_id is not null
      when 'placeholder' then true
      else false
    end
  )
);

comment on table public.match_slots is
  'Stable home/away source rules and their currently resolved tournament team.';
comment on column public.match_slots.rule_code is
  'A versioned bracket rule identifier. Do not infer bracket rules from team names.';

create index tournament_teams_tournament_id_idx
  on public.tournament_teams (tournament_id);
create index tournament_stages_tournament_id_idx
  on public.tournament_stages (tournament_id, sequence);
create index groups_tournament_id_idx
  on public.groups (tournament_id, sequence);
create index group_memberships_group_id_idx
  on public.group_memberships (group_id, draw_position);
create index matches_tournament_stage_idx
  on public.matches (tournament_id, stage_id, match_number);
create index matches_kickoff_idx
  on public.matches (kickoff_at)
  where kickoff_at is not null;
create index match_slots_match_id_idx
  on public.match_slots (match_id, side);
create index match_slots_resolved_team_idx
  on public.match_slots (resolved_tournament_team_id)
  where resolved_tournament_team_id is not null;

create trigger tournaments_set_updated_at
before update on public.tournaments
for each row execute function public.set_updated_at();

create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create trigger tournament_teams_set_updated_at
before update on public.tournament_teams
for each row execute function public.set_updated_at();

create trigger venues_set_updated_at
before update on public.venues
for each row execute function public.set_updated_at();

create trigger tournament_stages_set_updated_at
before update on public.tournament_stages
for each row execute function public.set_updated_at();

create trigger groups_set_updated_at
before update on public.groups
for each row execute function public.set_updated_at();

create trigger group_memberships_set_updated_at
before update on public.group_memberships
for each row execute function public.set_updated_at();

create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

create trigger match_slots_set_updated_at
before update on public.match_slots
for each row execute function public.set_updated_at();

-- Public reference data is readable only when its tournament is published.
-- There are deliberately no browser write policies in this first migration.
alter table public.tournaments enable row level security;
alter table public.teams enable row level security;
alter table public.tournament_teams enable row level security;
alter table public.venues enable row level security;
alter table public.tournament_venues enable row level security;
alter table public.tournament_stages enable row level security;
alter table public.groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.matches enable row level security;
alter table public.match_slots enable row level security;

create policy tournaments_public_read
on public.tournaments
for select
to anon, authenticated
using (is_public = true);

create policy teams_public_read
on public.teams
for select
to anon, authenticated
using (is_active = true);

create policy tournament_teams_public_read
on public.tournament_teams
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tournaments t
    where t.id = tournament_teams.tournament_id
      and t.is_public = true
  )
);

create policy venues_public_read
on public.venues
for select
to anon, authenticated
using (is_active = true);

create policy tournament_venues_public_read
on public.tournament_venues
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tournaments t
    where t.id = tournament_venues.tournament_id
      and t.is_public = true
  )
);

create policy tournament_stages_public_read
on public.tournament_stages
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tournaments t
    where t.id = tournament_stages.tournament_id
      and t.is_public = true
  )
);

create policy groups_public_read
on public.groups
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tournaments t
    where t.id = groups.tournament_id
      and t.is_public = true
  )
);

create policy group_memberships_public_read
on public.group_memberships
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tournaments t
    where t.id = group_memberships.tournament_id
      and t.is_public = true
  )
);

create policy matches_public_read
on public.matches
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tournaments t
    where t.id = matches.tournament_id
      and t.is_public = true
  )
);

create policy match_slots_public_read
on public.match_slots
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tournaments t
    where t.id = match_slots.tournament_id
      and t.is_public = true
  )
);

revoke all on table
  public.tournaments,
  public.teams,
  public.tournament_teams,
  public.venues,
  public.tournament_venues,
  public.tournament_stages,
  public.groups,
  public.group_memberships,
  public.matches,
  public.match_slots
from anon, authenticated;

grant select on table
  public.tournaments,
  public.teams,
  public.tournament_teams,
  public.venues,
  public.tournament_venues,
  public.tournament_stages,
  public.groups,
  public.group_memberships,
  public.matches,
  public.match_slots
to anon, authenticated;

grant all on table
  public.tournaments,
  public.teams,
  public.tournament_teams,
  public.venues,
  public.tournament_venues,
  public.tournament_stages,
  public.groups,
  public.group_memberships,
  public.matches,
  public.match_slots
to service_role;

-- Canonical tournament structure. Teams, venues, fixtures and confirmed dates
-- are intentionally left for later reviewed data migrations/seed scenarios.
insert into public.tournaments (
  id,
  code,
  name,
  short_name,
  edition_year,
  timezone,
  format_code,
  team_count,
  group_count,
  teams_per_group,
  best_third_qualifiers,
  status,
  is_public,
  is_provisional,
  format_config
)
values (
  'e0280000-0000-4000-8000-000000000001',
  'euro-2028',
  'UEFA EURO 2028',
  'EURO 2028',
  2028,
  'Europe/London',
  'uefa-euro-24-v1',
  24,
  6,
  4,
  4,
  'configured',
  true,
  true,
  jsonb_build_object(
    'version', 1,
    'groupStage', jsonb_build_object(
      'groups', 6,
      'teamsPerGroup', 4,
      'automaticQualifyingPositions', jsonb_build_array(1, 2),
      'bestThirdCount', 4
    ),
    'knockoutStages', jsonb_build_array(
      'round_of_16',
      'quarter_final',
      'semi_final',
      'final'
    ),
    'thirdPlacePlayoff', false
  )
);

insert into public.tournament_stages (
  id,
  tournament_id,
  code,
  name,
  stage_type,
  sequence,
  expected_match_count
)
values
  ('e0281000-0000-4000-8000-000000000001', 'e0280000-0000-4000-8000-000000000001', 'group', 'Group stage', 'group', 1, 36),
  ('e0281000-0000-4000-8000-000000000002', 'e0280000-0000-4000-8000-000000000001', 'round_of_16', 'Round of 16', 'knockout', 2, 8),
  ('e0281000-0000-4000-8000-000000000003', 'e0280000-0000-4000-8000-000000000001', 'quarter_final', 'Quarter-finals', 'knockout', 3, 4),
  ('e0281000-0000-4000-8000-000000000004', 'e0280000-0000-4000-8000-000000000001', 'semi_final', 'Semi-finals', 'knockout', 4, 2),
  ('e0281000-0000-4000-8000-000000000005', 'e0280000-0000-4000-8000-000000000001', 'final', 'Final', 'knockout', 5, 1);

insert into public.groups (
  id,
  tournament_id,
  stage_id,
  code,
  name,
  sequence,
  team_limit,
  automatic_qualifier_count
)
values
  ('e0282000-0000-4000-8000-000000000001', 'e0280000-0000-4000-8000-000000000001', 'e0281000-0000-4000-8000-000000000001', 'A', 'Group A', 1, 4, 2),
  ('e0282000-0000-4000-8000-000000000002', 'e0280000-0000-4000-8000-000000000001', 'e0281000-0000-4000-8000-000000000001', 'B', 'Group B', 2, 4, 2),
  ('e0282000-0000-4000-8000-000000000003', 'e0280000-0000-4000-8000-000000000001', 'e0281000-0000-4000-8000-000000000001', 'C', 'Group C', 3, 4, 2),
  ('e0282000-0000-4000-8000-000000000004', 'e0280000-0000-4000-8000-000000000001', 'e0281000-0000-4000-8000-000000000001', 'D', 'Group D', 4, 4, 2),
  ('e0282000-0000-4000-8000-000000000005', 'e0280000-0000-4000-8000-000000000001', 'e0281000-0000-4000-8000-000000000001', 'E', 'Group E', 5, 4, 2),
  ('e0282000-0000-4000-8000-000000000006', 'e0280000-0000-4000-8000-000000000001', 'e0281000-0000-4000-8000-000000000001', 'F', 'Group F', 6, 4, 2);

commit;
