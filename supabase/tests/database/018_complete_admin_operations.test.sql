begin;

set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select no_plan();

select has_column('public','matches','fixture_revision','matches expose optimistic fixture revision');
select has_function('public','admin_list_tournament_matches',array['uuid'],'expanded Admin match list exists');
select has_function('public','admin_list_tournament_venues',array['uuid'],'protected tournament venue list exists');
select has_function(
  'public',
  'admin_update_match_fixture',
  array['uuid','uuid','bigint','date','timestamp with time zone','uuid','text','text'],
  'owner-only fixture update RPC exists'
);
select has_function(
  'public',
  'admin_reconcile_tournament_points',
  array['uuid','text'],
  'owner-only complete reconciliation RPC exists'
);

select ok(
  not has_table_privilege('authenticated','public.matches','UPDATE'),
  'authenticated users cannot update fixtures directly'
);
select ok(
  not has_table_privilege('authenticated','public.admin_operation_events','INSERT'),
  'authenticated users cannot write Admin audit events directly'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.admin_list_tournament_venues(uuid)',
    'EXECUTE'
  ),
  'authenticated admins can invoke the protected venue-list RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.admin_list_tournament_venues(uuid)',
    'EXECUTE'
  ),
  'anonymous users cannot invoke the venue-list RPC'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.admin_update_match_fixture(uuid,uuid,bigint,date,timestamp with time zone,uuid,text,text)',
    'EXECUTE'
  ),
  'authenticated users can invoke the owner-guarded fixture RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.admin_update_match_fixture(uuid,uuid,bigint,date,timestamp with time zone,uuid,text,text)',
    'EXECUTE'
  ),
  'anonymous users cannot invoke the fixture RPC'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.admin_reconcile_tournament_points(uuid,text)',
    'EXECUTE'
  ),
  'authenticated users can invoke the owner-guarded reconciliation RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.admin_reconcile_tournament_points(uuid,text)',
    'EXECUTE'
  ),
  'anonymous users cannot invoke the reconciliation RPC'
);

select is(
  (select count(*) from public.matches where fixture_revision = 1),
  51::bigint,
  'all existing Euro fixtures start at fixture revision one'
);

select lives_ok($$
  insert into auth.users(
    id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at
  )
  values
    (
      'e0600000-0000-4000-8000-000000000001',
      '00000000-0000-0000-0000-000000000000',
      'authenticated','authenticated','stage13fk-owner@example.invalid','',
      now(),'{}'::jsonb,'{"display_name":"Stage 13F K Owner"}'::jsonb,now(),now()
    ),
    (
      'e0600000-0000-4000-8000-000000000002',
      '00000000-0000-0000-0000-000000000000',
      'authenticated','authenticated','stage13fk-results@example.invalid','',
      now(),'{}'::jsonb,'{"display_name":"Stage 13F K Results"}'::jsonb,now(),now()
    ),
    (
      'e0600000-0000-4000-8000-000000000003',
      '00000000-0000-0000-0000-000000000000',
      'authenticated','authenticated','stage13fk-member@example.invalid','',
      now(),'{}'::jsonb,'{"display_name":"Stage 13F K Member"}'::jsonb,now(),now()
    )
$$,'Stage 13F-K owner, results-admin and member fixtures can be created');

select lives_ok($$
  select private.euro28_set_tournament_admin(
    tournament.id,
    'e0600000-0000-4000-8000-000000000001',
    'owner',
    true,
    'e0600000-0000-4000-8000-000000000001',
    'Grant Stage 13F K owner access'
  )
  from public.tournaments tournament
  where tournament.code='euro-2028'
$$,'service role can grant the Stage 13F-K owner');

select lives_ok($$
  select private.euro28_set_tournament_admin(
    tournament.id,
    'e0600000-0000-4000-8000-000000000002',
    'results_admin',
    true,
    'e0600000-0000-4000-8000-000000000001',
    'Grant Stage 13F K results access'
  )
  from public.tournaments tournament
  where tournament.code='euro-2028'
$$,'service role can grant the Stage 13F-K results administrator');

select set_config('request.jwt.claim.sub','e0600000-0000-4000-8000-000000000002',true);

select is(
  (
    select count(*)
    from public.admin_list_tournament_venues(
      (select id from public.tournaments where code='euro-2028')
    )
  ),
  9::bigint,
  'results administrator can list the nine active tournament venues'
);

