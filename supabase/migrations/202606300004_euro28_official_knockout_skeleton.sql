-- Euro 2028 Stage 1, Batch 3: official knockout match skeleton.
--
-- UEFA's match schedule fixes match numbers 37 to 51, their dates, venues and
-- route through the knockout bracket. The 2026-28 competition regulations also
-- fix the Round of 16 group-position sources and all 15 possible assignments
-- for the four best third-placed teams.
--
-- Match-specific kick-off times remain null until UEFA confirms them after the
-- final tournament draw. No actual team is resolved into a knockout slot here.

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

  if (
    select count(*)
    from public.matches
    where tournament_id = 'e0280000-0000-4000-8000-000000000001'
  ) <> 36 then
    raise exception 'Expected exactly 36 group-stage matches before adding the knockout skeleton';
  end if;

  if exists (
    select 1
    from public.matches
    where tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and match_number between 37 and 51
  ) then
    raise exception 'Euro 2028 knockout matches already exist';
  end if;

  if (
    select count(*)
    from public.match_slots
    where tournament_id = 'e0280000-0000-4000-8000-000000000001'
  ) <> 72 then
    raise exception 'Expected exactly 72 group-stage match slots before adding the knockout skeleton';
  end if;

  if (
    select count(*)
    from public.tournament_stages
    where tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and code in ('round_of_16', 'quarter_final', 'semi_final', 'final')
  ) <> 4 then
    raise exception 'Expected the four Euro 2028 knockout stages';
  end if;

  if (
    select count(*)
    from public.tournament_venues
    where tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and is_provisional is false
  ) <> 9 then
    raise exception 'Expected the nine confirmed Euro 2028 venues';
  end if;
end;
$$;

create temporary table euro28_official_knockout_schedule (
  match_number integer primary key,
  fixture_code text not null unique,
  stage_code text not null,
  scheduled_date date not null,
  venue_slug text not null
) on commit drop;

insert into euro28_official_knockout_schedule (
  match_number,
  fixture_code,
  stage_code,
  scheduled_date,
  venue_slug
)
values
  (37, 'R16-1A-2C',    'round_of_16', date '2028-06-24', 'national-stadium-of-wales'),
  (38, 'R16-2A-2B',    'round_of_16', date '2028-06-24', 'everton-stadium'),
  (39, 'R16-1B-BT3',   'round_of_16', date '2028-06-25', 'st-james-park'),
  (40, 'R16-1C-BT3',   'round_of_16', date '2028-06-25', 'manchester-city-stadium'),
  (41, 'R16-1F-BT3',   'round_of_16', date '2028-06-26', 'hampden-park'),
  (42, 'R16-2D-2E',    'round_of_16', date '2028-06-26', 'tottenham-hotspur-stadium'),
  (43, 'R16-1D-2F',    'round_of_16', date '2028-06-27', 'villa-park'),
  (44, 'R16-1E-BT3',   'round_of_16', date '2028-06-27', 'dublin-arena'),
  (45, 'QF-W39-W37',   'quarter_final', date '2028-06-30', 'wembley-stadium'),
  (46, 'QF-W41-W42',   'quarter_final', date '2028-06-30', 'dublin-arena'),
  (47, 'QF-W44-W43',   'quarter_final', date '2028-07-01', 'hampden-park'),
  (48, 'QF-W40-W38',   'quarter_final', date '2028-07-01', 'national-stadium-of-wales'),
  (49, 'SF-W45-W46',   'semi_final', date '2028-07-04', 'wembley-stadium'),
  (50, 'SF-W47-W48',   'semi_final', date '2028-07-05', 'wembley-stadium'),
  (51, 'F-W49-W50',    'final', date '2028-07-09', 'wembley-stadium');

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
  ts.id,
  null,
  v.id,
  s.match_number,
  s.fixture_code,
  null,
  s.scheduled_date,
  null,
  'scheduled',
  'official_date_venue',
  'provisional',
  jsonb_build_object(
    'scheduleSource', 'UEFA EURO 2028 Match Schedule',
    'scheduleVersion', '2025-11-12',
    'scheduleOfficial', true,
    'bracketSource', 'UEFA European Football Championship 2026-28 Regulations Article 21',
    'bracketVersion', '2026-06',
    'kickoffTimeStatus', 'pending_final_draw',
    'participantsResolved', false
  )
from euro28_official_knockout_schedule s
join public.tournament_stages ts
  on ts.tournament_id = 'e0280000-0000-4000-8000-000000000001'
 and ts.code = s.stage_code
join public.venues v
  on v.slug = s.venue_slug;

