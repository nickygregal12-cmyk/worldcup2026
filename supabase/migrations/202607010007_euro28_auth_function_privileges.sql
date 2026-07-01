-- Euro 2028 authentication function privilege hardening (Migration 007).
--
-- Existing Supabase projects can carry role-specific default EXECUTE grants for
-- functions created in public. Migration 006 revoked PUBLIC access, but the
-- linked Euro staging project also granted anon/authenticated explicitly.
-- This migration removes those browser-role grants, restores only the two
-- intended RPC grants, and prevents the same drift for future postgres-owned
-- public functions.

begin;

alter default privileges for role postgres
  revoke execute on functions from public;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

revoke execute on function public.set_updated_at()
  from public, anon, authenticated;

revoke execute on function public.guard_scoring_ruleset_state()
  from public, anon, authenticated;

revoke execute on function public.guard_tournament_prediction_lock()
  from public, anon, authenticated;

revoke execute on function public.normalise_profile_display_name(text)
  from public, anon, authenticated;

revoke execute on function public.normalise_profile_before_write()
  from public, anon, authenticated;

revoke execute on function public.handle_new_euro_user_profile()
  from public, anon, authenticated;

revoke execute on function public.is_display_name_available(text)
  from public, anon, authenticated;

grant execute on function public.is_display_name_available(text)
  to anon, authenticated;

revoke execute on function public.update_my_profile_display_name(text)
  from public, anon, authenticated;

grant execute on function public.update_my_profile_display_name(text)
  to authenticated;

commit;
