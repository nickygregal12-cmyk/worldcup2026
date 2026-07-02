begin;

set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select no_plan();

select has_table('public','leagues','private league table exists');
select has_table('public','league_members','shared league membership table exists');
select has_function('public','create_my_league',array['uuid','text'],'authenticated league creation RPC exists');
select has_function('public','join_league_by_code',array['uuid','text'],'join-code RPC exists');
select has_function('public','leave_my_league',array['uuid'],'member leave RPC exists');
select has_function('public','delete_my_league',array['uuid'],'owner delete RPC exists');
select has_function('public','get_my_leagues',array['uuid'],'member-scoped league list RPC exists');
select has_function('public','get_league_standings',array['uuid','text'],'competition-scoped standings RPC exists');
select has_function('public','get_member_predictions_after_lock',array['uuid','uuid','text'],'overall post-lock prediction RPC exists');
select has_function('public','get_league_member_predictions',array['uuid','uuid','text'],'league-member shared prediction RPC exists');

select ok((select relrowsecurity from pg_class where oid='public.leagues'::regclass),'RLS is enabled on leagues');
select ok((select relrowsecurity from pg_class where oid='public.league_members'::regclass),'RLS is enabled on league members');
select ok(not has_table_privilege('authenticated','public.leagues','SELECT'),'authenticated users cannot read private league rows directly');
select ok(not has_table_privilege('authenticated','public.leagues','INSERT'),'authenticated users cannot create leagues directly');
select ok(not has_table_privilege('authenticated','public.league_members','SELECT'),'authenticated users cannot read member rows directly');
select ok(not has_table_privilege('authenticated','public.league_members','INSERT'),'authenticated users cannot join directly');
select ok(has_function_privilege('authenticated','public.create_my_league(uuid,text)','EXECUTE'),'authenticated users can use the protected create RPC');
select ok(has_function_privilege('authenticated','public.get_league_standings(uuid,text)','EXECUTE'),'authenticated members can invoke protected standings');
select ok(has_function_privilege('authenticated','public.get_member_predictions_after_lock(uuid,uuid,text)','EXECUTE'),'authenticated users can invoke controlled overall prediction viewing');
select ok(not has_function_privilege('anon','public.get_league_standings(uuid,text)','EXECUTE'),'anonymous users cannot invoke league standings');
select ok(not has_function_privilege('anon','public.get_member_predictions_after_lock(uuid,uuid,text)','EXECUTE'),'anonymous users cannot view shared predictions');
select ok(not has_function_privilege('authenticated','private.euro28_require_league_member(uuid,uuid)','EXECUTE'),'browser users cannot invoke the private membership guard');

select lives_ok($$
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values
    ('e0400000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','stage11-owner@example.invalid','',now(),'{}'::jsonb,'{"display_name":"Stage Eleven Owner"}'::jsonb,now(),now()),
    ('e0400000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','stage11-member@example.invalid','',now(),'{}'::jsonb,'{"display_name":"Stage Eleven Member"}'::jsonb,now(),now()),
    ('e0400000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','stage11-outsider@example.invalid','',now(),'{}'::jsonb,'{"display_name":"Stage Eleven Outsider"}'::jsonb,now(),now())
$$,'league owner, member and outsider fixtures can be created');

select set_config('request.jwt.claim.sub','e0400000-0000-4000-8000-000000000001',true);

select lives_ok($$
  select public.create_my_league(
    (select id from public.tournaments where code='euro-2028'),
    '  Glasgow Euro Crew  '
  )
$$,'owner can create a private league');

select is((select count(*) from public.leagues),1::bigint,'one league is stored');
select is((select name from public.leagues limit 1),'Glasgow Euro Crew','league name is normalised');
select matches((select join_code from public.leagues limit 1),'^[A-Z0-9]{10}$','join code is private and canonical');
select is((select count(*) from public.league_members where member_role='owner'),1::bigint,'creator receives the single owner membership');
select is((select member_count from public.get_my_leagues((select id from public.tournaments where code='euro-2028')) limit 1),1::bigint,'owner league list starts with one member');

select set_config('request.jwt.claim.sub','e0400000-0000-4000-8000-000000000002',true);
select lives_ok($$
  select public.join_league_by_code(
    (select id from public.tournaments where code='euro-2028'),
    lower((select join_code from public.leagues limit 1))
  )
$$,'member can join with a case-insensitive code');
select is((select count(*) from public.league_members),2::bigint,'joining stores a second membership');
select is((select member_role from public.get_my_leagues((select id from public.tournaments where code='euro-2028')) limit 1),'member','joined account sees member role');
select is((select member_count from public.get_my_leagues((select id from public.tournaments where code='euro-2028')) limit 1),2::bigint,'both members see the universal member count');