create temporary table euro28_knockout_slot_rules (
  match_number integer not null,
  side text not null check (side in ('home', 'away')),
  source_type text not null,
  source_group_code text,
  source_position integer,
  source_match_number integer,
  rule_code text not null,
  rule_data jsonb not null,
  primary key (match_number, side)
) on commit drop;

insert into euro28_knockout_slot_rules (
  match_number,
  side,
  source_type,
  source_group_code,
  source_position,
  source_match_number,
  rule_code,
  rule_data
)
values
  (37, 'home', 'group_position', 'A', 1, null, 'official_group_finish_v1', '{"groupCode":"A","position":1}'::jsonb),
  (37, 'away', 'group_position', 'C', 2, null, 'official_group_finish_v1', '{"groupCode":"C","position":2}'::jsonb),
  (38, 'home', 'group_position', 'A', 2, null, 'official_group_finish_v1', '{"groupCode":"A","position":2}'::jsonb),
  (38, 'away', 'group_position', 'B', 2, null, 'official_group_finish_v1', '{"groupCode":"B","position":2}'::jsonb),
  (39, 'home', 'group_position', 'B', 1, null, 'official_group_finish_v1', '{"groupCode":"B","position":1}'::jsonb),
  (39, 'away', 'best_third', null, 3, null, 'official_best_third_matrix_v1',
    '{
      "targetGroupWinner":"B",
      "eligibleGroupCodes":["A","D","E","F"],
      "assignmentByCombination":{
        "ABCD":"A","ABCE":"A","ABCF":"A","ABDE":"D","ABDF":"D",
        "ABEF":"E","ACDE":"E","ACDF":"F","ACEF":"E","ADEF":"E",
        "BCDE":"E","BCDF":"F","BCEF":"F","BDEF":"F","CDEF":"F"
      },
      "regulationMatch":1
    }'::jsonb),
  (40, 'home', 'group_position', 'C', 1, null, 'official_group_finish_v1', '{"groupCode":"C","position":1}'::jsonb),
  (40, 'away', 'best_third', null, 3, null, 'official_best_third_matrix_v1',
    '{
      "targetGroupWinner":"C",
      "eligibleGroupCodes":["D","E","F"],
      "assignmentByCombination":{
        "ABCD":"D","ABCE":"E","ABCF":"F","ABDE":"E","ABDF":"F",
        "ABEF":"F","ACDE":"D","ACDF":"D","ACEF":"F","ADEF":"F",
        "BCDE":"D","BCDF":"D","BCEF":"E","BDEF":"E","CDEF":"E"
      },
      "regulationMatch":7
    }'::jsonb),
  (41, 'home', 'group_position', 'F', 1, null, 'official_group_finish_v1', '{"groupCode":"F","position":1}'::jsonb),
  (41, 'away', 'best_third', null, 3, null, 'official_best_third_matrix_v1',
    '{
      "targetGroupWinner":"F",
      "eligibleGroupCodes":["A","B","C"],
      "assignmentByCombination":{
        "ABCD":"C","ABCE":"C","ABCF":"C","ABDE":"B","ABDF":"B",
        "ABEF":"A","ACDE":"A","ACDF":"A","ACEF":"A","ADEF":"A",
        "BCDE":"C","BCDF":"B","BCEF":"B","BDEF":"B","CDEF":"C"
      },
      "regulationMatch":3
    }'::jsonb),
  (42, 'home', 'group_position', 'D', 2, null, 'official_group_finish_v1', '{"groupCode":"D","position":2}'::jsonb),
  (42, 'away', 'group_position', 'E', 2, null, 'official_group_finish_v1', '{"groupCode":"E","position":2}'::jsonb),
  (43, 'home', 'group_position', 'D', 1, null, 'official_group_finish_v1', '{"groupCode":"D","position":1}'::jsonb),
  (43, 'away', 'group_position', 'F', 2, null, 'official_group_finish_v1', '{"groupCode":"F","position":2}'::jsonb),
  (44, 'home', 'group_position', 'E', 1, null, 'official_group_finish_v1', '{"groupCode":"E","position":1}'::jsonb),
  (44, 'away', 'best_third', null, 3, null, 'official_best_third_matrix_v1',
    '{
      "targetGroupWinner":"E",
      "eligibleGroupCodes":["A","B","C","D"],
      "assignmentByCombination":{
        "ABCD":"B","ABCE":"B","ABCF":"B","ABDE":"A","ABDF":"A",
        "ABEF":"B","ACDE":"C","ACDF":"C","ACEF":"C","ADEF":"D",
        "BCDE":"B","BCDF":"C","BCEF":"C","BDEF":"D","CDEF":"D"
      },
      "regulationMatch":5
    }'::jsonb),
  (45, 'home', 'match_winner', null, null, 39, 'official_knockout_winner_v1', '{"sourceMatchNumber":39}'::jsonb),
  (45, 'away', 'match_winner', null, null, 37, 'official_knockout_winner_v1', '{"sourceMatchNumber":37}'::jsonb),
  (46, 'home', 'match_winner', null, null, 41, 'official_knockout_winner_v1', '{"sourceMatchNumber":41}'::jsonb),
  (46, 'away', 'match_winner', null, null, 42, 'official_knockout_winner_v1', '{"sourceMatchNumber":42}'::jsonb),
  (47, 'home', 'match_winner', null, null, 44, 'official_knockout_winner_v1', '{"sourceMatchNumber":44}'::jsonb),
  (47, 'away', 'match_winner', null, null, 43, 'official_knockout_winner_v1', '{"sourceMatchNumber":43}'::jsonb),
  (48, 'home', 'match_winner', null, null, 40, 'official_knockout_winner_v1', '{"sourceMatchNumber":40}'::jsonb),
  (48, 'away', 'match_winner', null, null, 38, 'official_knockout_winner_v1', '{"sourceMatchNumber":38}'::jsonb),
  (49, 'home', 'match_winner', null, null, 45, 'official_knockout_winner_v1', '{"sourceMatchNumber":45}'::jsonb),
  (49, 'away', 'match_winner', null, null, 46, 'official_knockout_winner_v1', '{"sourceMatchNumber":46}'::jsonb),
  (50, 'home', 'match_winner', null, null, 47, 'official_knockout_winner_v1', '{"sourceMatchNumber":47}'::jsonb),
  (50, 'away', 'match_winner', null, null, 48, 'official_knockout_winner_v1', '{"sourceMatchNumber":48}'::jsonb),
  (51, 'home', 'match_winner', null, null, 49, 'official_knockout_winner_v1', '{"sourceMatchNumber":49}'::jsonb),
  (51, 'away', 'match_winner', null, null, 50, 'official_knockout_winner_v1', '{"sourceMatchNumber":50}'::jsonb);

