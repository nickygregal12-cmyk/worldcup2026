begin;

set local role postgres;

create extension if not exists pgtap with schema extensions;

set local search_path = public, extensions;

select plan(39);

create function public.euro28_default_execute_probe()
returns integer
language sql
set search_path = ''
as $$ select 1 $$;

select has_table('public', 'profiles', 'profiles exists');
select has_column('public', 'profiles', 'id', 'profiles owns the auth user id');
select has_column('public', 'profiles', 'display_name', 'profiles stores a display name');
select has_column('public', 'profiles', 'created_at', 'profiles records creation time');
select has_column('public', 'profiles', 'updated_at', 'profiles records update time');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on profiles'
);
select ok(
  not has_table_privilege('anon', 'public.profiles', 'SELECT'),
  'anonymous users cannot read profiles directly'
);
select ok(
  has_table_privilege('authenticated', 'public.profiles', 'SELECT'),
  'authenticated users have RLS-controlled profile reads'
);
select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'INSERT'),
  'authenticated users cannot insert profiles directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'UPDATE'),
  'authenticated users cannot update profiles directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'DELETE'),
  'authenticated users cannot delete profiles directly'
);
select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_owner_read'
      and cmd = 'SELECT'
      and roles @> array['authenticated']::name[]
  ),
  1::bigint,
  'profiles has exactly one authenticated owner-read policy'
);

select has_function(
  'public',
  'normalise_profile_display_name',
  array['text'],
  'display-name normaliser exists'
);
select has_function(
  'public',
  'is_display_name_available',
  array['text'],
  'display-name availability RPC exists'
);
select has_function(
  'public',
  'update_my_profile_display_name',
  array['text'],
  'owner profile update RPC exists'
);
select ok(
  has_function_privilege('anon', 'public.is_display_name_available(text)', 'EXECUTE'),
  'anonymous sign-up flow may check display-name availability'
);
select ok(
  has_function_privilege('authenticated', 'public.is_display_name_available(text)', 'EXECUTE'),
  'authenticated users may check display-name availability'
);
select ok(
  not has_function_privilege('anon', 'public.normalise_profile_display_name(text)', 'EXECUTE'),
  'anonymous users cannot execute the internal display-name normaliser'
);
select ok(
  not has_function_privilege('authenticated', 'public.normalise_profile_display_name(text)', 'EXECUTE'),
  'authenticated users cannot execute the internal display-name normaliser'
);
select ok(
  not has_function_privilege('anon', 'public.normalise_profile_before_write()', 'EXECUTE'),
  'anonymous users cannot execute the profile write trigger function'
);
select ok(
  not has_function_privilege('authenticated', 'public.normalise_profile_before_write()', 'EXECUTE'),
  'authenticated users cannot execute the profile write trigger function'
);
select ok(
  not has_function_privilege('anon', 'public.handle_new_euro_user_profile()', 'EXECUTE'),
  'anonymous users cannot execute the Auth profile trigger function'
);
select ok(
  not has_function_privilege('authenticated', 'public.handle_new_euro_user_profile()', 'EXECUTE'),
  'authenticated users cannot execute the Auth profile trigger function'
);
select ok(
  not has_function_privilege('anon', 'public.euro28_default_execute_probe()', 'EXECUTE'),
  'new postgres functions do not grant execute to anonymous users'
);
select ok(
  not has_function_privilege('authenticated', 'public.euro28_default_execute_probe()', 'EXECUTE'),
  'new postgres functions do not grant execute to authenticated users'
);
select ok(
  not has_function_privilege('anon', 'public.update_my_profile_display_name(text)', 'EXECUTE'),
  'anonymous users cannot rename profiles'
);
select ok(
  has_function_privilege('authenticated', 'public.update_my_profile_display_name(text)', 'EXECUTE'),
  'authenticated users may call the controlled profile rename RPC'
);
select ok(
  exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth'
      and c.relname = 'users'
      and t.tgname = 'on_auth_user_created_euro_profile'
      and not t.tgisinternal
  ),
  'auth.users has the Euro profile creation trigger'
);
select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'profiles'
      and indexname = 'profiles_display_name_case_insensitive_unique'
      and indexdef ilike '%unique%lower(display_name)%'
  ),
  'display names are unique without case sensitivity'
);

select is(
  public.normalise_profile_display_name('  Nicky   Gregal  '),
  'Nicky Gregal',
  'display names are trimmed and internal spaces are collapsed'
);
select throws_ok(
  $$ select public.normalise_profile_display_name('ab') $$,
  '22023',
  'Display name must be between 3 and 30 characters',
  'display names shorter than three characters are rejected'
);
select throws_ok(
  $$ select public.normalise_profile_display_name('Bad<Name') $$,
  '22023',
  'Display name contains unsupported characters',
  'unsupported display-name characters are rejected'
);
select ok(
  public.is_display_name_available('Stage Five Tester'),
  'a valid unclaimed display name reports available'
);
select ok(
  not public.is_display_name_available('x'),
  'an invalid display name reports unavailable without raising'
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  'e0286000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'stage5-test@example.invalid',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"  Stage   Five Tester  "}'::jsonb,
  now(),
  now()
);

select is(
  (
    select display_name
    from public.profiles
    where id = 'e0286000-0000-4000-8000-000000000001'
  ),
  'Stage Five Tester',
  'auth user creation produces one normalised profile row'
);
select ok(
  not public.is_display_name_available('stage five tester'),
  'claimed names are unavailable regardless of case'
);

select set_config(
  'request.jwt.claim.sub',
  'e0286000-0000-4000-8000-000000000001',
  true
);

select lives_ok(
  $$ select * from public.update_my_profile_display_name('Stage Five Renamed') $$,
  'the authenticated owner can rename through the controlled RPC'
);
select is(
  (
    select display_name
    from public.profiles
    where id = 'e0286000-0000-4000-8000-000000000001'
  ),
  'Stage Five Renamed',
  'the controlled RPC stores the validated replacement name'
);
select is(
  (
    select count(*)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname ~ '(save.*prediction|prediction.*save)'
  ),
  2::bigint,
  'Stage 8 exposes separate original and KO Predictor save RPCs'
);

select * from finish();
rollback;
