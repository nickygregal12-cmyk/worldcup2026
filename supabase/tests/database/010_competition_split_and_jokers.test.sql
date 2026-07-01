begin;

set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(48);

select has_table('public','bracket_predictions','winner-only original bracket table exists');
select has_column('public','prediction_sets','competition_key','prediction sets identify their competition');
select has_column('public','prediction_grace_windows','competition_key','grace windows identify their competition');
select has_column('public','bracket_predictions','advancing_tournament_team_id','bracket picks store the advancing team');
select ok(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='bracket_predictions' and column_name in ('home_score_90','away_score_90','decision_method','joker_applied')),'original bracket table stores no score, method or joker fields');
select ok((select relrowsecurity from pg_class where oid='public.bracket_predictions'::regclass),'RLS is enabled on bracket predictions');

select ok(exists(select 1 from pg_constraint where conrelid='public.prediction_sets'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%original%ko_predictor%'),'prediction set competition values are constrained');
select ok(exists(select 1 from pg_constraint where conrelid='public.prediction_sets'::regclass and contype='u' and pg_get_constraintdef(oid) ilike '%tournament_id%user_id%competition_key%'),'one set per user, tournament and competition is enforced');
select ok(exists(select 1 from pg_constraint where conrelid='public.prediction_grace_windows'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%original%ko_predictor%'),'grace competition values are constrained');

select is((select group_stage_joker_cap from public.scoring_rulesets where ruleset_key='euro28-scoring-provisional-v2'),5,'original group joker cap is five');
select is((select knockout_joker_cap from public.scoring_rulesets where ruleset_key='euro28-scoring-provisional-v2'),5,'separate KO Predictor joker cap is five');
select is((select joker_multiplier from public.scoring_rulesets where ruleset_key='euro28-scoring-provisional-v2'),2::numeric,'joker multiplier remains two');

select has_function('public','save_my_prediction_bundle',array['uuid','bigint','boolean','jsonb','text'],'original competition save RPC exists');
select has_function('public','save_my_ko_prediction_bundle',array['uuid','bigint','jsonb'],'separate KO Predictor save RPC exists');
select has_function('private','euro28_has_active_grace',array['uuid','uuid','uuid','text','timestamptz'],'competition-scoped grace validator exists');
select has_function('private','euro28_grant_prediction_grace',array['uuid','uuid','uuid','text','uuid','timestamptz','text'],'service grace grant function exists');
select has_function('private','euro28_revoke_prediction_grace',array['uuid','uuid','text'],'service grace revoke function exists');
select ok((select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='save_my_ko_prediction_bundle' and p.pronargs=3),'KO Predictor save RPC is SECURITY DEFINER');
select ok((select p.proconfig @> array['search_path=""']::text[] from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='save_my_ko_prediction_bundle' and p.pronargs=3),'KO Predictor save RPC fixes an empty search path');

select ok(has_function_privilege('authenticated','public.save_my_prediction_bundle(uuid,bigint,boolean,jsonb,text)','EXECUTE'),'authenticated users may call original RPC');
select ok(has_function_privilege('authenticated','public.save_my_ko_prediction_bundle(uuid,bigint,jsonb)','EXECUTE'),'authenticated users may call KO Predictor RPC');
select ok(not has_function_privilege('anon','public.save_my_prediction_bundle(uuid,bigint,boolean,jsonb,text)','EXECUTE'),'anonymous users cannot call original RPC');
select ok(not has_function_privilege('anon','public.save_my_ko_prediction_bundle(uuid,bigint,jsonb)','EXECUTE'),'anonymous users cannot call KO Predictor RPC');
select ok(has_function_privilege('service_role','private.euro28_grant_prediction_grace(uuid,uuid,uuid,text,uuid,timestamptz,text)','EXECUTE'),'service role may grant competition-scoped grace');
select ok(has_function_privilege('service_role','private.euro28_revoke_prediction_grace(uuid,uuid,text)','EXECUTE'),'service role may revoke grace');
select ok(not has_function_privilege('authenticated','private.euro28_grant_prediction_grace(uuid,uuid,uuid,text,uuid,timestamptz,text)','EXECUTE'),'authenticated users cannot grant grace');
select ok(not has_function_privilege('authenticated','private.euro28_revoke_prediction_grace(uuid,uuid,text)','EXECUTE'),'authenticated users cannot revoke grace');

select ok(not has_table_privilege('authenticated','public.bracket_predictions','INSERT'),'authenticated users cannot insert bracket picks directly');
select ok(not has_table_privilege('authenticated','public.bracket_predictions','UPDATE'),'authenticated users cannot update bracket picks directly');
select ok(not has_table_privilege('authenticated','public.bracket_predictions','DELETE'),'authenticated users cannot delete bracket picks directly');
select ok(not exists(select 1 from pg_policies where schemaname='public' and tablename='bracket_predictions' and cmd in ('INSERT','UPDATE','DELETE','ALL') and roles && array['anon','authenticated']::name[]),'no browser write policies exist on bracket picks');

select lives_ok($$
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values('e02a0000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','stage8@example.invalid','',now(),'{}'::jsonb,'{"display_name":"Stage Eight"}'::jsonb,now(),now())
$$,'Stage 8 test user can be created');

select lives_ok($$
  insert into public.prediction_sets(id,tournament_id,user_id,competition_key,contract_version,scoring_ruleset_id)
  select 'e02a1000-0000-4000-8000-000000000001', tournament.id, 'e02a0000-0000-4000-8000-000000000001','original','euro28-prediction-db-v3',ruleset.id
  from public.tournaments tournament join public.scoring_rulesets ruleset on ruleset.tournament_id=tournament.id
  where tournament.code='euro-2028' and ruleset.ruleset_key='euro28-scoring-provisional-v2'
$$,'original prediction set can be created');
select lives_ok($$
  insert into public.prediction_sets(id,tournament_id,user_id,competition_key,contract_version,scoring_ruleset_id)
  select 'e02a1000-0000-4000-8000-000000000002', tournament.id, 'e02a0000-0000-4000-8000-000000000001','ko_predictor','euro28-prediction-db-v3',ruleset.id
  from public.tournaments tournament join public.scoring_rulesets ruleset on ruleset.tournament_id=tournament.id
  where tournament.code='euro-2028' and ruleset.ruleset_key='euro28-scoring-provisional-v2'
$$,'separate KO Predictor set can coexist for the same user');
select throws_ok($$
  insert into public.prediction_sets(tournament_id,user_id,competition_key,contract_version,scoring_ruleset_id)
  select tournament.id, 'e02a0000-0000-4000-8000-000000000001','original','duplicate',ruleset.id
  from public.tournaments tournament join public.scoring_rulesets ruleset on ruleset.tournament_id=tournament.id
  where tournament.code='euro-2028' and ruleset.ruleset_key='euro28-scoring-provisional-v2'
$$,'23505',null,'a second original set is rejected');

select lives_ok($$
  insert into public.match_predictions(prediction_set_id,tournament_id,match_id,predicted_home_tournament_team_id,predicted_away_tournament_team_id,home_score_90,away_score_90,joker_applied)
  select 'e02a1000-0000-4000-8000-000000000001', match_row.tournament_id, match_row.id, home_slot.source_tournament_team_id, away_slot.source_tournament_team_id,1,0,true
  from public.matches match_row
  join public.match_slots home_slot on home_slot.match_id=match_row.id and home_slot.side='home'
  join public.match_slots away_slot on away_slot.match_id=match_row.id and away_slot.side='away'
  where match_row.match_number=1
$$,'original set accepts a group score and joker');
select throws_ok($$
  insert into public.match_predictions(prediction_set_id,tournament_id,match_id,predicted_home_tournament_team_id,predicted_away_tournament_team_id,home_score_90,away_score_90,joker_applied)
  select 'e02a1000-0000-4000-8000-000000000001', match_row.tournament_id, match_row.id, teams.home_id, teams.away_id,1,0,false
  from public.matches match_row
  cross join lateral (
    select
      (
        select team.id
        from public.tournament_teams team
        where team.tournament_id = match_row.tournament_id
        order by team.id
        limit 1
      ) as home_id,
      (
        select team.id
        from public.tournament_teams team
        where team.tournament_id = match_row.tournament_id
        order by team.id
        offset 1
        limit 1
      ) as away_id
  ) teams
  where match_row.match_number=37
$$,'P0001','Original match predictions may contain group matches only','original match table rejects knockout score rows');
select throws_ok($$
  insert into public.match_predictions(prediction_set_id,tournament_id,match_id,predicted_home_tournament_team_id,predicted_away_tournament_team_id,home_score_90,away_score_90,joker_applied)
  select 'e02a1000-0000-4000-8000-000000000002', match_row.tournament_id, match_row.id, home_slot.source_tournament_team_id, away_slot.source_tournament_team_id,1,0,false
  from public.matches match_row
  join public.match_slots home_slot on home_slot.match_id=match_row.id and home_slot.side='home'
  join public.match_slots away_slot on away_slot.match_id=match_row.id and away_slot.side='away'
  where match_row.match_number=1
$$,'P0001','KO Predictor rows may contain knockout matches only','KO Predictor set rejects group rows');
select lives_ok($$
  insert into public.bracket_predictions(prediction_set_id,tournament_id,match_id,predicted_home_tournament_team_id,predicted_away_tournament_team_id,advancing_tournament_team_id)
  select 'e02a1000-0000-4000-8000-000000000001', match_row.tournament_id, match_row.id, teams.home_id, teams.away_id, teams.home_id
  from public.matches match_row
  cross join lateral (
    select
      (
        select team.id
        from public.tournament_teams team
        where team.tournament_id = match_row.tournament_id
        order by team.id
        limit 1
      ) as home_id,
      (
        select team.id
        from public.tournament_teams team
        where team.tournament_id = match_row.tournament_id
        order by team.id
        offset 1
        limit 1
      ) as away_id
  ) teams
  where match_row.match_number=37
$$,'original bracket accepts a winner-only knockout pick');
select throws_ok($$
  insert into public.bracket_predictions(prediction_set_id,tournament_id,match_id,predicted_home_tournament_team_id,predicted_away_tournament_team_id,advancing_tournament_team_id)
  select 'e02a1000-0000-4000-8000-000000000002', match_row.tournament_id, match_row.id, teams.home_id, teams.away_id, teams.home_id
  from public.matches match_row
  cross join lateral (
    select
      (
        select team.id
        from public.tournament_teams team
        where team.tournament_id = match_row.tournament_id
        order by team.id
        limit 1
      ) as home_id,
      (
        select team.id
        from public.tournament_teams team
        where team.tournament_id = match_row.tournament_id
        order by team.id
        offset 1
        limit 1
      ) as away_id
  ) teams
  where match_row.match_number=37
$$,'P0001','Bracket picks belong only to the original knockout bracket','KO Predictor set cannot own original bracket picks');

select is((select count(*) from public.match_predictions prediction join public.prediction_sets set_row on set_row.id=prediction.prediction_set_id join public.matches match_row on match_row.id=prediction.match_id where set_row.competition_key='original' and match_row.match_number>36),0::bigint,'original competition stores no knockout score rows');
select is((select count(*) from public.bracket_predictions prediction join public.prediction_sets set_row on set_row.id=prediction.prediction_set_id where set_row.competition_key<>'original'),0::bigint,'bracket picks never belong to KO Predictor');
select ok(exists(select 1 from public.prediction_sets where user_id='e02a0000-0000-4000-8000-000000000001' and competition_key='original') and exists(select 1 from public.prediction_sets where user_id='e02a0000-0000-4000-8000-000000000001' and competition_key='ko_predictor'),'original and KO Predictor revisions are stored separately');
select ok(not exists(select 1 from public.match_predictions prediction join public.prediction_sets set_row on set_row.id=prediction.prediction_set_id where set_row.competition_key='original' and prediction.decision_method is not null),'original group rows contain no knockout decision method');
select ok(exists(select 1 from pg_description d join pg_class c on c.oid=d.objoid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='bracket_predictions' and d.objsubid=0 and d.description ilike '%no score%joker%'),'bracket table documents its no-score and no-joker contract');
select ok(exists(select 1 from pg_description d join pg_class c on c.oid=d.objoid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='prediction_sets' and d.objsubid>0 and d.description ilike '%separate competition%'),'prediction set documents separate competition totals');
select ok(exists(select 1 from pg_trigger where tgrelid='public.match_predictions'::regclass and tgname='match_predictions_guard_competition' and not tgisinternal),'match prediction competition guard trigger exists');
select ok(exists(select 1 from pg_trigger where tgrelid='public.bracket_predictions'::regclass and tgname='bracket_predictions_guard_competition' and not tgisinternal),'bracket competition guard trigger exists');

select * from finish();
rollback;
