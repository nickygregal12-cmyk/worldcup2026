begin;

set local role postgres;

create extension if not exists pgtap with schema extensions;

set local search_path = public, extensions;

select plan(54);

select has_function(
  'public',
  'save_my_prediction_bundle',
  array['uuid', 'bigint', 'boolean', 'jsonb', 'text'],
  'the trusted atomic prediction save RPC exists'
);
select has_column(
  'public',
  'prediction_sets',
  'guest_imported_at',
  'prediction sets record explicit guest imports'
);
select has_column(
  'public',
  'prediction_sets',
  'last_save_source',
  'prediction sets record the latest save source'
);
select ok(
  (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'save_my_prediction_bundle'
      and p.pronargs = 5
  ),
  'the save RPC is SECURITY DEFINER'
);
select ok(
  (
    select p.proconfig @> array['search_path=""']::text[]
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'save_my_prediction_bundle'
      and p.pronargs = 5
  ),
  'the save RPC uses an empty fixed search path'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.save_my_prediction_bundle(uuid,bigint,boolean,jsonb,text)',
    'EXECUTE'
  ),
  'authenticated users may call the trusted save RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.save_my_prediction_bundle(uuid,bigint,boolean,jsonb,text)',
    'EXECUTE'
  ),
  'anonymous users cannot call the trusted save RPC'
);
select ok(
  not has_schema_privilege('authenticated', 'private', 'USAGE'),
  'authenticated users cannot access private validation helpers'
);
select ok(
  not has_schema_privilege('anon', 'private', 'USAGE'),
  'anonymous users cannot access private validation helpers'
);
select ok(
  not has_table_privilege('authenticated', 'public.prediction_sets', 'INSERT'),
  'authenticated users still cannot insert prediction sets directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.match_predictions', 'INSERT'),
  'authenticated users still cannot insert match predictions directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.prediction_sets', 'UPDATE'),
  'authenticated users still cannot update prediction sets directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.match_predictions', 'UPDATE'),
  'authenticated users still cannot update match predictions directly'
);
select is(
  (
    select count(*)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'save_my_prediction_bundle'
  ),
  1::bigint,
  'there is exactly one public prediction save route'
);

select lives_ok(
  $$
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values
      (
        'e0290000-0000-4000-8000-000000000001',
        '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'stage6-one@example.invalid', '', now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"display_name":"Stage Six One"}'::jsonb, now(), now()
      ),
      (
        'e0290000-0000-4000-8000-000000000002',
        '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'stage6-two@example.invalid', '', now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"display_name":"Stage Six Two"}'::jsonb, now(), now()
      ),
      (
        'e0290000-0000-4000-8000-000000000003',
        '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'stage6-admin@example.invalid', '', now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"display_name":"Stage Six Admin"}'::jsonb, now(), now()
      )
  $$,
  'three isolated Stage 6 test users can be created'
);
select lives_ok(
  $$
    update public.tournaments
    set prediction_lock_at = now() + interval '30 days',
        prediction_locked_at = null
    where id = 'e0280000-0000-4000-8000-000000000001'
  $$,
  'the test configures a future global prediction lock'
);

create or replace function pg_temp.euro28_group_bundle()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_agg(
    jsonb_build_object(
      'match_id', match_row.id,
      'predicted_home_tournament_team_id', home_slot.source_tournament_team_id,
      'predicted_away_tournament_team_id', away_slot.source_tournament_team_id,
      'home_score_90', 1,
      'away_score_90', 0,
      'advancing_tournament_team_id', null,
      'decision_method', null,
      'joker_applied', false
    )
    order by match_row.match_number
  )
  from public.matches match_row
  join public.match_slots home_slot
    on home_slot.match_id = match_row.id
   and home_slot.side = 'home'
  join public.match_slots away_slot
    on away_slot.match_id = match_row.id
   and away_slot.side = 'away'
  where match_row.tournament_id = 'e0280000-0000-4000-8000-000000000001'
    and match_row.match_number <= 36;
$$;

create or replace function pg_temp.euro28_complete_bundle()
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  bundle jsonb := pg_temp.euro28_group_bundle();
  expected record;
  target_match_number integer;