select throws_ok($$
  select * from public.get_league_standings((select id from public.leagues limit 1),'combined')
$$,'22023','Competition key is invalid','combined standings are explicitly rejected');

select set_config('request.jwt.claim.sub','e0400000-0000-4000-8000-000000000003',true);
select throws_ok($$
  select * from public.get_league_standings((select id from public.leagues limit 1),'original')
$$,'42501','League membership is required','outsider cannot read private league standings');

select lives_ok($$
  insert into public.prediction_sets(id,tournament_id,user_id,competition_key,contract_version,scoring_ruleset_id)
  select fixture.id, tournament.id, fixture.user_id, fixture.competition_key, 'euro28-prediction-db-v3', ruleset.id
  from public.tournaments tournament
  join public.scoring_rulesets ruleset on ruleset.tournament_id=tournament.id and ruleset.ruleset_key='euro28-scoring-provisional-v2'
  cross join (values
    ('e0401000-0000-4000-8000-000000000001'::uuid,'e0400000-0000-4000-8000-000000000001'::uuid,'original'::text),
    ('e0401000-0000-4000-8000-000000000002'::uuid,'e0400000-0000-4000-8000-000000000002'::uuid,'original'::text),
    ('e0401000-0000-4000-8000-000000000003'::uuid,'e0400000-0000-4000-8000-000000000001'::uuid,'ko_predictor'::text),
    ('e0401000-0000-4000-8000-000000000004'::uuid,'e0400000-0000-4000-8000-000000000002'::uuid,'ko_predictor'::text)
  ) fixture(id,user_id,competition_key)
  where tournament.code='euro-2028'
$$,'separate original and KO Predictor sets can be seeded for league members');

select lives_ok($$
  insert into public.prediction_totals(
    prediction_set_id,tournament_id,user_id,competition_key,
    match_points,bracket_points,total_points,scored_match_count
  )
  select fixture.prediction_set_id,tournament.id,fixture.user_id,fixture.competition_key,
         fixture.match_points,fixture.bracket_points,fixture.total_points,1
  from public.tournaments tournament
  cross join (values
    ('e0401000-0000-4000-8000-000000000001'::uuid,'e0400000-0000-4000-8000-000000000001'::uuid,'original'::text,30,20,50),
    ('e0401000-0000-4000-8000-000000000002'::uuid,'e0400000-0000-4000-8000-000000000002'::uuid,'original'::text,40,30,70),
    ('e0401000-0000-4000-8000-000000000003'::uuid,'e0400000-0000-4000-8000-000000000001'::uuid,'ko_predictor'::text,90,0,90),
    ('e0401000-0000-4000-8000-000000000004'::uuid,'e0400000-0000-4000-8000-000000000002'::uuid,'ko_predictor'::text,10,0,10)
  ) fixture(prediction_set_id,user_id,competition_key,match_points,bracket_points,total_points)
  where tournament.code='euro-2028'
$$,'competition-specific totals can be seeded');

select set_config('request.jwt.claim.sub','e0400000-0000-4000-8000-000000000001',true);
select is((select user_id from public.get_league_standings((select id from public.leagues limit 1),'original') where rank=1 limit 1),'e0400000-0000-4000-8000-000000000002'::uuid,'member leads the Original Predictor league');
select is((select total_points from public.get_league_standings((select id from public.leagues limit 1),'original') where user_id='e0400000-0000-4000-8000-000000000002'),70,'Original standings use original points only');
select is((select user_id from public.get_league_standings((select id from public.leagues limit 1),'ko_predictor') where rank=1 limit 1),'e0400000-0000-4000-8000-000000000001'::uuid,'owner leads the separate KO Predictor league');
select is((select total_points from public.get_league_standings((select id from public.leagues limit 1),'ko_predictor') where user_id='e0400000-0000-4000-8000-000000000001'),90,'KO standings use KO Predictor points only');
select is((select count(*) from public.get_league_standings((select id from public.leagues limit 1),'original')),2::bigint,'universal standings include every league member');

select lives_ok($$
  insert into public.match_predictions(
    prediction_set_id,tournament_id,match_id,
    predicted_home_tournament_team_id,predicted_away_tournament_team_id,
    home_score_90,away_score_90,joker_applied
  )
  select 'e0401000-0000-4000-8000-000000000002',match_row.tournament_id,match_row.id,
         home_slot.source_tournament_team_id,away_slot.source_tournament_team_id,2,1,true
  from public.matches match_row
  join public.match_slots home_slot on home_slot.match_id=match_row.id and home_slot.side='home'
  join public.match_slots away_slot on away_slot.match_id=match_row.id and away_slot.side='away'
  where match_row.match_number=1
$$,'member original group prediction can be seeded');

select is(
  (public.get_league_member_predictions(
    (select id from public.leagues limit 1),
    'e0400000-0000-4000-8000-000000000002',
    'original'
  )->>'visible')::boolean,
  false,
  'original member predictions remain private before the global lock'
);

