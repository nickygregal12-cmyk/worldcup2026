begin;

set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select no_plan();

select has_column('public','matches','result_status','matches expose a scoring-gated result status');
select has_column('public','matches','result_revision','matches expose a monotonic result revision');
select has_column('public','matches','result_source','matches identify the result source');
select has_table('public','match_result_events','result corrections have an append-only audit table');
select has_table('public','scoring_runs','scoring runs are recorded');
select has_table('public','prediction_match_points','match point breakdowns exist');
select has_table('public','prediction_bracket_points','original bracket point breakdowns exist');
select has_table('public','prediction_totals','competition totals exist');

select has_function('private','euro28_record_match_result',array['uuid','uuid','text','text','integer','integer','integer','integer','integer','integer','text','uuid','text','uuid'],'trusted result writer exists');
select has_function('private','euro28_recalculate_points',array['uuid','uuid'],'idempotent recalculation function exists');
select has_function('public','get_competition_leaderboard',array['uuid','text'],'separate leaderboard RPC exists');
select has_function('public','get_my_competition_points',array['uuid','text'],'owner point breakdown RPC exists');

select ok((select relrowsecurity from pg_class where oid='public.prediction_match_points'::regclass),'RLS is enabled on match points');
select ok((select relrowsecurity from pg_class where oid='public.prediction_bracket_points'::regclass),'RLS is enabled on bracket points');
select ok((select relrowsecurity from pg_class where oid='public.prediction_totals'::regclass),'RLS is enabled on totals');
select ok(not has_table_privilege('authenticated','public.prediction_match_points','INSERT'),'authenticated users cannot insert points');
select ok(not has_table_privilege('authenticated','public.prediction_match_points','UPDATE'),'authenticated users cannot update points');
select ok(not has_table_privilege('authenticated','public.prediction_match_points','DELETE'),'authenticated users cannot delete points');
select ok(not has_function_privilege('authenticated','private.euro28_record_match_result(uuid,uuid,text,text,integer,integer,integer,integer,integer,integer,text,uuid,text,uuid)','EXECUTE'),'authenticated browsers cannot record results');
select ok(has_function_privilege('service_role','private.euro28_record_match_result(uuid,uuid,text,text,integer,integer,integer,integer,integer,integer,text,uuid,text,uuid)','EXECUTE'),'service role may record results');
select ok(has_function_privilege('authenticated','public.get_competition_leaderboard(uuid,text)','EXECUTE'),'authenticated users may read leaderboards');
select ok(not has_function_privilege('anon','public.get_competition_leaderboard(uuid,text)','EXECUTE'),'anonymous guests cannot read scored leaderboards');

select lives_ok($$
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values('e0290000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','stage9@example.invalid','',now(),'{}'::jsonb,'{"display_name":"Stage Nine"}'::jsonb,now(),now())
$$,'Stage 9 test user can be created');

select lives_ok($$
  insert into public.prediction_sets(id,tournament_id,user_id,competition_key,contract_version,scoring_ruleset_id)
  select 'e0291000-0000-4000-8000-000000000001', tournament.id, 'e0290000-0000-4000-8000-000000000001','original','euro28-original-predictor-v1',ruleset.id
  from public.tournaments tournament join public.scoring_rulesets ruleset on ruleset.tournament_id=tournament.id
  where tournament.code='euro-2028' and ruleset.ruleset_key='euro28-scoring-provisional-v2'
$$,'original prediction set can be created');

select lives_ok($$
  insert into public.prediction_sets(id,tournament_id,user_id,competition_key,contract_version,scoring_ruleset_id)
  select 'e0291000-0000-4000-8000-000000000002', tournament.id, 'e0290000-0000-4000-8000-000000000001','ko_predictor','euro28-ko-predictor-v1',ruleset.id
  from public.tournaments tournament join public.scoring_rulesets ruleset on ruleset.tournament_id=tournament.id
  where tournament.code='euro-2028' and ruleset.ruleset_key='euro28-scoring-provisional-v2'
$$,'KO Predictor set can be created separately');