insert into public.match_slots (
  id,
  tournament_id,
  match_id,
  side,
  source_type,
  source_tournament_team_id,
  source_group_id,
  source_match_id,
  source_position,
  rule_code,
  rule_data,
  resolved_tournament_team_id,
  resolved_at
)
select
  (
    'e0286000-0000-4000-8000-'
    || lpad(
      (
        (r.match_number - 1) * 2
        + case when r.side = 'home' then 1 else 2 end
      )::text,
      12,
      '0'
    )
  )::uuid,
  'e0280000-0000-4000-8000-000000000001',
  target_match.id,
  r.side,
  r.source_type,
  null,
  source_group.id,
  source_match.id,
  r.source_position,
  r.rule_code,
  r.rule_data || jsonb_build_object(
    'bracketVersion', '2026-06',
    'participantsResolved', false
  ),
  null,
  null
from euro28_knockout_slot_rules r
join public.matches target_match
  on target_match.tournament_id = 'e0280000-0000-4000-8000-000000000001'
 and target_match.match_number = r.match_number
left join public.groups source_group
  on source_group.tournament_id = target_match.tournament_id
 and source_group.code = r.source_group_code
left join public.matches source_match
  on source_match.tournament_id = target_match.tournament_id
 and source_match.match_number = r.source_match_number;

do $$
declare
  knockout_match_count integer;
  knockout_slot_count integer;
