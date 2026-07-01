begin;

set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select no_plan();

select has_table('private','tournament_admins','service-managed tournament administrator registry exists');
select has_table('public','admin_operation_events','append-only admin operation audit exists');
select has_function('private','euro28_set_tournament_admin',array['uuid','uuid','text','boolean','uuid','text'],'service-only admin assignment function exists');
select has_function('private','euro28_require_tournament_admin',array['uuid','uuid'],'admin authorization guard exists');
select has_function('public','get_my_tournament_admin_access',array['uuid'],'browser access check RPC exists');
select has_function('public','admin_list_tournament_matches',array['uuid'],'admin match list RPC exists');
select has_function('public','admin_get_match_result_history',array['uuid','uuid'],'admin result history RPC exists');
select has_function('public','admin_list_scoring_runs',array['uuid','integer'],'admin scoring run RPC exists');
select has_function('public','admin_record_match_result',array['uuid','uuid','bigint','jsonb','text'],'revision-safe result writer RPC exists');
select has_function('public','admin_update_match_status',array['uuid','uuid','bigint','text','text'],'status-only admin RPC exists');
select has_function('public','admin_recalculate_match_points',array['uuid','uuid','bigint','text'],'explicit recalculation RPC exists');

select ok((select relrowsecurity from pg_class where oid='private.tournament_admins'::regclass),'RLS is enabled on tournament admins');
select ok((select relrowsecurity from pg_class where oid='public.admin_operation_events'::regclass),'RLS is enabled on admin operation events');
select ok(not has_table_privilege('authenticated','private.tournament_admins','SELECT'),'authenticated users cannot read admin assignments directly');
select ok(not has_table_privilege('authenticated','private.tournament_admins','INSERT'),'authenticated users cannot grant admin access directly');
select ok(not has_table_privilege('authenticated','public.admin_operation_events','SELECT'),'authenticated users cannot read operation events directly');
select ok(not has_table_privilege('authenticated','public.admin_operation_events','INSERT'),'authenticated users cannot insert audit events directly');
select ok(not has_function_privilege('authenticated','private.euro28_set_tournament_admin(uuid,uuid,text,boolean,uuid,text)','EXECUTE'),'authenticated users cannot self-grant admin access');
select ok(has_function_privilege('service_role','private.euro28_set_tournament_admin(uuid,uuid,text,boolean,uuid,text)','EXECUTE'),'service role can manage administrator access');
select ok(has_function_privilege('authenticated','public.admin_record_match_result(uuid,uuid,bigint,jsonb,text)','EXECUTE'),'authenticated users may invoke the protected result RPC');
select ok(not has_function_privilege('anon','public.admin_record_match_result(uuid,uuid,bigint,jsonb,text)','EXECUTE'),'anonymous users cannot invoke result administration');

select lives_ok($$
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values
    ('e0300000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','stage10-admin@example.invalid','',now(),'{}'::jsonb,'{"display_name":"Stage Ten Admin"}'::jsonb,now(),now()),
    ('e0300000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','stage10-member@example.invalid','',now(),'{}'::jsonb,'{"display_name":"Stage Ten Member"}'::jsonb,now(),now())
$$,'admin and non-admin fixtures can be created');

select set_config('request.jwt.claim.sub','e0300000-0000-4000-8000-000000000002',true);
select is(
  (public.get_my_tournament_admin_access((select id from public.tournaments where code='euro-2028')) ->> 'is_admin')::boolean,
  false,
  'ordinary signed-in member is not an administrator'
);
select throws_ok($$
  select * from public.admin_list_tournament_matches((select id from public.tournaments where code='euro-2028'))
$$,'42501','Tournament administrator access is required','non-admin cannot list protected tournament operations');

select lives_ok($$
  select private.euro28_set_tournament_admin(
    tournament.id,
    'e0300000-0000-4000-8000-000000000001',
    'owner',
    true,
    'e0300000-0000-4000-8000-000000000001',
    'Initial Stage 10 staging owner grant'
  )
  from public.tournaments tournament
  where tournament.code='euro-2028'
$$,'service-managed owner grant succeeds');

select is((select count(*) from private.tournament_admins where user_id='e0300000-0000-4000-8000-000000000001' and is_active),1::bigint,'active admin assignment is stored once');
select is((select count(*) from public.admin_operation_events where operation_type='admin_granted' and target_user_id='e0300000-0000-4000-8000-000000000001'),1::bigint,'admin grant is append-only audited');