begin
  for target_match_number in 37..51
  loop
    select * into expected
    from private.euro28_expected_knockout_participants(
      'e0280000-0000-4000-8000-000000000001',
      bundle
    ) expected_row
    where expected_row.match_number = target_match_number;

    if not found or not expected.participants_resolved then
      raise exception 'Stage 6 test could not resolve knockout match %', target_match_number;
    end if;

    bundle := bundle || jsonb_build_array(
      jsonb_build_object(
        'match_id', expected.match_id,
        'predicted_home_tournament_team_id', expected.home_team_id,
        'predicted_away_tournament_team_id', expected.away_team_id,
        'home_score_90', 1,
        'away_score_90', 0,
        'advancing_tournament_team_id', expected.home_team_id,
        'decision_method', 'normal_time',
        'joker_applied', false
      )
    );
  end loop;

  return bundle;
end;
$$;

select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$
    select public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      0,
      false,
      jsonb_build_array(pg_temp.euro28_group_bundle()->0),
      'account'
    )
  $$,
  '42501',
  'Authentication is required to save predictions',
  'the save route rejects an unauthenticated caller'
);

select set_config(
  'request.jwt.claim.sub',
  'e0290000-0000-4000-8000-000000000001',
  true
);
select is(
  (
    public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      0,
      false,
      jsonb_build_array(pg_temp.euro28_group_bundle()->0),
      'account'
    )->>'revision'
  )::integer,
  1,
  'the first atomic save creates revision one'
);
select is(
  (
    select count(*)
    from public.prediction_sets
    where tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and user_id = 'e0290000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'one prediction set is created for the user and tournament'
);
select is(
  (
    select count(*)
    from public.match_predictions prediction
    join public.prediction_sets prediction_set
      on prediction_set.id = prediction.prediction_set_id
    where prediction_set.user_id = 'e0290000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'the supplied full bundle contains one stored prediction row'
);
select is(
  (
    public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      1,
      false,
      jsonb_build_array(pg_temp.euro28_group_bundle()->0),
      'account'
    )->>'revision'
  )::integer,
  2,
  'a second full-bundle save increments the optimistic revision'
);
select throws_ok(
  $$
    select public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      1,
      false,
      jsonb_build_array(pg_temp.euro28_group_bundle()->0),
      'account'
    )
  $$,
  '40001',
  'Prediction revision is stale',
  'a stale expected revision is rejected'
);
select throws_ok(
  $$
    select public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      2,
      true,
      jsonb_build_array(pg_temp.euro28_group_bundle()->0),
      'account'
    )
  $$,
  '22023',
  'All 51 predictions are required before entering review mode',
  'an incomplete bundle cannot enter submitted review mode'
);
select throws_ok(
  $$
    select public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      2,
      false,
      jsonb_build_array(pg_temp.euro28_group_bundle()->0),
      'automatic'
    )
  $$,
  '22023',
  'Unsupported prediction save source',
  'only account and explicit guest-import sources are accepted'
);
select throws_ok(
  $$
    select public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      2,
      false,
      jsonb_build_array(pg_temp.euro28_group_bundle()->0, pg_temp.euro28_group_bundle()->0),
      'account'
    )
  $$,
  '22023',
  'Prediction bundle contains duplicate matches',
  'duplicate match rows are rejected'
);
select throws_ok(
  $$
    select public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      2,
      false,
      jsonb_build_array(
        jsonb_set(
          pg_temp.euro28_group_bundle()->0,
          '{predicted_home_tournament_team_id}',
          (pg_temp.euro28_group_bundle()->0)->'predicted_away_tournament_team_id'
        )
      ),
      'account'
    )
  $$,
  '22023',
  'Prediction rows must contain complete participants and 90-minute scores',
  'a row cannot predict the same team on both sides'
);
select throws_ok(
  $$
    select public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      2,
      false,
      jsonb_build_array(
        jsonb_set(pg_temp.euro28_group_bundle()->0, '{joker_applied}', 'true'::jsonb)
      ),
      'account'
    )
  $$,
  'P0001',
  'The group-stage joker cap is not configured',
  'a joker fails closed while its exact cap is unresolved'
);
select lives_ok(
  $$
    update public.scoring_rulesets
    set group_stage_joker_cap = 2,
        knockout_joker_cap = 1
    where ruleset_key = 'euro28-scoring-provisional-v2'
  $$,
  'the test may temporarily configure joker caps inside its rollback transaction'
);
select is(
  (
    public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      2,
      false,
      jsonb_build_array(
        jsonb_set(pg_temp.euro28_group_bundle()->0, '{joker_applied}', 'true'::jsonb)
      ),
      'account'
    )->>'revision'
  )::integer,
  3,
  'a joker saves after the active ruleset supplies a cap'
);

