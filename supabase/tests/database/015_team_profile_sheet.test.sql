begin;

set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select no_plan();

select has_table('public','tournament_team_profiles','central tournament-team profile storage exists');
select has_function('public','get_team_profile_sheet',array['uuid','uuid'],'privacy-safe team profile RPC exists');
select has_function('public','admin_list_team_profiles',array['uuid'],'admin team profile list RPC exists');
select has_function('public','admin_upsert_team_profile',array['uuid','uuid','bigint','jsonb','text'],'owner team profile edit RPC exists');

select ok((select relrowsecurity from pg_class where oid='public.tournament_team_profiles'::regclass),'RLS is enabled on team profiles');
select ok(not has_table_privilege('anon','public.tournament_team_profiles','SELECT'),'anonymous users cannot read team profile storage directly');
select ok(not has_table_privilege('authenticated','public.tournament_team_profiles','SELECT'),'authenticated users cannot read team profile storage directly');
select ok(not has_table_privilege('authenticated','public.tournament_team_profiles','UPDATE'),'authenticated users cannot edit team profiles directly');
select ok(has_function_privilege('anon','public.get_team_profile_sheet(uuid,uuid)','EXECUTE'),'anonymous visitors can invoke the privacy-safe profile RPC');
select ok(has_function_privilege('authenticated','public.get_team_profile_sheet(uuid,uuid)','EXECUTE'),'signed-in visitors can invoke the privacy-safe profile RPC');
select ok(not has_function_privilege('anon','public.admin_upsert_team_profile(uuid,uuid,bigint,jsonb,text)','EXECUTE'),'anonymous visitors cannot invoke profile administration');

