begin;

set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select no_plan();

select has_table('public','tournament_feature_controls','tournament feature kill-switch storage exists');
select has_function('private','euro28_require_tournament_owner',array['uuid','uuid'],'owner-only authorization guard exists');
select has_function('private','euro28_is_feature_enabled',array['uuid','text'],'feature-state resolver exists');
select has_function('private','euro28_require_feature_enabled',array['uuid','text'],'feature enforcement guard exists');
select has_function('public','admin_get_tournament_control_room',array['uuid'],'expanded control-room RPC exists');
select has_function('public','admin_apply_global_prediction_lock',array['uuid','text'],'irreversible lock RPC exists');
select has_function('public','admin_update_feature_control',array['uuid','text','bigint','boolean','text'],'revision-safe feature-control RPC exists');
select has_function('public','admin_search_prediction_users',array['uuid','text','integer'],'admin predictor search RPC exists');
select has_function('public','admin_list_prediction_grace',array['uuid'],'grace-window list RPC exists');
select has_function('public','admin_grant_prediction_grace',array['uuid','uuid','uuid','text','timestamp with time zone','text'],'owner grace grant RPC exists');
select has_function('public','admin_revoke_prediction_grace',array['uuid','uuid','text'],'owner grace revoke RPC exists');
select has_function('public','admin_list_operation_events',array['uuid','integer'],'combined append-only audit timeline RPC exists');

select ok((select relrowsecurity from pg_class where oid='public.tournament_feature_controls'::regclass),'RLS is enabled on feature controls');
select ok(not has_table_privilege('authenticated','public.tournament_feature_controls','SELECT'),'authenticated users cannot read feature controls directly');
select ok(not has_table_privilege('authenticated','public.tournament_feature_controls','UPDATE'),'authenticated users cannot update feature controls directly');
select ok(has_function_privilege('authenticated','public.admin_get_tournament_control_room(uuid)','EXECUTE'),'authenticated users can invoke the protected control-room RPC');
select ok(not has_function_privilege('anon','public.admin_get_tournament_control_room(uuid)','EXECUTE'),'anonymous users cannot invoke the control-room RPC');
select ok(not has_function_privilege('authenticated','private.euro28_require_feature_enabled(uuid,text)','EXECUTE'),'browser roles cannot invoke private feature enforcement directly');

select is(
  (select count(*) from public.tournament_feature_controls where tournament_id=(select id from public.tournaments where code='euro-2028')),
  5::bigint,
  'five operational controls are seeded for Euro 2028'
);
select is(
  (select count(*) from public.tournament_feature_controls where tournament_id=(select id from public.tournaments where code='euro-2028') and is_enabled),
  5::bigint,
  'all Stage 12 operational controls start enabled'
);

select lives_ok($$
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values
    ('e0500000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','stage12-owner@example.invalid','',now(),'{}'::jsonb,'{"display_name":"Stage Twelve Owner"}'::jsonb,now(),now()),
    ('e0500000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','stage12-results@example.invalid','',now(),'{}'::jsonb,'{"display_name":"Stage Twelve Results"}'::jsonb,now(),now()),
    ('e0500000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','stage12-member@example.invalid','',now(),'{}'::jsonb,'{"display_name":"Stage Twelve Member"}'::jsonb,now(),now())
$$,'owner, results-admin and member fixtures can be created');

select lives_ok($$
  select private.euro28_set_tournament_admin(
    tournament.id,'e0500000-0000-4000-8000-000000000001','owner',true,
    'e0500000-0000-4000-8000-000000000001','Stage 12 owner grant'
  )
  from public.tournaments tournament where tournament.code='euro-2028'
$$,'service role can grant the Stage 12 owner');

select lives_ok($$
  select private.euro28_set_tournament_admin(
    tournament.id,'e0500000-0000-4000-8000-000000000002','results_admin',true,
    'e0500000-0000-4000-8000-000000000001','Stage 12 results administrator grant'
  )
  from public.tournaments tournament where tournament.code='euro-2028'
$$,'service role can grant a results administrator');

select set_config('request.jwt.claim.sub','e0500000-0000-4000-8000-000000000003',true);
select throws_ok($$
  select public.admin_get_tournament_control_room((select id from public.tournaments where code='euro-2028'))
$$,'42501','Tournament administrator access is required','ordinary member cannot load the control room');

select set_config('request.jwt.claim.sub','e0500000-0000-4000-8000-000000000002',true);
select is(
  public.admin_get_tournament_control_room((select id from public.tournaments where code='euro-2028'))->>'admin_role',
  'results_admin',
  'results administrator can read the operational control room'
);
select throws_ok($$
  select public.admin_update_feature_control(
    (select id from public.tournaments where code='euro-2028'),
    'league_create_join',1,false,'Attempted non-owner feature change'
  )
$$,'42501','Tournament owner access is required','results administrator cannot change kill-switches');
select throws_ok($$
  select public.admin_apply_global_prediction_lock(
    (select id from public.tournaments where code='euro-2028'),
    'Attempted non-owner global lock'
  )
$$,'42501','Tournament owner access is required','results administrator cannot apply the irreversible lock');