select is(
  jsonb_array_length(pg_temp.euro28_complete_bundle()),
  51,
  'the server resolver produces a complete canonical 51-match bundle'
);
select is(
  (
    select count(*)
    from private.euro28_prediction_rows(pg_temp.euro28_complete_bundle()) prediction
    where prediction.advancing_tournament_team_id is not null
  ),
  15::bigint,
  'the complete bundle contains all 15 progressively resolved knockout picks'
);

select set_config(
  'request.jwt.claim.sub',
  'e0290000-0000-4000-8000-000000000002',
  true
);
select is(
  (
    public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      0,
      false,
      pg_temp.euro28_complete_bundle(),
      'guest_import'
    )->>'revision'
  )::integer,
  1,
  'an explicit complete guest import creates revision one atomically'
);
select is(
  (
    select last_save_source
    from public.prediction_sets
    where tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and user_id = 'e0290000-0000-4000-8000-000000000002'
  ),
  'guest_import',
  'the prediction set records the explicit guest import source'
);
select ok(
  (
    select guest_imported_at is not null
    from public.prediction_sets
    where tournament_id = 'e0280000-0000-4000-8000-000000000001'
      and user_id = 'e0290000-0000-4000-8000-000000000002'
  ),
  'the explicit guest import records its server timestamp'
);
select is(
  (
    select count(*)
    from public.match_predictions prediction
    join public.prediction_sets prediction_set
      on prediction_set.id = prediction.prediction_set_id
    where prediction_set.user_id = 'e0290000-0000-4000-8000-000000000002'
  ),
  51::bigint,
  'the guest import stores all 51 rows in one bundle'
);
select throws_ok(
  $$
    select public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      1,
      false,
      pg_temp.euro28_complete_bundle(),
      'guest_import'
    )
  $$,
  'P0001',
  'Guest import cannot overwrite existing account predictions',
  'a later guest import cannot replace account prediction rows'
);
select throws_ok(
  $$
    with complete as (
      select pg_temp.euro28_complete_bundle() as bundle
    ), tampered as (
      select jsonb_set(
        jsonb_set(
          jsonb_set(
            bundle,
            '{36,predicted_home_tournament_team_id}',
            bundle #> '{36,predicted_away_tournament_team_id}'
          ),
          '{36,predicted_away_tournament_team_id}',
          bundle #> '{36,predicted_home_tournament_team_id}'
        ),
        '{36,advancing_tournament_team_id}',
        bundle #> '{36,predicted_away_tournament_team_id}'
      ) as bundle
      from complete
    )
    select public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      1,
      false,
      tampered.bundle,
      'account'
    )
    from tampered
  $$,
  '22023',
  'Knockout prediction participants do not match the canonical bracket',
  'a client cannot submit a knockout path that differs from the canonical resolver'
);
select ok(
  (
    public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      1,
      true,
      pg_temp.euro28_complete_bundle(),
      'account'
    )->>'submitted_at'
  ) is not null,
  'submit records the reversible review-mode timestamp'
);
select ok(
  (
    public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      2,
      false,
      pg_temp.euro28_complete_bundle(),
      'account'
    )->'submitted_at'
  ) = 'null'::jsonb,
  'edit predictions clears review mode before the global lock'
);

select lives_ok(
  $$
    update public.tournaments
    set prediction_lock_at = now() - interval '1 minute'
    where id = 'e0280000-0000-4000-8000-000000000001'
  $$,
  'the test advances the tournament through its global lock'
);
select throws_ok(
  $$
    select public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      3,
      false,
      jsonb_set(pg_temp.euro28_complete_bundle(), '{0,home_score_90}', '2'::jsonb),
      'account'
    )
  $$,
  'P0001',
  'Prediction content is globally locked',
  'content changes are rejected after the global lock'
);
select throws_ok(
  $$
    select public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      3,
      true,
      pg_temp.euro28_complete_bundle(),
      'account'
    )
  $$,
  'P0001',
  'Review mode cannot be changed after the global lock',
  'submitted review mode cannot change after the global lock'
);
select set_config(
  'request.jwt.claim.sub',
  'e0290000-0000-4000-8000-000000000001',
  true
);
select throws_ok(
  $$
    select public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      3,
      false,
      pg_temp.euro28_complete_bundle(),
      'guest_import'
    )
  $$,
  'P0001',
  'Guest import requires a complete 51-match bundle before the global lock',
  'guest import is permanently closed after the global lock'
);

