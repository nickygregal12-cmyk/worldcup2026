begin;

set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select no_plan();

select has_function(
  'public',
  'get_player_competition_points',
  array['uuid','uuid','text'],
  'authorised player insight RPC exists'
);
select ok(
  has_function_privilege('authenticated','public.get_player_competition_points(uuid,uuid,text)','EXECUTE'),
  'authenticated users may request authorised player insight'
);
select ok(
  not has_function_privilege('anon','public.get_player_competition_points(uuid,uuid,text)','EXECUTE'),
  'anonymous guests cannot request scored player insight'
);

select lives_ok($$
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values
    ('e0410000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','insight-one@example.invalid','',now(),'{}'::jsonb,'{"display_name":"Insight One"}'::jsonb,now(),now()),
    ('e0410000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','insight-two@example.invalid','',now(),'{}'::jsonb,'{"display_name":"Insight Two"}'::jsonb,now(),now())
$$,'player insight test users can be created');

select lives_ok($$
  insert into public.prediction_sets(id,tournament_id,user_id,competition_key,contract_version,scoring_ruleset_id)
  select fixture.id,tournament.id,fixture.user_id,fixture.competition_key,'euro28-prediction-db-v3',ruleset.id
  from public.tournaments tournament
  join public.scoring_rulesets ruleset
    on ruleset.tournament_id=tournament.id
   and ruleset.ruleset_key='euro28-scoring-provisional-v2'
  cross join (values
    ('e0411000-0000-4000-8000-000000000001'::uuid,'e0410000-0000-4000-8000-000000000001'::uuid,'original'::text),
    ('e0411000-0000-4000-8000-000000000002'::uuid,'e0410000-0000-4000-8000-000000000002'::uuid,'original'::text),
    ('e0411000-0000-4000-8000-000000000003'::uuid,'e0410000-0000-4000-8000-000000000002'::uuid,'ko_predictor'::text)
  ) fixture(id,user_id,competition_key)
  where tournament.code='euro-2028'
$$,'separate Original and KO prediction sets can be seeded');

select lives_ok($$
  insert into public.match_predictions(
    prediction_set_id,tournament_id,match_id,
    predicted_home_tournament_team_id,predicted_away_tournament_team_id,
    home_score_90,away_score_90,advancing_tournament_team_id,decision_method,joker_applied
  )
  select fixture.prediction_set_id,match_row.tournament_id,match_row.id,
         teams.home_id,teams.away_id,fixture.home_score,fixture.away_score,
         case when fixture.match_number > 36 then teams.home_id else null end,
         fixture.decision_method,fixture.joker_applied
  from (values
    ('e0411000-0000-4000-8000-000000000001'::uuid,1,2,1,null::text,false),
    ('e0411000-0000-4000-8000-000000000002'::uuid,1,1,0,null::text,true),
    ('e0411000-0000-4000-8000-000000000003'::uuid,37,1,1,'penalties'::text,true),
    ('e0411000-0000-4000-8000-000000000003'::uuid,38,2,1,'normal_time'::text,false)
  ) fixture(prediction_set_id,match_number,home_score,away_score,decision_method,joker_applied)
  join public.matches match_row on match_row.match_number=fixture.match_number
  cross join lateral (
    select
      (select team.id from public.tournament_teams team where team.tournament_id=match_row.tournament_id order by team.id limit 1) home_id,
      (select team.id from public.tournament_teams team where team.tournament_id=match_row.tournament_id order by team.id offset 1 limit 1) away_id
  ) teams
$$,'prediction rows can be seeded for privacy checks');


select lives_ok($$
  insert into public.scoring_runs(id,tournament_id,scoring_ruleset_id,run_key,status,completed_at)
  select 'e0412000-0000-4000-8000-000000000001',tournament.id,ruleset.id,'stage13fj-player-insight-fixture','completed',now()
  from public.tournaments tournament
  join public.scoring_rulesets ruleset
    on ruleset.tournament_id=tournament.id
   and ruleset.ruleset_key='euro28-scoring-provisional-v2'
  where tournament.code='euro-2028'
$$,'a canonical scoring run can support insight fixtures');