select set_config('request.jwt.claim.sub','e0500000-0000-4000-8000-000000000001',true);
select is(
  jsonb_array_length(public.admin_get_tournament_control_room((select id from public.tournaments where code='euro-2028'))->'features'),
  5,
  'owner control room returns all five feature controls'
);
select is(
  (public.admin_get_tournament_control_room((select id from public.tournaments where code='euro-2028'))->'health'->>'total_matches')::integer,
  51,
  'owner control room reports all 51 matches'
);
select is(
  jsonb_array_length(public.admin_get_tournament_control_room((select id from public.tournaments where code='euro-2028'))->'knockout_allocation'),
  30,
  'knockout allocation review returns both sides of all 15 matches'
);
select is(
  jsonb_array_length(public.admin_get_tournament_control_room((select id from public.tournaments where code='euro-2028'))->'joker_locks'),
  51,
  'joker lock review returns every eligible group and knockout match'
);

select lives_ok($$
  select public.admin_update_feature_control(
    (select id from public.tournaments where code='euro-2028'),
    'league_create_join',1,false,'Pause new leagues during operational review'
  )
$$,'owner can disable league creation and joining');
select is(
  (select revision from public.tournament_feature_controls where tournament_id=(select id from public.tournaments where code='euro-2028') and feature_key='league_create_join'),
  2::bigint,
  'feature control revision increments after an owner change'
);
select throws_ok($$
  select public.admin_update_feature_control(
    (select id from public.tournaments where code='euro-2028'),
    'league_create_join',1,true,'Stale feature revision attempt'
  )
$$,'40001','Feature control changed since it was loaded; refresh before saving','stale feature-control writes are rejected');

select set_config('request.jwt.claim.sub','e0500000-0000-4000-8000-000000000003',true);
select throws_ok($$
  select public.create_my_league(
    (select id from public.tournaments where code='euro-2028'),
    'Blocked Stage Twelve League'
  )
$$,'P0001','Tournament feature is temporarily disabled: league_create_join','disabled league feature blocks trusted browser creation');

select set_config('request.jwt.claim.sub','e0500000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.admin_update_feature_control(
    (select id from public.tournaments where code='euro-2028'),
    'league_create_join',2,true,'Resume league creation after review'
  )
$$,'owner can re-enable league creation and joining');

select lives_ok($$
  select public.admin_update_feature_control(
    (select id from public.tournaments where code='euro-2028'),
    'prediction_saving',1,false,'Pause prediction saving for a consistency check'
  )
$$,'owner can disable prediction saving');
select set_config('request.jwt.claim.sub','e0500000-0000-4000-8000-000000000003',true);
select throws_ok($$
  insert into public.prediction_sets(tournament_id,user_id,competition_key,contract_version,scoring_ruleset_id)
  select tournament.id,'e0500000-0000-4000-8000-000000000003','original','euro28-prediction-db-v3',ruleset.id
  from public.tournaments tournament
  join public.scoring_rulesets ruleset on ruleset.tournament_id=tournament.id and ruleset.status='provisional'
  where tournament.code='euro-2028'
$$,'P0001','Tournament feature is temporarily disabled: prediction_saving','disabled prediction saving is enforced below the browser service layer');

select set_config('request.jwt.claim.sub','e0500000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.admin_update_feature_control(
    (select id from public.tournaments where code='euro-2028'),
    'prediction_saving',2,true,'Resume prediction saving after consistency check'
  )
$$,'owner can re-enable prediction saving');
select lives_ok($$
  select public.admin_update_feature_control(
    (select id from public.tournaments where code='euro-2028'),
    'ko_predictor',1,false,'Pause the KO Predictor workspace'
  )
$$,'owner can disable only the KO Predictor');
select set_config('request.jwt.claim.sub','e0500000-0000-4000-8000-000000000003',true);
select throws_ok($$
  insert into public.prediction_sets(tournament_id,user_id,competition_key,contract_version,scoring_ruleset_id)
  select tournament.id,'e0500000-0000-4000-8000-000000000003','ko_predictor','euro28-prediction-db-v3',ruleset.id
  from public.tournaments tournament
  join public.scoring_rulesets ruleset on ruleset.tournament_id=tournament.id and ruleset.status='provisional'
  where tournament.code='euro-2028'
$$,'P0001','Tournament feature is temporarily disabled: ko_predictor','KO kill-switch blocks only the KO prediction set');