select lives_ok(
  $$
    update public.matches
    set kickoff_at = now() + interval '2 days',
        status = 'scheduled'
    where id = (pg_temp.euro28_complete_bundle()->0->>'match_id')::uuid;

    insert into public.prediction_grace_windows (
      tournament_id, user_id, match_id, granted_by_user_id, expires_at, reason
    ) values (
      'e0280000-0000-4000-8000-000000000001',
      'e0290000-0000-4000-8000-000000000002',
      (pg_temp.euro28_complete_bundle()->0->>'match_id')::uuid,
      'e0290000-0000-4000-8000-000000000003',
      now() + interval '1 hour',
      'Stage 6 scoped save test'
    )
  $$,
  'one user receives grace for one specific unstarted match'
);
select set_config(
  'request.jwt.claim.sub',
  'e0290000-0000-4000-8000-000000000002',
  true
);
select is(
  (
    public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      3,
      false,
      jsonb_set(pg_temp.euro28_complete_bundle(), '{0,home_score_90}', '2'::jsonb),
      'account'
    )->>'revision'
  )::integer,
  4,
  'scoped grace permits a content change for its one unstarted match'
);
select throws_ok(
  $$
    select public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      4,
      false,
      jsonb_set(
        jsonb_set(pg_temp.euro28_complete_bundle(), '{0,home_score_90}', '2'::jsonb),
        '{1,home_score_90}',
        '2'::jsonb
      ),
      'account'
    )
  $$,
  'P0001',
  'Prediction content is globally locked',
  'grace for one match does not reopen another match'
);
select is(
  (
    public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      4,
      false,
      jsonb_set(
        jsonb_set(pg_temp.euro28_complete_bundle(), '{0,home_score_90}', '2'::jsonb),
        '{0,joker_applied}',
        'true'::jsonb
      ),
      'account'
    )->>'revision'
  )::integer,
  5,
  'a joker can move onto an unstarted match after the global content lock'
);
select lives_ok(
  $$
    update public.matches
    set kickoff_at = now() - interval '1 minute'
    where id = (pg_temp.euro28_complete_bundle()->0->>'match_id')::uuid
  $$,
  'the test starts the joker target match'
);
select throws_ok(
  $$
    select public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      5,
      false,
      jsonb_set(pg_temp.euro28_complete_bundle(), '{0,home_score_90}', '2'::jsonb),
      'account'
    )
  $$,
  'P0001',
  'A joker cannot be changed after its match has started',
  'the per-match joker lock prevents removing a started-match joker'
);

select set_config(
  'request.jwt.claim.sub',
  'e0290000-0000-4000-8000-000000000001',
  true
);
select is(
  (
    public.save_my_prediction_bundle(
      'e0280000-0000-4000-8000-000000000001',
      3,
      false,
      jsonb_build_array(
        jsonb_set(pg_temp.euro28_group_bundle()->0, '{joker_applied}', 'true'::jsonb)
      ),
      'account'
    )->>'revision'
  )::integer,
  4,
  'another user can resave unchanged rows after lock without cross-user false positives'
);
select is(
  (
    select count(*)
    from public.prediction_sets
    where tournament_id = 'e0280000-0000-4000-8000-000000000001'
  ),
  2::bigint,
  'the database retains one prediction set for each tested user'
);
select is(
  (
    select count(*)
    from public.match_predictions prediction
    join public.prediction_sets prediction_set
      on prediction_set.id = prediction.prediction_set_id
    where prediction_set.user_id = 'e0290000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'the first user retains only their own one-row full bundle'
);
select is(
  (
    select count(*)
    from public.match_predictions prediction
    join public.prediction_sets prediction_set
      on prediction_set.id = prediction.prediction_set_id
    where prediction_set.user_id = 'e0290000-0000-4000-8000-000000000002'
  ),
  51::bigint,
  'the second user retains their own complete 51-row full bundle'
);
select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in ('prediction_sets', 'match_predictions')
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      and roles @> array['authenticated']::name[]
  ),
  0::bigint,
  'Stage 6 adds no direct browser table-write policies'
);

select * from finish();
rollback;