select set_config('request.jwt.claim.sub','e0300000-0000-4000-8000-000000000001',true);
select is(
  public.get_my_tournament_admin_access((select id from public.tournaments where code='euro-2028') ) ->> 'admin_role',
  'owner',
  'granted owner sees the assigned administrator role'
);
select is((select count(*) from public.admin_list_tournament_matches((select id from public.tournaments where code='euro-2028'))),51::bigint,'admin can list all 51 matches');
select is((select count(*) from public.admin_list_scoring_runs((select id from public.tournaments where code='euro-2028'),25)),0::bigint,'admin scoring run list starts empty in the isolated test transaction');

select lives_ok($$
  select public.admin_record_match_result(
    tournament.id,
    match_row.id,
    0,
    jsonb_build_object(
      'match_status','completed',
      'result_status','confirmed',
      'normal_time_home_goals',1,
      'normal_time_away_goals',0,
      'after_extra_time_home_goals',null,
      'after_extra_time_away_goals',null,
      'penalty_home_goals',null,
      'penalty_away_goals',null,
      'decision_method','normal_time',
      'winner_tournament_team_id',home_slot.resolved_tournament_team_id
    ),
    'Official group result entered manually'
  )
  from public.tournaments tournament
  join public.matches match_row on match_row.tournament_id=tournament.id and match_row.match_number=1
  join public.match_slots home_slot on home_slot.match_id=match_row.id and home_slot.side='home'
  where tournament.code='euro-2028'
$$,'admin records a confirmed result through the protected wrapper');

select is((select result_revision from public.matches where match_number=1),1::bigint,'admin result creates canonical revision one');
select is((select count(*) from public.admin_operation_events operation join public.matches match_row on match_row.id=operation.match_id where match_row.match_number=1 and operation.operation_type='result_recorded'),1::bigint,'initial result operation is audited');
select is((select count(*) from public.admin_get_match_result_history((select id from public.tournaments where code='euro-2028'),(select id from public.matches where match_number=1))),1::bigint,'admin can read canonical result revision history');
select is((select admin_note from public.admin_get_match_result_history((select id from public.tournaments where code='euro-2028'),(select id from public.matches where match_number=1)) limit 1),'Official group result entered manually','history joins the browser admin audit note');

select throws_ok($$
  select public.admin_record_match_result(
    tournament.id,
    match_row.id,
    0,
    jsonb_build_object(
      'match_status','completed','result_status','confirmed',
      'normal_time_home_goals',2,'normal_time_away_goals',0,
      'decision_method','normal_time','winner_tournament_team_id',home_slot.resolved_tournament_team_id
    ),
    'Stale correction must be rejected'
  )
  from public.tournaments tournament
  join public.matches match_row on match_row.tournament_id=tournament.id and match_row.match_number=1
  join public.match_slots home_slot on home_slot.match_id=match_row.id and home_slot.side='home'
  where tournament.code='euro-2028'
$$,'40001','Result changed since it was loaded; refresh before saving','stale result revision cannot overwrite a newer result');

select throws_ok($$
  select public.admin_update_match_status(
    tournament.id, match_row.id, 1, 'live', 'Attempt to reopen confirmed match'
  )
  from public.tournaments tournament
  join public.matches match_row on match_row.tournament_id=tournament.id and match_row.match_number=1
  where tournament.code='euro-2028'
$$,'22023','A confirmed result must remain completed; void or review the result first','confirmed result cannot be reopened with a status-only write');

select lives_ok($$
  select public.admin_record_match_result(
    tournament.id,
    match_row.id,
    1,
    jsonb_build_object(
      'match_status','completed',
      'result_status','confirmed',
      'normal_time_home_goals',2,
      'normal_time_away_goals',0,
      'after_extra_time_home_goals',null,
      'after_extra_time_away_goals',null,
      'penalty_home_goals',null,
      'penalty_away_goals',null,
      'decision_method','normal_time',
      'winner_tournament_team_id',home_slot.resolved_tournament_team_id
    ),
    'Corrected against the final official report'
  )
  from public.tournaments tournament
  join public.matches match_row on match_row.tournament_id=tournament.id and match_row.match_number=1
  join public.match_slots home_slot on home_slot.match_id=match_row.id and home_slot.side='home'
  where tournament.code='euro-2028'
$$,'admin correction succeeds with the current revision');

