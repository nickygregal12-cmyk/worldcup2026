-- Euro 2028 Stage 1, Batch 2: official venues and group-stage schedule.
--
-- UEFA confirmed the tournament schedule on 12 November 2025. This migration
-- records the nine official venues, official match numbers, group-slot
-- pairings, match dates and venues for all 36 group-stage matches.
--
-- Match-specific kick-off times are deliberately left null because UEFA states
-- that they will be confirmed after the final tournament draw in 2027.
-- Team identities also remain unresolved and provisional.

begin;

do $$
begin
  if not exists (
    select 1
    from public.tournaments
    where id = 'e0280000-0000-4000-8000-000000000001'
      and code = 'euro-2028'
  ) then
    raise exception 'Euro 2028 tournament baseline is missing';
  end if;

  if not exists (
    select 1
    from public.tournament_stages
    where id = 'e0281000-0000-4000-8000-000000000001'
      and tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and code = 'group'
      and expected_match_count = 36
  ) then
    raise exception 'Euro 2028 group-stage baseline is missing or invalid';
  end if;

  if (
    select count(*)
    from public.tournament_teams
    where tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and team_id is null
      and qualification_status = 'provisional'
      and is_provisional is true
  ) <> 24 then
    raise exception 'Expected 24 unresolved provisional Euro 2028 slots';
  end if;

  if (
    select count(*)
    from public.group_memberships
    where tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and is_provisional is true
  ) <> 24 then
    raise exception 'Expected 24 provisional Euro 2028 group memberships';
  end if;

  if exists (select 1 from public.matches) then
    raise exception 'Expected the matches table to be empty before adding the official schedule';
  end if;

  if exists (select 1 from public.match_slots) then
    raise exception 'Expected the match_slots table to be empty before adding the official schedule';
  end if;

  if exists (
    select 1
    from public.tournament_venues
    where tournament_id = 'e0280000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Expected Euro 2028 tournament venues to be empty before adding the official venues';
  end if;
end;
$$;

-- Date-only fields preserve confirmed dates without inventing kick-off times.
alter table public.tournaments
  add column starts_on date,
  add column ends_on date,
  add constraint tournaments_date_range_check
    check (starts_on is null or ends_on is null or ends_on >= starts_on);

alter table public.tournament_stages
  add column starts_on date,
  add column ends_on date,
  add constraint tournament_stages_date_range_check
    check (starts_on is null or ends_on is null or ends_on >= starts_on);

alter table public.matches
  add column fixture_code text not null,
  add column matchday integer,
  add column scheduled_date date,
  add column schedule_status text not null default 'provisional',
  add column participants_status text not null default 'provisional';

alter table public.matches
  add constraint matches_fixture_code_format_check
    check (fixture_code ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$'),
  add constraint matches_matchday_positive_check
    check (matchday is null or matchday > 0),
  add constraint matches_schedule_status_check
    check (schedule_status in ('provisional', 'official_date_venue', 'official_datetime')),
  add constraint matches_participants_status_check
    check (participants_status in ('provisional', 'confirmed')),
  add constraint matches_tournament_fixture_code_unique
    unique (tournament_id, fixture_code),
  add constraint matches_official_datetime_requires_kickoff_check
    check (schedule_status <> 'official_datetime' or kickoff_at is not null),
  add constraint matches_official_schedule_requires_date_venue_check
    check (
      schedule_status = 'provisional'
      or (scheduled_date is not null and venue_id is not null)
    );

comment on column public.tournaments.starts_on is
  'Official tournament start date when known independently of the first kick-off time.';
comment on column public.tournaments.ends_on is
  'Official tournament end date when known independently of the final kick-off time.';
comment on column public.tournament_stages.starts_on is
  'Official stage start date when known independently of match kick-off times.';
comment on column public.tournament_stages.ends_on is
  'Official stage end date when known independently of match kick-off times.';
comment on column public.matches.fixture_code is
  'Stable semantic fixture identifier. Bracket and application logic must not infer identity from team names.';
comment on column public.matches.matchday is
  'Stage-local matchday. Group-stage matches use matchdays 1 to 3.';
comment on column public.matches.scheduled_date is
  'Official local calendar date. kickoff_at remains null until the match-specific time is confirmed.';
comment on column public.matches.schedule_status is
  'Certainty of the date, venue and kick-off time. Official date/venue does not imply an official kick-off time.';
comment on column public.matches.participants_status is
  'Whether the actual team identities are still provisional or confirmed.';

create index matches_tournament_scheduled_date_idx
  on public.matches (tournament_id, scheduled_date, match_number);
create index matches_tournament_matchday_idx
  on public.matches (tournament_id, stage_id, matchday, match_number);

update public.tournaments
set
  starts_on = date '2028-06-09',
  ends_on = date '2028-07-09'
where id = 'e0280000-0000-4000-8000-000000000001';

update public.tournament_stages
set starts_on = dates.starts_on,
    ends_on = dates.ends_on
from (
  values
    ('group', date '2028-06-09', date '2028-06-21'),
    ('round_of_16', date '2028-06-24', date '2028-06-27'),
    ('quarter_final', date '2028-06-30', date '2028-07-01'),
    ('semi_final', date '2028-07-04', date '2028-07-05'),
    ('final', date '2028-07-09', date '2028-07-09')
) as dates(code, starts_on, ends_on)
where tournament_stages.tournament_id = 'e0280000-0000-4000-8000-000000000001'
  and tournament_stages.code = dates.code;

insert into public.venues (
  id,
  slug,
  name,
  city,
  country_code,
  timezone,
  capacity,
  is_active
)
values
  ('e0287000-0000-4000-8000-000000000001', 'national-stadium-of-wales', 'National Stadium of Wales', 'Cardiff', 'GB', 'Europe/London', 73000, true),
  ('e0287000-0000-4000-8000-000000000002', 'dublin-arena', 'Dublin Arena', 'Dublin', 'IE', 'Europe/Dublin', 50000, true),
  ('e0287000-0000-4000-8000-000000000003', 'hampden-park', 'Hampden Park', 'Glasgow', 'GB', 'Europe/London', 51000, true),
  ('e0287000-0000-4000-8000-000000000004', 'st-james-park', 'St James'' Park', 'Newcastle', 'GB', 'Europe/London', 50000, true),
  ('e0287000-0000-4000-8000-000000000005', 'manchester-city-stadium', 'Manchester City Stadium', 'Manchester', 'GB', 'Europe/London', 58000, true),
  ('e0287000-0000-4000-8000-000000000006', 'everton-stadium', 'Everton Stadium', 'Liverpool', 'GB', 'Europe/London', 50000, true),
  ('e0287000-0000-4000-8000-000000000007', 'villa-park', 'Villa Park', 'Birmingham', 'GB', 'Europe/London', 48000, true),
  ('e0287000-0000-4000-8000-000000000008', 'tottenham-hotspur-stadium', 'Tottenham Hotspur Stadium', 'London', 'GB', 'Europe/London', 60000, true),
  ('e0287000-0000-4000-8000-000000000009', 'wembley-stadium', 'Wembley Stadium', 'London', 'GB', 'Europe/London', 86000, true);

insert into public.tournament_venues (
  tournament_id,
  venue_id,
  is_provisional,
  display_order
)
select
  'e0280000-0000-4000-8000-000000000001',
  v.id,
  false,
  venue_order.display_order
from (
  values
    ('national-stadium-of-wales', 1),
    ('dublin-arena', 2),
    ('hampden-park', 3),
    ('st-james-park', 4),
    ('manchester-city-stadium', 5),
    ('everton-stadium', 6),
    ('villa-park', 7),
    ('tottenham-hotspur-stadium', 8),
    ('wembley-stadium', 9)
) as venue_order(slug, display_order)
join public.venues v on v.slug = venue_order.slug;

create temporary table euro28_official_group_schedule (
  match_number integer primary key,
  fixture_code text not null unique,
  group_code text not null,
  matchday integer not null,
  scheduled_date date not null,
  venue_slug text not null,
  home_slot text not null,
  away_slot text not null
) on commit drop;

insert into euro28_official_group_schedule (
  match_number,
  fixture_code,
  group_code,
  matchday,
  scheduled_date,
  venue_slug,
  home_slot,
  away_slot
)
values
  ( 1, 'GS-A-A1-A2', 'A', 1, date '2028-06-09', 'national-stadium-of-wales', 'A1', 'A2'),
  ( 2, 'GS-A-A3-A4', 'A', 1, date '2028-06-10', 'hampden-park', 'A3', 'A4'),
  ( 3, 'GS-B-B1-B2', 'B', 1, date '2028-06-10', 'manchester-city-stadium', 'B1', 'B2'),
  ( 4, 'GS-B-B3-B4', 'B', 1, date '2028-06-10', 'dublin-arena', 'B3', 'B4'),
  ( 5, 'GS-C-C1-C2', 'C', 1, date '2028-06-11', 'wembley-stadium', 'C1', 'C2'),
  ( 6, 'GS-C-C3-C4', 'C', 1, date '2028-06-11', 'villa-park', 'C3', 'C4'),
  ( 7, 'GS-D-D3-D4', 'D', 1, date '2028-06-11', 'everton-stadium', 'D3', 'D4'),
  ( 8, 'GS-D-D1-D2', 'D', 1, date '2028-06-12', 'tottenham-hotspur-stadium', 'D1', 'D2'),
  ( 9, 'GS-E-E1-E2', 'E', 1, date '2028-06-12', 'dublin-arena', 'E1', 'E2'),
  (10, 'GS-E-E3-E4', 'E', 1, date '2028-06-12', 'st-james-park', 'E3', 'E4'),
  (11, 'GS-F-F1-F2', 'F', 1, date '2028-06-13', 'hampden-park', 'F1', 'F2'),
  (12, 'GS-F-F3-F4', 'F', 1, date '2028-06-13', 'manchester-city-stadium', 'F3', 'F4'),
  (13, 'GS-A-A1-A3', 'A', 2, date '2028-06-14', 'national-stadium-of-wales', 'A1', 'A3'),
  (14, 'GS-A-A2-A4', 'A', 2, date '2028-06-14', 'everton-stadium', 'A2', 'A4'),
  (15, 'GS-B-B1-B3', 'B', 2, date '2028-06-14', 'wembley-stadium', 'B1', 'B3'),
  (16, 'GS-B-B2-B4', 'B', 2, date '2028-06-15', 'villa-park', 'B2', 'B4'),
  (17, 'GS-C-C1-C3', 'C', 2, date '2028-06-15', 'tottenham-hotspur-stadium', 'C1', 'C3'),
  (18, 'GS-C-C2-C4', 'C', 2, date '2028-06-15', 'st-james-park', 'C2', 'C4'),
  (19, 'GS-D-D1-D3', 'D', 2, date '2028-06-16', 'wembley-stadium', 'D1', 'D3'),
  (20, 'GS-D-D2-D4', 'D', 2, date '2028-06-16', 'manchester-city-stadium', 'D2', 'D4'),
  (21, 'GS-E-E1-E3', 'E', 2, date '2028-06-16', 'dublin-arena', 'E1', 'E3'),
  (22, 'GS-E-E2-E4', 'E', 2, date '2028-06-17', 'everton-stadium', 'E2', 'E4'),
  (23, 'GS-F-F1-F3', 'F', 2, date '2028-06-17', 'hampden-park', 'F1', 'F3'),
  (24, 'GS-F-F2-F4', 'F', 2, date '2028-06-17', 'st-james-park', 'F2', 'F4'),
  (25, 'GS-A-A4-A1', 'A', 3, date '2028-06-18', 'national-stadium-of-wales', 'A4', 'A1'),
  (26, 'GS-A-A2-A3', 'A', 3, date '2028-06-18', 'tottenham-hotspur-stadium', 'A2', 'A3'),
  (27, 'GS-B-B4-B1', 'B', 3, date '2028-06-19', 'wembley-stadium', 'B4', 'B1'),
  (28, 'GS-B-B2-B3', 'B', 3, date '2028-06-19', 'dublin-arena', 'B2', 'B3'),
  (29, 'GS-C-C4-C1', 'C', 3, date '2028-06-20', 'manchester-city-stadium', 'C4', 'C1'),
  (30, 'GS-C-C2-C3', 'C', 3, date '2028-06-20', 'everton-stadium', 'C2', 'C3'),
  (31, 'GS-D-D4-D1', 'D', 3, date '2028-06-20', 'villa-park', 'D4', 'D1'),
  (32, 'GS-D-D2-D3', 'D', 3, date '2028-06-20', 'st-james-park', 'D2', 'D3'),
  (33, 'GS-E-E4-E1', 'E', 3, date '2028-06-21', 'dublin-arena', 'E4', 'E1'),
  (34, 'GS-E-E2-E3', 'E', 3, date '2028-06-21', 'tottenham-hotspur-stadium', 'E2', 'E3'),
  (35, 'GS-F-F4-F1', 'F', 3, date '2028-06-21', 'hampden-park', 'F4', 'F1'),
  (36, 'GS-F-F2-F3', 'F', 3, date '2028-06-21', 'national-stadium-of-wales', 'F2', 'F3');

insert into public.matches (
  id,
  tournament_id,
  stage_id,
  group_id,
  venue_id,
  match_number,
  fixture_code,
  matchday,
  scheduled_date,
  kickoff_at,
  status,
  schedule_status,
  participants_status,
  source_payload
)
select
  ('e0285000-0000-4000-8000-' || lpad(s.match_number::text, 12, '0'))::uuid,
  'e0280000-0000-4000-8000-000000000001',
  'e0281000-0000-4000-8000-000000000001',
  g.id,
  v.id,
  s.match_number,
  s.fixture_code,
  s.matchday,
  s.scheduled_date,
  null,
  'scheduled',
  'official_date_venue',
  'provisional',
  jsonb_build_object(
    'scheduleSource', 'UEFA EURO 2028 Match Schedule',
    'scheduleVersion', '2025-11-12',
    'scheduleOfficial', true,
    'kickoffTimeStatus', 'pending_final_draw',
    'homeSlot', s.home_slot,
    'awaySlot', s.away_slot
  )
from euro28_official_group_schedule s
join public.groups g
  on g.tournament_id = 'e0280000-0000-4000-8000-000000000001'
 and g.code = s.group_code
join public.venues v
  on v.slug = s.venue_slug;

with slot_rows as (
  select
    s.match_number,
    'home'::text as side,
    s.home_slot as slot_code,
    ((s.match_number - 1) * 2 + 1) as slot_sequence
  from euro28_official_group_schedule s

  union all

  select
    s.match_number,
    'away'::text as side,
    s.away_slot as slot_code,
    ((s.match_number - 1) * 2 + 2) as slot_sequence
  from euro28_official_group_schedule s
)
insert into public.match_slots (
  id,
  tournament_id,
  match_id,
  side,
  source_type,
  source_tournament_team_id,
  rule_code,
  rule_data,
  resolved_tournament_team_id,
  resolved_at
)
select
  ('e0286000-0000-4000-8000-' || lpad(sr.slot_sequence::text, 12, '0'))::uuid,
  'e0280000-0000-4000-8000-000000000001',
  m.id,
  sr.side,
  'tournament_team',
  tt.id,
  'official_group_slot_v1',
  jsonb_build_object(
    'slotCode', sr.slot_code,
    'scheduleVersion', '2025-11-12',
    'participantsProvisional', true
  ),
  tt.id,
  now()
from slot_rows sr
join public.matches m
  on m.tournament_id = 'e0280000-0000-4000-8000-000000000001'
 and m.match_number = sr.match_number
join public.tournament_teams tt
  on tt.tournament_id = m.tournament_id
 and tt.slot_code = sr.slot_code;

do $$
declare
  venue_count integer;
  tournament_venue_count integer;
  match_count integer;
  match_slot_count integer;
begin
  select count(*)
  into venue_count
  from public.venues
  where id::text like 'e0287000-0000-4000-8000-%';

  if venue_count <> 9 then
    raise exception 'Expected 9 official Euro 2028 venues, found %', venue_count;
  end if;

  select count(*)
  into tournament_venue_count
  from public.tournament_venues
  where tournament_id = 'e0280000-0000-4000-8000-000000000001'
    and is_provisional is false;

  if tournament_venue_count <> 9 then
    raise exception 'Expected 9 confirmed Euro 2028 tournament venues, found %', tournament_venue_count;
  end if;

  select count(*)
  into match_count
  from public.matches
  where tournament_id = 'e0280000-0000-4000-8000-000000000001'
    and stage_id = 'e0281000-0000-4000-8000-000000000001';

  if match_count <> 36 then
    raise exception 'Expected 36 official group-stage schedule rows, found %', match_count;
  end if;

  select count(*)
  into match_slot_count
  from public.match_slots
  where tournament_id = 'e0280000-0000-4000-8000-000000000001';

  if match_slot_count <> 72 then
    raise exception 'Expected 72 group-stage match slots, found %', match_slot_count;
  end if;

  if exists (
    select 1
    from public.matches
    where tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and (
        scheduled_date is null
        or venue_id is null
        or kickoff_at is not null
        or schedule_status <> 'official_date_venue'
        or participants_status <> 'provisional'
      )
  ) then
    raise exception 'Every group match must have an official date and venue, no invented kick-off time, and provisional participants';
  end if;

  if exists (
    select 1
    from public.matches m
    left join public.match_slots home_slot
      on home_slot.match_id = m.id
     and home_slot.tournament_id = m.tournament_id
     and home_slot.side = 'home'
    left join public.match_slots away_slot
      on away_slot.match_id = m.id
     and away_slot.tournament_id = m.tournament_id
     and away_slot.side = 'away'
    where m.tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and (home_slot.id is null or away_slot.id is null)
  ) then
    raise exception 'Every group match must have one home and one away slot';
  end if;

  if exists (
    select 1
    from public.groups g
    left join public.matches m
      on m.group_id = g.id
     and m.tournament_id = g.tournament_id
    where g.tournament_id = 'e0280000-0000-4000-8000-000000000001'
    group by g.id
    having count(m.id) <> 6
  ) then
    raise exception 'Every Euro 2028 group must contain exactly six official schedule matches';
  end if;

  if exists (
    with appearances as (
      select
        source_tournament_team_id,
        count(*) as matches_played
      from public.match_slots
      where tournament_id = 'e0280000-0000-4000-8000-000000000001'
      group by source_tournament_team_id
    )
    select 1
    from appearances
    where matches_played <> 3
  ) then
    raise exception 'Every Euro 2028 group slot must appear in exactly three group matches';
  end if;
end;
$$;

commit;