select is(
  (
    select count(*)
    from public.admin_list_tournament_matches(
      (select id from public.tournaments where code='euro-2028')
    )
    where fixture_code is not null
      and scheduled_date is not null
      and schedule_status='official_date_venue'
      and fixture_revision=1
  ),
  51::bigint,
  'expanded match list returns fixture identity, schedule state and revision'
);

select throws_ok($$
  select public.admin_update_match_fixture(
    tournament.id,
    match_row.id,
    1,
    match_row.scheduled_date,
    make_timestamptz(
      extract(year from match_row.scheduled_date)::integer,
      extract(month from match_row.scheduled_date)::integer,
      extract(day from match_row.scheduled_date)::integer,
      20,0,0,
      venue.timezone
    ),
    match_row.venue_id,
    'official_datetime',
    'Results administrator must not edit fixture scheduling'
  )
  from public.tournaments tournament
  join public.matches match_row
    on match_row.tournament_id=tournament.id
   and match_row.match_number=1
  join public.venues venue on venue.id=match_row.venue_id
  where tournament.code='euro-2028'
$$,'42501','Tournament owner access is required','results administrator cannot edit fixture scheduling');

select throws_ok($$
  select public.admin_reconcile_tournament_points(
    (select id from public.tournaments where code='euro-2028'),
    'Results administrator must not reconcile the tournament'
  )
$$,'42501','Tournament owner access is required','results administrator cannot reconcile all tournament points');

select set_config('request.jwt.claim.sub','e0600000-0000-4000-8000-000000000001',true);

select lives_ok($$
  select public.admin_update_match_fixture(
    tournament.id,
    match_row.id,
    1,
    match_row.scheduled_date,
    make_timestamptz(
      extract(year from match_row.scheduled_date)::integer,
      extract(month from match_row.scheduled_date)::integer,
      extract(day from match_row.scheduled_date)::integer,
      20,0,0,
      venue.timezone
    ),
    match_row.venue_id,
    'official_datetime',
    'Confirm the test fixture kick-off through the owner operation'
  )
  from public.tournaments tournament
  join public.matches match_row
    on match_row.tournament_id=tournament.id
   and match_row.match_number=1
  join public.venues venue on venue.id=match_row.venue_id
  where tournament.code='euro-2028'
$$,'owner can confirm a venue-local fixture date and kick-off');

select is(
  (
    select fixture_revision
    from public.matches
    where tournament_id=(select id from public.tournaments where code='euro-2028')
      and match_number=1
  ),
  2::bigint,
  'successful fixture update increments the fixture revision exactly once'
);

select is(
  (
    select schedule_status
    from public.matches
    where tournament_id=(select id from public.tournaments where code='euro-2028')
      and match_number=1
  ),
  'official_datetime',
  'successful fixture update stores official datetime status'
);

select is(
  (
    select count(*)
    from public.admin_operation_events event
    join public.matches match_row on match_row.id=event.match_id
    where match_row.match_number=1
      and event.operation_type='fixture_schedule_updated'
      and (event.payload->'before'->>'fixture_revision')::bigint=1
      and (event.payload->'after'->>'fixture_revision')::bigint=2
      and event.payload->'before' ? 'venue_timezone'
      and event.payload->'after' ? 'venue_timezone'
  ),
  1::bigint,
  'fixture update stores exact before and after audit snapshots'
);

select throws_ok($$
  select public.admin_update_match_fixture(
    tournament.id,
    match_row.id,
    1,
    match_row.scheduled_date,
    match_row.kickoff_at,
    match_row.venue_id,
    match_row.schedule_status,
    'Stale fixture revision must fail without mutation'
  )
  from public.tournaments tournament
  join public.matches match_row
    on match_row.tournament_id=tournament.id
   and match_row.match_number=1
  where tournament.code='euro-2028'
$$,'40001','Fixture changed since it was loaded; refresh before saving','stale fixture revisions fail closed');

select lives_ok($$
  insert into public.venues(
    id,slug,name,city,country_code,timezone,capacity,is_active
  ) values (
    'e0609000-0000-4000-8000-000000000001',
    'stage13fk-outside-venue',
    'Stage 13F K Outside Venue',
    'Test City',
    'GB',
    'Europe/London',
    10000,
    true
  )
$$,'an active venue outside Euro 2028 can be created for the guard test');