begin
  select count(*)
  into knockout_match_count
  from public.matches
  where tournament_id = 'e0280000-0000-4000-8000-000000000001'
    and match_number between 37 and 51;

  if knockout_match_count <> 15 then
    raise exception 'Expected 15 knockout matches, found %', knockout_match_count;
  end if;

  if (
    select count(*)
    from public.matches
    where tournament_id = 'e0280000-0000-4000-8000-000000000001'
  ) <> 51 then
    raise exception 'Expected 51 total Euro 2028 matches after Batch 3';
  end if;

  if exists (
    select 1
    from generate_series(37, 51) expected(match_number)
    left join public.matches m
      on m.tournament_id = 'e0280000-0000-4000-8000-000000000001'
     and m.match_number = expected.match_number
    where m.id is null
  ) then
    raise exception 'Knockout match numbers 37 to 51 must be contiguous';
  end if;

  if exists (
    select 1
    from (
      values
        ('round_of_16', 8),
        ('quarter_final', 4),
        ('semi_final', 2),
        ('final', 1)
    ) expected(stage_code, expected_count)
    join public.tournament_stages ts
      on ts.tournament_id = 'e0280000-0000-4000-8000-000000000001'
     and ts.code = expected.stage_code
    left join public.matches m
      on m.tournament_id = ts.tournament_id
     and m.stage_id = ts.id
    group by expected.stage_code, expected.expected_count
    having count(m.id) <> expected.expected_count
  ) then
    raise exception 'One or more knockout stages has the wrong match count';
  end if;

  if exists (
    select 1
    from public.matches
    where tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and match_number between 37 and 51
      and (
        group_id is not null
        or scheduled_date is null
        or venue_id is null
        or kickoff_at is not null
        or status <> 'scheduled'
        or schedule_status <> 'official_date_venue'
        or participants_status <> 'provisional'
        or winner_tournament_team_id is not null
      )
  ) then
    raise exception 'Knockout matches must have official dates and venues, no invented kick-off times, and unresolved participants';
  end if;

  select count(*)
  into knockout_slot_count
  from public.match_slots ms
  join public.matches m
    on m.id = ms.match_id
   and m.tournament_id = ms.tournament_id
  where ms.tournament_id = 'e0280000-0000-4000-8000-000000000001'
    and m.match_number between 37 and 51;

  if knockout_slot_count <> 30 then
    raise exception 'Expected 30 knockout match slots, found %', knockout_slot_count;
  end if;

  if (
    select count(*)
    from public.match_slots
    where tournament_id = 'e0280000-0000-4000-8000-000000000001'
  ) <> 102 then
    raise exception 'Expected 102 total Euro 2028 match slots after Batch 3';
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
      and m.match_number between 37 and 51
      and (home_slot.id is null or away_slot.id is null)
  ) then
    raise exception 'Every knockout match must have one home and one away source slot';
  end if;

  if exists (
    select 1
    from public.match_slots ms
    join public.matches m
      on m.id = ms.match_id
     and m.tournament_id = ms.tournament_id
    where ms.tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and m.match_number between 37 and 51
      and (
        ms.source_tournament_team_id is not null
        or ms.resolved_tournament_team_id is not null
        or ms.resolved_at is not null
      )
  ) then
    raise exception 'Knockout source rules must remain separate from resolved teams';
  end if;

  if (
    select count(*)
    from public.match_slots ms
    join public.matches m
      on m.id = ms.match_id
     and m.tournament_id = ms.tournament_id
    where ms.tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and m.match_number between 37 and 44
      and ms.source_type = 'group_position'
  ) <> 12 then
    raise exception 'Expected 12 fixed group-position sources in the Round of 16';
  end if;

  if (
    select count(*)
    from public.match_slots ms
    join public.matches m
      on m.id = ms.match_id
     and m.tournament_id = ms.tournament_id
    where ms.tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and m.match_number between 37 and 44
      and ms.source_type = 'best_third'
  ) <> 4 then
    raise exception 'Expected four best-third source slots in the Round of 16';
  end if;

  if (
    select count(*)
    from public.match_slots ms
    join public.matches m
      on m.id = ms.match_id
     and m.tournament_id = ms.tournament_id
    where ms.tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and m.match_number between 45 and 51
      and ms.source_type = 'match_winner'
  ) <> 14 then
    raise exception 'Expected 14 prior-match-winner sources from the quarter-finals onwards';
  end if;

  if exists (
    select 1
    from public.match_slots ms
    join public.matches target_match
      on target_match.id = ms.match_id
     and target_match.tournament_id = ms.tournament_id
    join public.matches source_match
      on source_match.id = ms.source_match_id
     and source_match.tournament_id = ms.tournament_id
    where ms.tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and ms.source_type = 'match_winner'
      and source_match.match_number >= target_match.match_number
  ) then
    raise exception 'Every knockout winner source must come from an earlier match';
  end if;

  if exists (
    select 1
    from public.match_slots ms
    join public.matches m
      on m.id = ms.match_id
     and m.tournament_id = ms.tournament_id
    where ms.tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and m.match_number between 37 and 44
      and ms.source_type = 'best_third'
      and (
        ms.rule_code <> 'official_best_third_matrix_v1'
        or ms.source_position <> 3
        or case
          when jsonb_typeof(ms.rule_data -> 'assignmentByCombination') = 'object' then (
            select count(*)
            from jsonb_object_keys(ms.rule_data -> 'assignmentByCombination')
          ) <> 15
          else true
        end
      )
  ) then
    raise exception 'Every best-third slot must contain all 15 official combination assignments';
  end if;
end;
$$;

commit;
