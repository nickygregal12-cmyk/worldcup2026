begin;

set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(24);

select has_function('public', 'save_my_prediction_bundle', array['uuid','bigint','boolean','jsonb','text'], 'original atomic save RPC exists');
select has_function('private', 'euro28_prediction_rows', array['jsonb'], 'shared prediction JSON parser exists');
select has_function('private', 'euro28_expected_knockout_participants', array['uuid','jsonb'], 'canonical bracket validator exists');
select has_column('public', 'prediction_sets', 'guest_imported_at', 'prediction sets record guest imports');
select has_column('public', 'prediction_sets', 'last_save_source', 'prediction sets record save source');

select ok((select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='save_my_prediction_bundle' and p.pronargs=5), 'original save RPC is SECURITY DEFINER');
select ok((select p.proconfig @> array['search_path=""']::text[] from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='save_my_prediction_bundle' and p.pronargs=5), 'original save RPC fixes an empty search path');
select ok(has_function_privilege('authenticated','public.save_my_prediction_bundle(uuid,bigint,boolean,jsonb,text)','EXECUTE'), 'authenticated users may call original save RPC');
select ok(not has_function_privilege('anon','public.save_my_prediction_bundle(uuid,bigint,boolean,jsonb,text)','EXECUTE'), 'anonymous users cannot call original save RPC');
select ok(not has_schema_privilege('authenticated','private','USAGE'), 'authenticated users cannot access private validation helpers');
select ok(not has_schema_privilege('anon','private','USAGE'), 'anonymous users cannot access private validation helpers');

select ok(not has_table_privilege('authenticated','public.prediction_sets','INSERT'), 'authenticated users cannot insert prediction sets directly');
select ok(not has_table_privilege('authenticated','public.match_predictions','INSERT'), 'authenticated users cannot insert match predictions directly');
select ok(not has_table_privilege('authenticated','public.prediction_sets','UPDATE'), 'authenticated users cannot update prediction sets directly');
select ok(not has_table_privilege('authenticated','public.match_predictions','UPDATE'), 'authenticated users cannot update match predictions directly');
select ok(not has_table_privilege('authenticated','public.prediction_sets','DELETE'), 'authenticated users cannot delete prediction sets directly');
select ok(not has_table_privilege('authenticated','public.match_predictions','DELETE'), 'authenticated users cannot delete match predictions directly');

select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='save_my_prediction_bundle'),1::bigint,'there is exactly one original prediction save RPC');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='euro28_expected_knockout_participants'),1::bigint,'there is one canonical database bracket resolver');
select ok((select relrowsecurity from pg_class where oid='public.prediction_sets'::regclass),'RLS remains enabled on prediction sets');
select ok((select relrowsecurity from pg_class where oid='public.match_predictions'::regclass),'RLS remains enabled on match predictions');
select ok(not exists(select 1 from pg_policies where schemaname='public' and tablename in ('prediction_sets','match_predictions') and cmd in ('INSERT','UPDATE','DELETE','ALL') and roles && array['anon','authenticated']::name[]),'no direct browser write policies exist');
select ok(not exists(select 1 from information_schema.tables where table_schema='public' and table_name='guest_predictions'),'guest predictions have no server-side table');
select ok(exists(select 1 from public.scoring_rulesets where ruleset_key='euro28-scoring-provisional-v2' and status='provisional'),'the active provisional scoring ruleset remains available');

select * from finish();
rollback;