select throws_ok($$
  select public.admin_update_match_fixture(
    tournament.id,
    match_row.id,
    2,
    match_row.scheduled_date,
    match_row.kickoff_at,
    'e0609000-0000-4000-8000-000000000001',
    'official_datetime',
    'Venue outside the tournament must fail closed'
  )
  from public.tournaments tournament
  join public.matches match_row
    on match_row.tournament_id=tournament.id
   and match_row.match_number=1
  where tournament.code='euro-2028'
$$,'22023','Selected venue is not an active venue for this tournament','venue outside the tournament fails closed');

select throws_ok($$
  select public.admin_update_match_fixture(
    tournament.id,
    match_row.id,
    2,
    match_row.scheduled_date,
    match_row.kickoff_at + interval '1 day',
    match_row.venue_id,
    'official_datetime',
    'Venue local date mismatch must fail closed'
  )
  from public.tournaments tournament
  join public.matches match_row
    on match_row.tournament_id=tournament.id
   and match_row.match_number=1
  where tournament.code='euro-2028'
$$,'22023','Kick-off venue-local date must match the scheduled date','kick-off local-date mismatch fails closed');

select lives_ok($$
  update public.matches
  set status='live'
  where tournament_id=(select id from public.tournaments where code='euro-2028')
    and match_number=1
$$,'test can place the fixture into a non-editable live state');

select throws_ok($$
  select public.admin_update_match_fixture(
    tournament.id,
    match_row.id,
    2,
    match_row.scheduled_date,
    match_row.kickoff_at,
    match_row.venue_id,
    match_row.schedule_status,
    'Live fixture details must not change'
  )
  from public.tournaments tournament
  join public.matches match_row
    on match_row.tournament_id=tournament.id
   and match_row.match_number=1
  where tournament.code='euro-2028'
$$,'22023','Only scheduled or postponed matches can have fixture details changed','live fixture scheduling is immutable');

select lives_ok($$
  update public.matches
  set status='scheduled'
  where tournament_id=(select id from public.tournaments where code='euro-2028')
    and match_number=1
$$,'test restores the scheduled match state');

select lives_ok($$
  update public.matches
  set result_revision=1
  where tournament_id=(select id from public.tournaments where code='euro-2028')
    and match_number=1
$$,'test can simulate result processing having started');

select throws_ok($$
  select public.admin_update_match_fixture(
    tournament.id,
    match_row.id,
    2,
    match_row.scheduled_date,
    match_row.kickoff_at,
    match_row.venue_id,
    match_row.schedule_status,
    'Processed result fixture details must not change'
  )
  from public.tournaments tournament
  join public.matches match_row
    on match_row.tournament_id=tournament.id
   and match_row.match_number=1
  where tournament.code='euro-2028'
$$,'22023','Fixture details cannot change after result processing has started','result processing makes fixture scheduling immutable');

select lives_ok($$
  update public.matches
  set result_revision=0
  where tournament_id=(select id from public.tournaments where code='euro-2028')
    and match_number=1
$$,'test restores the untouched result revision');

select lives_ok($$
  insert into public.admin_operation_events(
    tournament_id,performed_by_user_id,operation_type,note,payload
  )
  select
    tournament.id,
    'e0600000-0000-4000-8000-000000000001',
    'team_profile_updated',
    'Verify Migration 018 preserves the accepted profile audit value',
    '{}'::jsonb
  from public.tournaments tournament
  where tournament.code='euro-2028'
$$,'Migration 018 restores the accepted team-profile audit operation value');

select lives_ok($$
  insert into public.prediction_sets(
    id,tournament_id,user_id,contract_version,scoring_ruleset_id,competition_key
  )
  select
    'e0601000-0000-4000-8000-000000000001',
    tournament.id,
    'e0600000-0000-4000-8000-000000000003',
    'euro28-prediction-db-v3',
    ruleset.id,
    'original'
  from public.tournaments tournament
  join public.scoring_rulesets ruleset
    on ruleset.id=tournament.active_scoring_ruleset_id
   and ruleset.tournament_id=tournament.id
  where tournament.code='euro-2028'
$$,'an Original prediction set can be prepared for reconciliation');