select is(
  (public.get_member_predictions_after_lock(
    (select id from public.tournaments where code='euro-2028'),
    'e0400000-0000-4000-8000-000000000002',
    'original'
  )->>'visible')::boolean,
  false,
  'overall leaderboard prediction viewing also respects the global lock'
);

select lives_ok($$
  update public.tournaments
  set prediction_locked_at=now()
  where code='euro-2028'
$$,'test clock can persist the monotonic original prediction lock');

select is(
  (public.get_league_member_predictions(
    (select id from public.leagues limit 1),
    'e0400000-0000-4000-8000-000000000002',
    'original'
  )->>'visible')::boolean,
  true,
  'original member predictions become visible after the global lock'
);
select is(
  jsonb_array_length(public.get_league_member_predictions(
    (select id from public.leagues limit 1),
    'e0400000-0000-4000-8000-000000000002',
    'original'
  )->'match_predictions'),
  1,
  'locked original prediction view returns the seeded score'
);

select is(
  jsonb_array_length(public.get_member_predictions_after_lock(
    (select id from public.tournaments where code='euro-2028'),
    'e0400000-0000-4000-8000-000000000002',
    'original'
  )->'match_predictions'),
  1,
  'overall leaderboard member view returns the same locked original score'
);

select lives_ok($$
  insert into public.match_predictions(
    prediction_set_id,tournament_id,match_id,
    predicted_home_tournament_team_id,predicted_away_tournament_team_id,
    home_score_90,away_score_90,advancing_tournament_team_id,decision_method,joker_applied
  )
  select 'e0401000-0000-4000-8000-000000000004',match_row.tournament_id,match_row.id,
         teams.home_id,teams.away_id,1,1,teams.home_id,'extra_time',true
  from public.matches match_row
  cross join lateral (
    select
      (select team.id from public.tournament_teams team where team.tournament_id=match_row.tournament_id order by team.id limit 1) home_id,
      (select team.id from public.tournament_teams team where team.tournament_id=match_row.tournament_id order by team.id offset 1 limit 1) away_id
  ) teams
  where match_row.match_number=37
$$,'member KO Predictor row can be seeded');

select is(
  jsonb_array_length(public.get_league_member_predictions(
    (select id from public.leagues limit 1),
    'e0400000-0000-4000-8000-000000000002',
    'ko_predictor'
  )->'match_predictions'),
  0,
  'future KO Predictor match remains private'
);

select lives_ok($$
  update public.matches set status='live' where match_number=37
$$,'KO fixture can be moved to live for visibility testing');

select is(
  jsonb_array_length(public.get_league_member_predictions(
    (select id from public.leagues limit 1),
    'e0400000-0000-4000-8000-000000000002',
    'ko_predictor'
  )->'match_predictions'),
  1,
  'KO Predictor reveals only the fixture that has started'
);
select is(
  (public.get_league_member_predictions(
    (select id from public.leagues limit 1),
    'e0400000-0000-4000-8000-000000000002',
    'ko_predictor'
  )->>'visibility_scope'),
  'started_ko_matches_only',
  'KO shared viewing documents its rolling match-level boundary'
);

select set_config('request.jwt.claim.sub','e0400000-0000-4000-8000-000000000003',true);
select throws_ok($$
  select public.get_league_member_predictions(
    (select id from public.leagues limit 1),
    'e0400000-0000-4000-8000-000000000002',
    'original'
  )
$$,'42501','League membership is required','outsider cannot view a member prediction bundle');

select is(
  (public.get_member_predictions_after_lock(
    (select id from public.tournaments where code='euro-2028'),
    'e0400000-0000-4000-8000-000000000002',
    'original'
  )->>'visible')::boolean,
  true,
  'authenticated overall leaderboard users may view predictions after lock without sharing a league'
);

select set_config('request.jwt.claim.sub','e0400000-0000-4000-8000-000000000001',true);
select throws_ok($$
  select public.leave_my_league((select id from public.leagues limit 1))
$$,'22023','The league owner must delete the league rather than leave it','owner cannot orphan the league');

select set_config('request.jwt.claim.sub','e0400000-0000-4000-8000-000000000002',true);
select lives_ok($$
  select public.leave_my_league((select id from public.leagues limit 1))
$$,'ordinary member can leave the league');
select is((select count(*) from public.league_members),1::bigint,'leaving removes only the ordinary member');

select set_config('request.jwt.claim.sub','e0400000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.delete_my_league((select id from public.leagues limit 1))
$$,'owner can delete the league');
select is((select count(*) from public.leagues),0::bigint,'league deletion removes the private league');
select is((select count(*) from public.league_members),0::bigint,'league deletion cascades remaining membership');

select * from finish();
rollback;
