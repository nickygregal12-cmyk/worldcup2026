begin;

set local search_path = public, extensions;

select plan(31);

select has_table('public', 'scoring_rulesets', 'scoring_rulesets exists');
select has_table('public', 'prediction_sets', 'prediction_sets exists');
select has_table('public', 'match_predictions', 'match_predictions exists');
select has_table('public', 'prediction_grace_windows', 'prediction_grace_windows exists');

select has_column('public', 'tournaments', 'active_scoring_ruleset_id', 'tournament has active ruleset pointer');
select has_column('public', 'tournaments', 'prediction_contract_version', 'tournament has prediction contract version');
select has_column('public', 'tournaments', 'prediction_locked_at', 'tournament has persisted global lock');
select has_column('public', 'prediction_sets', 'submitted_at', 'prediction sets store reversible submitted_at');
select has_column('public', 'match_predictions', 'joker_applied', 'match predictions store joker allocation');
select has_column('public', 'prediction_grace_windows', 'expires_at', 'grace windows expire');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.scoring_rulesets'::regclass),
  'RLS is enabled on scoring_rulesets'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.prediction_sets'::regclass),
  'RLS is enabled on prediction_sets'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.match_predictions'::regclass),
  'RLS is enabled on match_predictions'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.prediction_grace_windows'::regclass),
  'RLS is enabled on prediction_grace_windows'
);

select ok(
  not has_table_privilege('anon', 'public.prediction_sets', 'SELECT'),
  'anonymous users cannot read prediction sets'
);
select ok(
  has_table_privilege('authenticated', 'public.prediction_sets', 'SELECT'),
  'authenticated users have RLS-controlled prediction reads'
);
select ok(
  not has_table_privilege('authenticated', 'public.prediction_sets', 'INSERT'),
  'authenticated users cannot insert prediction sets directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.prediction_sets', 'UPDATE'),
  'authenticated users cannot update prediction sets directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.prediction_sets', 'DELETE'),
  'authenticated users cannot delete prediction sets directly'
);
select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in ('scoring_rulesets', 'prediction_sets', 'match_predictions', 'prediction_grace_windows')
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      and (roles @> array['anon']::name[] or roles @> array['authenticated']::name[])
  ),
  0::bigint,
  'Migration 005 creates no browser write policies'
);
select ok(
  has_table_privilege('anon', 'public.scoring_rulesets', 'SELECT'),
  'published scoring configuration is readable for guest rules displays'
);

select is(
  (select count(*) from public.scoring_rulesets where ruleset_key = 'euro28-scoring-provisional-v2'),
  1::bigint,
  'one provisional Euro ruleset is seeded'
);
select is(
  (select joker_multiplier from public.scoring_rulesets where ruleset_key = 'euro28-scoring-provisional-v2'),
  2.000::numeric,
  'the provisional joker multiplier is 2x'
);
select ok(
  (
    select group_stage_joker_cap is null and knockout_joker_cap is null
    from public.scoring_rulesets
    where ruleset_key = 'euro28-scoring-provisional-v2'
  ),
  'both exact joker caps remain deliberately unresolved'
);
select ok(
  exists (
    select 1
    from public.tournaments t
    join public.scoring_rulesets sr
      on sr.id = t.active_scoring_ruleset_id
     and sr.tournament_id = t.id
    where t.code = 'euro-2028'
      and t.prediction_contract_version = 'euro28-prediction-db-v2'
  ),
  'the Euro tournament points at its active ruleset and prediction contract'
);
select is(
  (
    select count(*)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname ~ '(save.*prediction|prediction.*save)'
  ),
  0::bigint,
  'the final prediction save RPC is still absent'
);

select lives_ok(
  $$
    update public.scoring_rulesets
    set status = 'locked'
    where ruleset_key = 'euro28-scoring-provisional-v2'
  $$,
  'a provisional ruleset can be formally locked'
);
select throws_ok(
  $$
    update public.scoring_rulesets
    set match_exact_score_points = 31
    where ruleset_key = 'euro28-scoring-provisional-v2'
  $$,
  'P0001',
  'Locked or retired scoring rulesets are immutable',
  'a locked ruleset cannot be edited silently'
);
select lives_ok(
  $$
    update public.tournaments
    set prediction_locked_at = now() - interval '1 minute'
    where code = 'euro-2028'
  $$,
  'the global prediction lock can be persisted once'
);
select throws_ok(
  $$
    update public.tournaments
    set prediction_locked_at = null
    where code = 'euro-2028'
  $$,
  'P0001',
  'prediction_locked_at is monotonic and cannot be changed or cleared',
  'the persisted global prediction lock cannot be reopened'
);
select ok(
  not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name like '%guest%prediction%'
  ),
  'guest predictions have no server-side table'
);

select * from finish();
rollback;