select lives_ok($$
  insert into public.prediction_sets(
    id,tournament_id,user_id,contract_version,scoring_ruleset_id,competition_key
  )
  select
    'e0601000-0000-4000-8000-000000000002',
    tournament.id,
    'e0600000-0000-4000-8000-000000000003',
    'euro28-prediction-db-v3',
    ruleset.id,
    'ko_predictor'
  from public.tournaments tournament
  join public.scoring_rulesets ruleset
    on ruleset.id=tournament.active_scoring_ruleset_id
   and ruleset.tournament_id=tournament.id
  where tournament.code='euro-2028'
$$,'a separate KO prediction set can be prepared for reconciliation');

select lives_ok($$
  select public.admin_reconcile_tournament_points(
    (select id from public.tournaments where code='euro-2028'),
    'Run a complete replacement reconciliation for the Stage 13F K test'
  )
$$,'owner can run one complete replacement reconciliation');

select is(
  (
    select count(*)
    from public.admin_operation_events
    where operation_type='tournament_points_reconciled'
  ),
  1::bigint,
  'complete reconciliation creates one append-only Admin event'
);

select is(
  (
    select status
    from public.scoring_runs
    where id=(
      select (payload->>'scoring_run_id')::uuid
      from public.admin_operation_events
      where operation_type='tournament_points_reconciled'
      order by created_at desc
      limit 1
    )
  ),
  'completed',
  'complete reconciliation records a completed canonical scoring run'
);

select is(
  (
    select count(*)
    from public.prediction_totals
    where user_id='e0600000-0000-4000-8000-000000000003'
      and competition_key='original'
  ),
  1::bigint,
  'complete reconciliation creates one separate Original total'
);

select is(
  (
    select count(*)
    from public.prediction_totals
    where user_id='e0600000-0000-4000-8000-000000000003'
      and competition_key='ko_predictor'
  ),
  1::bigint,
  'complete reconciliation creates one separate KO Predictor total'
);

select is(
  (
    select count(distinct last_scoring_run_id)
    from public.prediction_totals
    where user_id='e0600000-0000-4000-8000-000000000003'
  ),
  1::bigint,
  'both competition totals point to the same complete replacement run without combining rows'
);

select lives_ok($$
  select public.admin_update_feature_control(
    (select id from public.tournaments where code='euro-2028'),
    'scoring_recalculation',
    1,
    false,
    'Pause full reconciliation for the feature guard test'
  )
$$,'owner can disable scoring reconciliation');

select throws_ok($$
  select public.admin_reconcile_tournament_points(
    (select id from public.tournaments where code='euro-2028'),
    'Blocked complete reconciliation must respect the feature switch'
  )
$$,'P0001','Tournament feature is temporarily disabled: scoring_recalculation','complete reconciliation respects the existing feature switch');

select lives_ok($$
  select public.admin_update_feature_control(
    (select id from public.tournaments where code='euro-2028'),
    'scoring_recalculation',
    2,
    true,
    'Resume full reconciliation after the feature guard test'
  )
$$,'owner can restore scoring reconciliation');

select ok(
  (
    public.admin_get_tournament_control_room(
      (select id from public.tournaments where code='euro-2028')
    )->'health'
  ) ?& array[
    'fixtures_missing_date',
    'fixtures_missing_venue',
    'fixtures_missing_confirmed_kickoff',
    'provisional_schedule_fixtures',
    'official_date_venue_fixtures',
    'official_datetime_fixtures',
    'provisional_participant_fixtures',
    'confirmed_participant_fixtures',
    'pending_results',
    'completed_scoring_runs',
    'failed_scoring_runs',
    'stale_running_scoring_runs',
    'complete_team_profiles',
    'incomplete_team_profiles'
  ],
  'control-room readiness exposes fixture, participant, result, scoring and profile evidence'
);

select is(
  public.admin_get_tournament_control_room(
    (select id from public.tournaments where code='euro-2028')
  )->'tournament_picks'->>'contract_version',
  'euro28-tournament-picks-v1',
  'control room exposes the versioned Tournament Picks readiness contract'
);

select is(
  public.admin_get_tournament_control_room(
    (select id from public.tournaments where code='euro-2028')
  )->'tournament_picks'->>'activation_dependency',
  'stage_17a',
  'Tournament Picks executable outcome entry remains a Stage 17A dependency'
);

select * from finish();
rollback;