select lives_ok($$
  insert into public.prediction_match_points(
    prediction_set_id,tournament_id,match_id,competition_key,scoring_ruleset_id,scoring_run_id,
    result_revision,exact_score_points,correct_outcome_points,advancing_team_points,
    decision_method_points,joker_multiplier,total_before_joker,total_points
  )
  select fixture.prediction_set_id,match_row.tournament_id,match_row.id,fixture.competition_key,
         ruleset.id,'e0412000-0000-4000-8000-000000000001',fixture.result_revision,
         fixture.exact_points,fixture.outcome_points,fixture.team_points,fixture.method_points,
         fixture.multiplier,fixture.base_points,fixture.total_points
  from (values
    ('e0411000-0000-4000-8000-000000000001'::uuid,1,'original'::text,1::bigint,30,0,0,0,1::numeric,30,30),
    ('e0411000-0000-4000-8000-000000000002'::uuid,1,'original'::text,2::bigint,0,10,0,0,2::numeric,10,20),
    ('e0411000-0000-4000-8000-000000000003'::uuid,37,'ko_predictor'::text,1::bigint,30,0,10,5,2::numeric,45,90),
    ('e0411000-0000-4000-8000-000000000003'::uuid,38,'ko_predictor'::text,1::bigint,0,10,10,0,1::numeric,20,20)
  ) fixture(prediction_set_id,match_number,competition_key,result_revision,exact_points,outcome_points,team_points,method_points,multiplier,base_points,total_points)
  join public.matches match_row on match_row.match_number=fixture.match_number
  join public.scoring_rulesets ruleset
    on ruleset.tournament_id=match_row.tournament_id
   and ruleset.ruleset_key='euro28-scoring-provisional-v2'
$$,'canonical point rows can be seeded');

select lives_ok($$
  insert into public.prediction_totals(
    prediction_set_id,tournament_id,user_id,competition_key,
    match_points,bracket_points,total_points,scored_match_count,last_scoring_run_id
  )
  select fixture.prediction_set_id,tournament.id,fixture.user_id,fixture.competition_key,
         fixture.match_points,0,fixture.match_points,fixture.scored_count,
         'e0412000-0000-4000-8000-000000000001'
  from public.tournaments tournament
  cross join (values
    ('e0411000-0000-4000-8000-000000000001'::uuid,'e0410000-0000-4000-8000-000000000001'::uuid,'original'::text,30,1),
    ('e0411000-0000-4000-8000-000000000002'::uuid,'e0410000-0000-4000-8000-000000000002'::uuid,'original'::text,20,1),
    ('e0411000-0000-4000-8000-000000000003'::uuid,'e0410000-0000-4000-8000-000000000002'::uuid,'ko_predictor'::text,110,2)
  ) fixture(prediction_set_id,user_id,competition_key,match_points,scored_count)
  where tournament.code='euro-2028'
$$,'competition totals can be seeded');

select set_config('request.jwt.claim.sub','e0410000-0000-4000-8000-000000000001',true);

select is(
  (public.get_player_competition_points(
    (select id from public.tournaments where code='euro-2028'),
    'e0410000-0000-4000-8000-000000000001',
    'original'
  )->>'visible')::boolean,
  true,
  'a player can always inspect their own canonical points'
);

select is(
  jsonb_array_length(public.get_player_competition_points(
    (select id from public.tournaments where code='euro-2028'),
    'e0410000-0000-4000-8000-000000000001',
    'original'
  )->'match_breakdown'),
  1,
  'self insight includes its canonical point row'
);

select is(
  (public.get_player_competition_points(
    (select id from public.tournaments where code='euro-2028'),
    'e0410000-0000-4000-8000-000000000002',
    'original'
  )->>'state'),
  'protected',
  'another Original Predictor remains protected before the global lock'
);

select lives_ok($$
  update public.tournaments set prediction_locked_at=now() where code='euro-2028'
$$,'the Original Predictor can be moved through its irreversible visibility gate');

select is(
  jsonb_array_length(public.get_player_competition_points(
    (select id from public.tournaments where code='euro-2028'),
    'e0410000-0000-4000-8000-000000000002',
    'original'
  )->'match_breakdown'),
  1,
  'another Original point row becomes visible after the global lock'
);

select lives_ok($$
  update public.matches set status='live' where match_number=37
$$,'one KO fixture can cross its fixture-level visibility gate');

select is(
  jsonb_array_length(public.get_player_competition_points(
    (select id from public.tournaments where code='euro-2028'),
    'e0410000-0000-4000-8000-000000000002',
    'ko_predictor'
  )->'match_breakdown'),
  1,
  'another KO insight exposes only started fixtures'
);

select is(
  (public.get_player_competition_points(
    (select id from public.tournaments where code='euro-2028'),
    'e0410000-0000-4000-8000-000000000002',
    'ko_predictor'
  )->>'total_points')::integer,
  90,
  'future KO point rows do not leak into the authorised visible total'
);

select throws_ok($$
  select public.get_player_competition_points(
    (select id from public.tournaments where code='euro-2028'),
    'e0410000-0000-4000-8000-000000000002',
    'combined'
  )
$$,'22023','Competition key is invalid','combined points are rejected');

select set_config('request.jwt.claim.sub','',true);
select throws_ok($$
  select public.get_player_competition_points(
    (select id from public.tournaments where code='euro-2028'),
    'e0410000-0000-4000-8000-000000000002',
    'original'
  )
$$,'42501','Authentication is required','unauthenticated callers are denied');

select * from finish();
rollback;