select lives_ok($$
  insert into public.match_predictions(
    prediction_set_id,tournament_id,match_id,predicted_home_tournament_team_id,
    predicted_away_tournament_team_id,home_score_90,away_score_90,joker_applied
  )
  select 'e0291000-0000-4000-8000-000000000001', match_row.tournament_id, match_row.id,
    home_slot.resolved_tournament_team_id, away_slot.resolved_tournament_team_id,1,0,false
  from public.matches match_row
  join public.match_slots home_slot on home_slot.match_id=match_row.id and home_slot.side='home'
  join public.match_slots away_slot on away_slot.match_id=match_row.id and away_slot.side='away'
  where match_row.match_number=1
$$,'original group prediction fixture can be stored');

select lives_ok($$
  select private.euro28_record_match_result(
    tournament.id, match_row.id, 'completed', 'confirmed',
    1,0,null,null,null,null,'normal_time',home_slot.resolved_tournament_team_id,
    'manual','e0290000-0000-4000-8000-000000000001'
  )
  from public.tournaments tournament
  join public.matches match_row on match_row.tournament_id=tournament.id and match_row.match_number=1
  join public.match_slots home_slot on home_slot.match_id=match_row.id and home_slot.side='home'
  where tournament.code='euro-2028'
$$,'a confirmed group result is recorded and scored');

select is((select result_revision from public.matches where match_number=1),1::bigint,'first result write creates revision one');
select is((select count(*) from public.match_result_events event join public.matches match_row on match_row.id=event.match_id where match_row.match_number=1),1::bigint,'first result write creates one audit event');
select is((select total_points from public.prediction_match_points where prediction_set_id='e0291000-0000-4000-8000-000000000001'),30,'exact original group score earns 30 points');
select is((select total_points from public.prediction_totals where prediction_set_id='e0291000-0000-4000-8000-000000000001'),30,'original total reflects the exact score');

select lives_ok($$
  select private.euro28_record_match_result(
    tournament.id, match_row.id, 'completed', 'confirmed',
    2,0,null,null,null,null,'normal_time',home_slot.resolved_tournament_team_id,
    'manual','e0290000-0000-4000-8000-000000000001'
  )
  from public.tournaments tournament
  join public.matches match_row on match_row.tournament_id=tournament.id and match_row.match_number=1
  join public.match_slots home_slot on home_slot.match_id=match_row.id and home_slot.side='home'
  where tournament.code='euro-2028'
$$,'a corrected result replaces its earlier score');

select is((select result_revision from public.matches where match_number=1),2::bigint,'correction increments the result revision');
select is((select count(*) from public.match_result_events event join public.matches match_row on match_row.id=event.match_id where match_row.match_number=1),2::bigint,'correction appends a second audit event');
select is((select count(*) from public.prediction_match_points where prediction_set_id='e0291000-0000-4000-8000-000000000001'),1::bigint,'correction replaces rather than duplicates point rows');
select is((select total_points from public.prediction_match_points where prediction_set_id='e0291000-0000-4000-8000-000000000001'),10,'correct outcome replaces the old exact-score total');
select is((select result_revision from public.prediction_match_points where prediction_set_id='e0291000-0000-4000-8000-000000000001'),2::bigint,'point row records the corrected result revision');

select lives_ok($$
  with tournament as (
    select id from public.tournaments where code='euro-2028'
  ), teams as (
    select id, row_number() over(order by id) sequence
    from public.tournament_teams where tournament_id=(select id from tournament)
  )
  update public.match_slots slot
  set resolved_tournament_team_id = case slot.side
    when 'home' then (select id from teams where sequence=1)
    else (select id from teams where sequence=2)
  end,
  resolved_at=now()
  from public.matches match_row
  where slot.match_id=match_row.id and match_row.match_number=37
$$,'a real KO fixture can be resolved for scoring');

