-- Euro 2028 Stage 1, Batch 1: provisional group draw slots.
--
-- This migration creates 24 neutral tournament slots and assigns four slots
-- to each of the six provisional groups. It does not name qualified teams,
-- add venues, set kickoff times or create official fixtures.

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
    from public.groups
    where tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and code in ('A', 'B', 'C', 'D', 'E', 'F')
  ) <> 6 then
    raise exception 'Expected the six provisional Euro 2028 groups A-F';
  end if;

  if exists (
    select 1
    from public.tournament_teams
    where tournament_id = 'e0280000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Euro 2028 tournament slots already exist';
  end if;

  if exists (
    select 1
    from public.group_memberships
    where tournament_id = 'e0280000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Euro 2028 group memberships already exist';
  end if;
end;
$$;

insert into public.tournament_teams (
  id,
  tournament_id,
  team_id,
  slot_code,
  qualification_status,
  seed_pot,
  is_host,
  is_provisional,
  display_order,
  metadata
)
values
  ('e0283000-0000-4000-8000-000000000001', 'e0280000-0000-4000-8000-000000000001', null, 'A1', 'provisional', null, false, true,  1, '{"kind":"draw_slot","label":"Group A draw slot 1"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000002', 'e0280000-0000-4000-8000-000000000001', null, 'A2', 'provisional', null, false, true,  2, '{"kind":"draw_slot","label":"Group A draw slot 2"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000003', 'e0280000-0000-4000-8000-000000000001', null, 'A3', 'provisional', null, false, true,  3, '{"kind":"draw_slot","label":"Group A draw slot 3"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000004', 'e0280000-0000-4000-8000-000000000001', null, 'A4', 'provisional', null, false, true,  4, '{"kind":"draw_slot","label":"Group A draw slot 4"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000005', 'e0280000-0000-4000-8000-000000000001', null, 'B1', 'provisional', null, false, true,  5, '{"kind":"draw_slot","label":"Group B draw slot 1"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000006', 'e0280000-0000-4000-8000-000000000001', null, 'B2', 'provisional', null, false, true,  6, '{"kind":"draw_slot","label":"Group B draw slot 2"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000007', 'e0280000-0000-4000-8000-000000000001', null, 'B3', 'provisional', null, false, true,  7, '{"kind":"draw_slot","label":"Group B draw slot 3"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000008', 'e0280000-0000-4000-8000-000000000001', null, 'B4', 'provisional', null, false, true,  8, '{"kind":"draw_slot","label":"Group B draw slot 4"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000009', 'e0280000-0000-4000-8000-000000000001', null, 'C1', 'provisional', null, false, true,  9, '{"kind":"draw_slot","label":"Group C draw slot 1"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000010', 'e0280000-0000-4000-8000-000000000001', null, 'C2', 'provisional', null, false, true, 10, '{"kind":"draw_slot","label":"Group C draw slot 2"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000011', 'e0280000-0000-4000-8000-000000000001', null, 'C3', 'provisional', null, false, true, 11, '{"kind":"draw_slot","label":"Group C draw slot 3"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000012', 'e0280000-0000-4000-8000-000000000001', null, 'C4', 'provisional', null, false, true, 12, '{"kind":"draw_slot","label":"Group C draw slot 4"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000013', 'e0280000-0000-4000-8000-000000000001', null, 'D1', 'provisional', null, false, true, 13, '{"kind":"draw_slot","label":"Group D draw slot 1"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000014', 'e0280000-0000-4000-8000-000000000001', null, 'D2', 'provisional', null, false, true, 14, '{"kind":"draw_slot","label":"Group D draw slot 2"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000015', 'e0280000-0000-4000-8000-000000000001', null, 'D3', 'provisional', null, false, true, 15, '{"kind":"draw_slot","label":"Group D draw slot 3"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000016', 'e0280000-0000-4000-8000-000000000001', null, 'D4', 'provisional', null, false, true, 16, '{"kind":"draw_slot","label":"Group D draw slot 4"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000017', 'e0280000-0000-4000-8000-000000000001', null, 'E1', 'provisional', null, false, true, 17, '{"kind":"draw_slot","label":"Group E draw slot 1"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000018', 'e0280000-0000-4000-8000-000000000001', null, 'E2', 'provisional', null, false, true, 18, '{"kind":"draw_slot","label":"Group E draw slot 2"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000019', 'e0280000-0000-4000-8000-000000000001', null, 'E3', 'provisional', null, false, true, 19, '{"kind":"draw_slot","label":"Group E draw slot 3"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000020', 'e0280000-0000-4000-8000-000000000001', null, 'E4', 'provisional', null, false, true, 20, '{"kind":"draw_slot","label":"Group E draw slot 4"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000021', 'e0280000-0000-4000-8000-000000000001', null, 'F1', 'provisional', null, false, true, 21, '{"kind":"draw_slot","label":"Group F draw slot 1"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000022', 'e0280000-0000-4000-8000-000000000001', null, 'F2', 'provisional', null, false, true, 22, '{"kind":"draw_slot","label":"Group F draw slot 2"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000023', 'e0280000-0000-4000-8000-000000000001', null, 'F3', 'provisional', null, false, true, 23, '{"kind":"draw_slot","label":"Group F draw slot 3"}'::jsonb),
  ('e0283000-0000-4000-8000-000000000024', 'e0280000-0000-4000-8000-000000000001', null, 'F4', 'provisional', null, false, true, 24, '{"kind":"draw_slot","label":"Group F draw slot 4"}'::jsonb);

insert into public.group_memberships (
  id,
  tournament_id,
  group_id,
  tournament_team_id,
  draw_position,
  position_code,
  is_provisional
)
values
  ('e0284000-0000-4000-8000-000000000001', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000001', 'e0283000-0000-4000-8000-000000000001', 1, 'A1', true),
  ('e0284000-0000-4000-8000-000000000002', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000001', 'e0283000-0000-4000-8000-000000000002', 2, 'A2', true),
  ('e0284000-0000-4000-8000-000000000003', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000001', 'e0283000-0000-4000-8000-000000000003', 3, 'A3', true),
  ('e0284000-0000-4000-8000-000000000004', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000001', 'e0283000-0000-4000-8000-000000000004', 4, 'A4', true),
  ('e0284000-0000-4000-8000-000000000005', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000002', 'e0283000-0000-4000-8000-000000000005', 1, 'B1', true),
  ('e0284000-0000-4000-8000-000000000006', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000002', 'e0283000-0000-4000-8000-000000000006', 2, 'B2', true),
  ('e0284000-0000-4000-8000-000000000007', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000002', 'e0283000-0000-4000-8000-000000000007', 3, 'B3', true),
  ('e0284000-0000-4000-8000-000000000008', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000002', 'e0283000-0000-4000-8000-000000000008', 4, 'B4', true),
  ('e0284000-0000-4000-8000-000000000009', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000003', 'e0283000-0000-4000-8000-000000000009', 1, 'C1', true),
  ('e0284000-0000-4000-8000-000000000010', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000003', 'e0283000-0000-4000-8000-000000000010', 2, 'C2', true),
  ('e0284000-0000-4000-8000-000000000011', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000003', 'e0283000-0000-4000-8000-000000000011', 3, 'C3', true),
  ('e0284000-0000-4000-8000-000000000012', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000003', 'e0283000-0000-4000-8000-000000000012', 4, 'C4', true),
  ('e0284000-0000-4000-8000-000000000013', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000004', 'e0283000-0000-4000-8000-000000000013', 1, 'D1', true),
  ('e0284000-0000-4000-8000-000000000014', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000004', 'e0283000-0000-4000-8000-000000000014', 2, 'D2', true),
  ('e0284000-0000-4000-8000-000000000015', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000004', 'e0283000-0000-4000-8000-000000000015', 3, 'D3', true),
  ('e0284000-0000-4000-8000-000000000016', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000004', 'e0283000-0000-4000-8000-000000000016', 4, 'D4', true),
  ('e0284000-0000-4000-8000-000000000017', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000005', 'e0283000-0000-4000-8000-000000000017', 1, 'E1', true),
  ('e0284000-0000-4000-8000-000000000018', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000005', 'e0283000-0000-4000-8000-000000000018', 2, 'E2', true),
  ('e0284000-0000-4000-8000-000000000019', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000005', 'e0283000-0000-4000-8000-000000000019', 3, 'E3', true),
  ('e0284000-0000-4000-8000-000000000020', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000005', 'e0283000-0000-4000-8000-000000000020', 4, 'E4', true),
  ('e0284000-0000-4000-8000-000000000021', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000006', 'e0283000-0000-4000-8000-000000000021', 1, 'F1', true),
  ('e0284000-0000-4000-8000-000000000022', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000006', 'e0283000-0000-4000-8000-000000000022', 2, 'F2', true),
  ('e0284000-0000-4000-8000-000000000023', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000006', 'e0283000-0000-4000-8000-000000000023', 3, 'F3', true),
  ('e0284000-0000-4000-8000-000000000024', 'e0280000-0000-4000-8000-000000000001', 'e0282000-0000-4000-8000-000000000006', 'e0283000-0000-4000-8000-000000000024', 4, 'F4', true);

do $$
declare
  tournament_slot_count integer;
  membership_count integer;
begin
  select count(*)
  into tournament_slot_count
  from public.tournament_teams
  where tournament_id = 'e0280000-0000-4000-8000-000000000001';

  if tournament_slot_count <> 24 then
    raise exception 'Expected 24 provisional tournament slots, found %', tournament_slot_count;
  end if;

  select count(*)
  into membership_count
  from public.group_memberships
  where tournament_id = 'e0280000-0000-4000-8000-000000000001';

  if membership_count <> 24 then
    raise exception 'Expected 24 provisional group memberships, found %', membership_count;
  end if;

  if exists (
    select 1
    from public.tournament_teams
    where tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and (
        team_id is not null
        or qualification_status <> 'provisional'
        or is_provisional is not true
      )
  ) then
    raise exception 'All Stage 1 tournament slots must remain unresolved and provisional';
  end if;

  if exists (
    select 1
    from public.groups g
    left join public.group_memberships gm
      on gm.group_id = g.id
     and gm.tournament_id = g.tournament_id
    where g.tournament_id = 'e0280000-0000-4000-8000-000000000001'
    group by g.id
    having count(gm.id) <> 4
  ) then
    raise exception 'Every Euro 2028 group must contain exactly four draw slots';
  end if;

  if exists (
    select 1
    from public.group_memberships gm
    join public.tournament_teams tt
      on tt.id = gm.tournament_team_id
     and tt.tournament_id = gm.tournament_id
    where gm.tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and gm.position_code <> tt.slot_code
  ) then
    raise exception 'Group membership position codes must match tournament slot codes';
  end if;
end;
$$;

commit;