select set_config('request.jwt.claim.sub','e0500000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.admin_update_feature_control(
    (select id from public.tournaments where code='euro-2028'),
    'ko_predictor',2,true,'Resume the KO Predictor workspace'
  )
$$,'owner can re-enable the KO Predictor');
select lives_ok($$
  select public.admin_update_feature_control(
    (select id from public.tournaments where code='euro-2028'),
    'scoring_recalculation',1,false,'Pause explicit scoring recovery'
  )
$$,'owner can disable explicit scoring recalculation');
select throws_ok($$
  select public.admin_recalculate_match_points(
    tournament.id,match_row.id,0,'Blocked explicit recalculation attempt'
  )
  from public.tournaments tournament
  join public.matches match_row on match_row.tournament_id=tournament.id and match_row.match_number=1
  where tournament.code='euro-2028'
$$,'P0001','Tournament feature is temporarily disabled: scoring_recalculation','disabled scoring recovery is checked before result validation');

select lives_ok($$
  select public.admin_update_feature_control(
    (select id from public.tournaments where code='euro-2028'),
    'scoring_recalculation',2,true,'Resume explicit scoring recovery'
  )
$$,'owner can re-enable explicit scoring recalculation');

select is(
  (select count(*) from public.admin_search_prediction_users(
    (select id from public.tournaments where code='euro-2028'),'Twelve Member',20
  )),
  1::bigint,
  'owner can find a predictor by display name without exposing email'
);

select lives_ok($$
  select public.admin_grant_prediction_grace(
    tournament.id,
    'e0500000-0000-4000-8000-000000000003',
    match_row.id,
    'original',
    statement_timestamp() + interval '30 minutes',
    'Allow one late correction after a verified support issue'
  )
  from public.tournaments tournament
  join public.matches match_row on match_row.tournament_id=tournament.id and match_row.match_number=1
  where tournament.code='euro-2028'
$$,'owner can grant one audited user-match grace window');
select is((select count(*) from public.admin_list_prediction_grace((select id from public.tournaments where code='euro-2028')) where grace_status='active'),1::bigint,'new grace window is listed as active');
select is((select count(*) from public.admin_operation_events where operation_type='grace_granted' and target_user_id='e0500000-0000-4000-8000-000000000003'),1::bigint,'grace grant is append-only audited');

select lives_ok($$
  select public.admin_revoke_prediction_grace(
    (select id from public.tournaments where code='euro-2028'),
    (select id from public.prediction_grace_windows where user_id='e0500000-0000-4000-8000-000000000003' order by created_at desc limit 1),
    'Support issue resolved before the grace window was used'
  )
$$,'owner can revoke an active grace window');
select is((select count(*) from public.admin_list_prediction_grace((select id from public.tournaments where code='euro-2028')) where grace_status='revoked'),1::bigint,'revoked grace window remains visible in history');
select is((select count(*) from public.admin_operation_events where operation_type='grace_revoked' and target_user_id='e0500000-0000-4000-8000-000000000003'),1::bigint,'grace revocation is append-only audited');

select set_config('request.jwt.claim.sub','e0500000-0000-4000-8000-000000000002',true);
select is((select count(*) from public.admin_list_prediction_grace((select id from public.tournaments where code='euro-2028'))),1::bigint,'results administrator can read grace status but not change it');

select set_config('request.jwt.claim.sub','e0500000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.admin_apply_global_prediction_lock(
    (select id from public.tournaments where code='euro-2028'),
    'Apply the verified irreversible tournament prediction lock'
  )
$$,'owner can apply the irreversible global lock');
select is(
  (public.admin_get_tournament_control_room((select id from public.tournaments where code='euro-2028'))->'lock'->>'is_irreversible')::boolean,
  true,
  'control room reports the persisted lock as irreversible'
);
select throws_ok($$
  select public.admin_apply_global_prediction_lock(
    (select id from public.tournaments where code='euro-2028'),
    'Duplicate lock attempt must fail'
  )
$$,'P0001','The global prediction lock is already irreversible','irreversible global lock cannot be applied twice');
select is((select count(*) from public.admin_operation_events where operation_type='global_prediction_lock_applied'),1::bigint,'global lock is append-only audited exactly once');

select ok(
  position('clock_timestamp()' in pg_get_functiondef('private.euro28_build_shared_prediction_bundle(uuid,uuid,text)'::regprocedure)) = 0,
  'shared prediction builder no longer calls volatile clock_timestamp inside a stable function'
);
select ok(
  position('attempt integer' in lower(pg_get_functiondef('public.create_my_league(uuid,text)'::regprocedure))) = 0,
  'league creation no longer declares a shadowed loop variable'
);
select ok(
  (select count(*) from public.admin_list_operation_events((select id from public.tournaments where code='euro-2028'),200)) >= 10,
  'combined audit timeline exposes Stage 12 control actions'
);

select * from finish();
rollback;