select is((select result_revision from public.matches where match_number=1),2::bigint,'correction advances to revision two');
select is((select count(*) from public.admin_operation_events operation join public.matches match_row on match_row.id=operation.match_id where match_row.match_number=1 and operation.operation_type='result_corrected'),1::bigint,'correction is audited separately');

select lives_ok($$
  select public.admin_recalculate_match_points(
    tournament.id, match_row.id, 2, 'Manual recalculation after verification'
  )
  from public.tournaments tournament
  join public.matches match_row on match_row.tournament_id=tournament.id and match_row.match_number=1
  where tournament.code='euro-2028'
$$,'confirmed result can be recalculated explicitly');
select is((select count(*) from public.admin_operation_events operation join public.matches match_row on match_row.id=operation.match_id where match_row.match_number=1 and operation.operation_type='points_recalculated'),1::bigint,'manual recalculation is audited');
select ok((select count(*) >= 3 from public.admin_list_scoring_runs((select id from public.tournaments where code='euro-2028'),25)),'admin can inspect automatic and manual scoring runs');

select lives_ok($$
  select public.admin_update_match_status(
    tournament.id, match_row.id, 0, 'live', 'Match started under manual control'
  )
  from public.tournaments tournament
  join public.matches match_row on match_row.tournament_id=tournament.id and match_row.match_number=2
  where tournament.code='euro-2028'
$$,'status-only control updates an unconfirmed match');
select is((select status from public.matches where match_number=2),'live','status-only control changes the match state');
select is((select result_revision from public.matches where match_number=2),0::bigint,'status-only control does not create a result revision');

select lives_ok($$
  select public.admin_record_match_result(
    tournament.id,
    match_row.id,
    2,
    jsonb_build_object(
      'match_status','completed',
      'result_status','manual_review',
      'normal_time_home_goals',null,
      'normal_time_away_goals',null,
      'after_extra_time_home_goals',null,
      'after_extra_time_away_goals',null,
      'penalty_home_goals',null,
      'penalty_away_goals',null,
      'decision_method',null,
      'winner_tournament_team_id',null
    ),
    'Official result placed into manual review'
  )
  from public.tournaments tournament
  join public.matches match_row on match_row.tournament_id=tournament.id and match_row.match_number=1
  where tournament.code='euro-2028'
$$,'admin can place a result into manual review');
select is((select result_status from public.matches where match_number=1),'manual_review','manual review becomes canonical result state');
select is((select result_revision from public.matches where match_number=1),3::bigint,'manual review creates a new result revision');

select throws_ok($$
  select public.admin_recalculate_match_points(
    tournament.id, match_row.id, 3, 'Cannot score a review-state result'
  )
  from public.tournaments tournament
  join public.matches match_row on match_row.tournament_id=tournament.id and match_row.match_number=1
  where tournament.code='euro-2028'
$$,'22023','Only a confirmed result can be recalculated manually','manual-review result cannot be explicitly scored');

select throws_ok($$
  update public.admin_operation_events set note='Changed after the fact' where operation_type='admin_granted'
$$,'42501','Admin operation events are append-only','operation audit rows cannot be updated');

select lives_ok($$
  select private.euro28_set_tournament_admin(
    tournament.id,
    'e0300000-0000-4000-8000-000000000001',
    'owner',
    false,
    'e0300000-0000-4000-8000-000000000001',
    'Stage 10 owner access revoked for test'
  )
  from public.tournaments tournament
  where tournament.code='euro-2028'
$$,'service role can revoke administrator access');

select is(
  (public.get_my_tournament_admin_access((select id from public.tournaments where code='euro-2028')) ->> 'is_admin')::boolean,
  false,
  'revoked administrator loses access immediately'
);
select throws_ok($$
  select * from public.admin_list_tournament_matches((select id from public.tournaments where code='euro-2028'))
$$,'42501','Tournament administrator access is required','revoked administrator cannot use protected operations');
select is((select count(*) from public.admin_operation_events where operation_type='admin_revoked' and target_user_id='e0300000-0000-4000-8000-000000000001'),1::bigint,'administrator revocation is audited');

select * from finish();
rollback;