select lives_ok($$
  insert into public.match_predictions(
    prediction_set_id,tournament_id,match_id,predicted_home_tournament_team_id,
    predicted_away_tournament_team_id,home_score_90,away_score_90,
    advancing_tournament_team_id,decision_method,joker_applied
  )
  select 'e0291000-0000-4000-8000-000000000002', match_row.tournament_id, match_row.id,
    home_slot.resolved_tournament_team_id,away_slot.resolved_tournament_team_id,1,1,
    home_slot.resolved_tournament_team_id,'penalties',true
  from public.matches match_row
  join public.match_slots home_slot on home_slot.match_id=match_row.id and home_slot.side='home'
  join public.match_slots away_slot on away_slot.match_id=match_row.id and away_slot.side='away'
  where match_row.match_number=37
$$,'separate KO Predictor prediction can be stored');

select lives_ok($$
  select private.euro28_record_match_result(
    tournament.id, match_row.id, 'completed', 'confirmed',
    1,1,1,1,4,3,'penalties',home_slot.resolved_tournament_team_id,
    'manual','e0290000-0000-4000-8000-000000000001'
  )
  from public.tournaments tournament
  join public.matches match_row on match_row.tournament_id=tournament.id and match_row.match_number=37
  join public.match_slots home_slot on home_slot.match_id=match_row.id and home_slot.side='home'
  where tournament.code='euro-2028'
$$,'a confirmed penalty result is stored with shoot-out kicks separate');

select is((select exact_score_points from public.prediction_match_points where prediction_set_id='e0291000-0000-4000-8000-000000000002'),30,'KO Predictor exact 90-minute score earns 30');
select is((select advancing_team_points from public.prediction_match_points where prediction_set_id='e0291000-0000-4000-8000-000000000002'),10,'KO Predictor correct advancing team earns 10');
select is((select decision_method_points from public.prediction_match_points where prediction_set_id='e0291000-0000-4000-8000-000000000002'),5,'KO Predictor correct method earns 5');
select is((select joker_multiplier from public.prediction_match_points where prediction_set_id='e0291000-0000-4000-8000-000000000002'),2::numeric,'KO Predictor joker multiplier is two');
select is((select total_points from public.prediction_match_points where prediction_set_id='e0291000-0000-4000-8000-000000000002'),90,'KO Predictor joker doubles its own 45-point result');
select is((select bracket_points from public.prediction_totals where prediction_set_id='e0291000-0000-4000-8000-000000000002'),0,'KO Predictor never receives original bracket points');
select is((select total_points from public.prediction_totals where prediction_set_id='e0291000-0000-4000-8000-000000000001'),10,'original total remains separate from KO Predictor points');
select is((select total_points from public.prediction_totals where prediction_set_id='e0291000-0000-4000-8000-000000000002'),90,'KO Predictor total remains separate from original points');

select is((select count(*) from public.get_competition_leaderboard((select id from public.tournaments where code='euro-2028'),'original') where user_id='e0290000-0000-4000-8000-000000000001'),1::bigint,'original leaderboard returns the original entry');
select is((select total_points from public.get_competition_leaderboard((select id from public.tournaments where code='euro-2028'),'original') where user_id='e0290000-0000-4000-8000-000000000001'),10,'original leaderboard shows only original points');
select is((select total_points from public.get_competition_leaderboard((select id from public.tournaments where code='euro-2028'),'ko_predictor') where user_id='e0290000-0000-4000-8000-000000000001'),90,'KO Predictor leaderboard shows only KO points');
select is((select count(*) from public.prediction_bracket_points where prediction_set_id='e0291000-0000-4000-8000-000000000002'),0::bigint,'KO Predictor has no bracket point rows');

select throws_ok($$
  select private.euro28_record_match_result(
    tournament.id, match_row.id, 'completed', 'confirmed',
    0,0,null,null,null,null,'normal_time',home_slot.resolved_tournament_team_id,
    'manual','e0290000-0000-4000-8000-000000000001'
  )
  from public.tournaments tournament
  join public.matches match_row on match_row.tournament_id=tournament.id and match_row.match_number=37
  join public.match_slots home_slot on home_slot.match_id=match_row.id and home_slot.side='home'
  where tournament.code='euro-2028'
$$,'22023','A normal-time knockout result must have a 90-minute winner only','a drawn normal-time knockout result is rejected');

select * from finish();
rollback;
