-- Add the direct matches.venue_id -> venues.id foreign key.
--
-- WHY: the runtime matches query embeds each match's venue name/city with the
-- PostgREST relationship `venue:venues!matches_venue_id_fkey(name,city)` (see
-- src/runtime/loadEuroApp.js). PostgREST can only embed across a declared
-- foreign key, and until now the ONLY key involving matches.venue_id was the
-- composite matches_tournament_id_venue_id_fkey -> tournament_venues, which
-- targets the join table, not venues. So the embed failed with PGRST200
-- ("Could not find a relationship between 'matches' and 'venue_id'").
--
-- This adds the natural one-to-one key so the venue embed resolves. It is
-- purely additive: the composite key to tournament_venues stays and keeps
-- enforcing that a match's venue is one assigned to the tournament. Every
-- existing matches.venue_id is already a valid venues.id (all 51 fixtures,
-- zero orphans), so the constraint validates on creation without touching
-- any data. Idempotent: skipped if it already exists.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'matches_venue_id_fkey'
  ) then
    alter table public.matches
      add constraint matches_venue_id_fkey
      foreign key (venue_id) references public.venues(id) on delete restrict;
  end if;
end
$$;

-- Refresh the PostgREST schema cache so the new relationship is picked up
-- without a restart.
notify pgrst, 'reload schema';