select is(
  (public.get_team_profile_sheet(
    (select id from public.tournaments where code='euro-2028'),
    (select id from public.tournament_teams where tournament_id=(select id from public.tournaments where code='euro-2028') order by display_order limit 1)
  ) #>> '{predictions,aggregates_visible}')::boolean,
  false,
  'community prediction aggregates are unavailable before the persisted global lock'
);

select is(
  public.get_team_profile_sheet(
    (select id from public.tournaments where code='euro-2028'),
    (select id from public.tournament_teams where tournament_id=(select id from public.tournaments where code='euro-2028') order by display_order limit 1)
  ) #> '{predictions,aggregates}',
  'null'::jsonb,
  'the pre-lock RPC response contains no aggregate prediction payload'
);

select lives_ok($$
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values
    ('e0600000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','stage13e-owner@example.invalid','',now(),'{}'::jsonb,'{"display_name":"Stage 13E Owner"}'::jsonb,now(),now()),
    ('e0600000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','stage13e-results@example.invalid','',now(),'{}'::jsonb,'{"display_name":"Stage 13E Results"}'::jsonb,now(),now()),
    ('e0600000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','stage13e-member@example.invalid','',now(),'{}'::jsonb,'{"display_name":"Stage 13E Member"}'::jsonb,now(),now())
$$,'owner, results-admin and ordinary member fixtures can be created');

select lives_ok($$
  select private.euro28_set_tournament_admin(
    tournament.id,'e0600000-0000-4000-8000-000000000001','owner',true,
    'e0600000-0000-4000-8000-000000000001','Stage 13E owner grant'
  )
  from public.tournaments tournament where tournament.code='euro-2028'
$$,'service role can grant the profile owner');

select lives_ok($$
  select private.euro28_set_tournament_admin(
    tournament.id,'e0600000-0000-4000-8000-000000000002','results_admin',true,
    'e0600000-0000-4000-8000-000000000001','Stage 13E results grant'
  )
  from public.tournaments tournament where tournament.code='euro-2028'
$$,'service role can grant the results administrator');

select set_config('request.jwt.claim.sub','e0600000-0000-4000-8000-000000000003',true);
select throws_ok($$
  select * from public.admin_list_team_profiles((select id from public.tournaments where code='euro-2028'))
$$,'42501','Tournament administrator access is required','ordinary members cannot list profile administration data');

select set_config('request.jwt.claim.sub','e0600000-0000-4000-8000-000000000002',true);
select is(
  (select count(*) from public.admin_list_team_profiles((select id from public.tournaments where code='euro-2028'))),
  24::bigint,
  'results administrators can inspect the 24 profile rows'
);
select throws_ok($$
  select public.admin_upsert_team_profile(
    (select id from public.tournaments where code='euro-2028'),
    (select id from public.tournament_teams where tournament_id=(select id from public.tournaments where code='euro-2028') order by display_order limit 1),
    0,
    '{"ranking":25,"qualifying_route":"Sample qualifying route","best_euro_finish":"Quarter-finals","editorial_note":"A provisional editorial summary for testing."}'::jsonb,
    'Attempted results-admin profile edit'
  )
$$,'42501','Tournament owner access is required','results administrators cannot change curated team content');

select set_config('request.jwt.claim.sub','e0600000-0000-4000-8000-000000000001',true);
select throws_ok($$
  select public.admin_upsert_team_profile(
    (select id from public.tournaments where code='euro-2028'),
    (select id from public.tournament_teams where tournament_id=(select id from public.tournaments where code='euro-2028') order by display_order limit 1),
    0,
    '{"ranking":"not-a-number","editorial_note":"A valid-length note paired with an invalid ranking."}'::jsonb,
    'Reject invalid Stage 13E ranking'
  )
$$,'22023','Ranking must be a whole number between 1 and 300','owner edits receive a controlled validation error for a non-numeric ranking');

select lives_ok($$
  select public.admin_upsert_team_profile(
    (select id from public.tournaments where code='euro-2028'),
    (select id from public.tournament_teams where tournament_id=(select id from public.tournaments where code='euro-2028') order by display_order limit 1),
    0,
    '{"ranking":25,"qualifying_route":"Sample qualifying route","best_euro_finish":"Quarter-finals","editorial_note":"A provisional editorial summary for profile-sheet testing."}'::jsonb,
    'Add provisional Stage 13E profile content'
  )
$$,'owner can create centrally stored curated profile content');

select is(
  (select profile_revision from public.tournament_team_profiles limit 1),
  1::bigint,
  'new profile content starts at revision one'
);
select is(
  public.get_team_profile_sheet(
    (select id from public.tournaments where code='euro-2028'),
    (select tournament_team_id from public.tournament_team_profiles limit 1)
  ) #>> '{curated,status}',
  'ready',
  'public profile RPC returns the owner-curated content'
);
select is(
  (select count(*) from public.admin_operation_events where operation_type='team_profile_updated'),
  1::bigint,
  'profile edit is append-only audited'
);

select throws_ok($$
  select public.admin_upsert_team_profile(
    (select id from public.tournaments where code='euro-2028'),
    (select tournament_team_id from public.tournament_team_profiles limit 1),
    0,
    '{"ranking":24,"qualifying_route":"Changed route","best_euro_finish":"Semi-finals","editorial_note":"This stale edit must not overwrite the current profile."}'::jsonb,
    'Attempt stale profile revision'
  )
$$,'40001','Team profile changed since it was loaded; refresh before saving','stale profile revisions are rejected');

select lives_ok($$
  update public.tournaments set prediction_locked_at=now() where code='euro-2028'
$$,'test transaction can apply the monotonic Original Predictor lock');
select is(
  (public.get_team_profile_sheet(
    (select id from public.tournaments where code='euro-2028'),
    (select tournament_team_id from public.tournament_team_profiles limit 1)
  ) #>> '{predictions,aggregates_visible}')::boolean,
  true,
  'aggregate boundary opens only after the persisted global lock'
);
select is(
  public.get_team_profile_sheet(
    (select id from public.tournaments where code='euro-2028'),
    (select tournament_team_id from public.tournament_team_profiles limit 1)
  ) #> '{predictions,aggregates}',
  jsonb_build_object(
    'group_winner_percentage', null,
    'round_of_16_percentage', null,
    'quarter_final_percentage', null,
    'semi_final_percentage', null,
    'final_percentage', null,
    'champion_percentage', null
  ),
  'post-lock response exposes the aggregate structure without inventing percentages when no complete brackets exist'
);

select * from finish();
rollback;
