-- Euro 2028 authentication and profile foundation (Migration 006).
--
-- This migration adds profile ownership and narrowly scoped profile RPCs for
-- authenticated Euro accounts. It deliberately does not create prediction
-- saving, guest-server storage, leagues, scoring runs, result entry or admin UI.

begin;

create or replace function public.normalise_profile_display_name(candidate text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  normalised text := regexp_replace(btrim(coalesce(candidate, '')), '[[:space:]]+', ' ', 'g');
begin
  if char_length(normalised) < 3 or char_length(normalised) > 30 then
    raise exception 'Display name must be between 3 and 30 characters'
      using errcode = '22023';
  end if;

  if normalised !~ '^[[:alnum:]][[:alnum:] ._''-]*[[:alnum:]]$' then
    raise exception 'Display name contains unsupported characters'
      using errcode = '22023';
  end if;

  return normalised;
end;
$$;

comment on function public.normalise_profile_display_name(text) is
  'Returns the canonical Euro profile display name or raises 22023 when invalid.';

revoke all on function public.normalise_profile_display_name(text) from public;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_is_canonical
    check (display_name = public.normalise_profile_display_name(display_name))
);

comment on table public.profiles is
  'Euro account profile owned one-to-one by auth.users. Email addresses remain in auth only.';
comment on column public.profiles.display_name is
  'Case-insensitively unique public-facing name. Direct browser writes are not granted.';

create unique index profiles_display_name_case_insensitive_unique
  on public.profiles (lower(display_name));

create or replace function public.normalise_profile_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.display_name := public.normalise_profile_display_name(new.display_name);
  return new;
end;
$$;

revoke all on function public.normalise_profile_before_write() from public;

create trigger profiles_normalise_display_name
before insert or update of display_name on public.profiles
for each row execute function public.normalise_profile_before_write();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_euro_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    public.normalise_profile_display_name(new.raw_user_meta_data ->> 'display_name')
  );

  return new;
end;
$$;

comment on function public.handle_new_euro_user_profile() is
  'Creates exactly one validated Euro profile after an auth.users row is created.';

revoke all on function public.handle_new_euro_user_profile() from public;

create trigger on_auth_user_created_euro_profile
after insert on auth.users
for each row execute function public.handle_new_euro_user_profile();

-- Backfill any pre-existing staging auth users without weakening the rules for
-- future sign-ups. Invalid or duplicate legacy metadata receives a deterministic
-- non-sensitive fallback derived from the user UUID.
do $$
declare
  existing_user record;
  candidate text;
begin
  for existing_user in
    select u.id, u.raw_user_meta_data
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p.id is null
    order by u.created_at, u.id
  loop
    begin
      candidate := public.normalise_profile_display_name(
        existing_user.raw_user_meta_data ->> 'display_name'
      );

      insert into public.profiles (id, display_name)
      values (existing_user.id, candidate);
    exception
      when sqlstate '22023' or unique_violation then
        insert into public.profiles (id, display_name)
        values (
          existing_user.id,
          'Player-' || substr(replace(existing_user.id::text, '-', ''), 1, 8)
        );
    end;
  end loop;
end;
$$;

create or replace function public.is_display_name_available(candidate text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalised text;
begin
  begin
    normalised := public.normalise_profile_display_name(candidate);
  exception
    when sqlstate '22023' then
      return false;
  end;

  return not exists (
    select 1
    from public.profiles p
    where lower(p.display_name) = lower(normalised)
  );
end;
$$;

comment on function public.is_display_name_available(text) is
  'Validates a proposed display name and returns only whether it is currently unclaimed.';

revoke all on function public.is_display_name_available(text) from public;
grant execute on function public.is_display_name_available(text) to anon, authenticated;

create or replace function public.update_my_profile_display_name(candidate text)
returns table (
  id uuid,
  display_name text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalised text;
begin
  if current_user_id is null then
    raise exception 'Authentication is required to update a profile'
      using errcode = '42501';
  end if;

  normalised := public.normalise_profile_display_name(candidate);

  return query
  update public.profiles p
  set display_name = normalised
  where p.id = current_user_id
  returning p.id, p.display_name, p.created_at, p.updated_at;

  if not found then
    raise exception 'Profile was not found for the authenticated user'
      using errcode = 'P0002';
  end if;
exception
  when unique_violation then
    raise exception 'Display name is already in use'
      using errcode = '23505';
end;
$$;

comment on function public.update_my_profile_display_name(text) is
  'Authenticated owner-only profile rename. The table itself remains read-only to browsers.';

revoke all on function public.update_my_profile_display_name(text) from public;
grant execute on function public.update_my_profile_display_name(text) to authenticated;

alter table public.profiles enable row level security;

create policy profiles_owner_read
on public.profiles
for select
to authenticated
using (auth.uid() = id);

revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

commit;
