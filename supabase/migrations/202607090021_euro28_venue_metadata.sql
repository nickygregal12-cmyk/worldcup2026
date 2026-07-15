-- Euro 2028 venue metadata (Migration 021).
--
-- The Tournament page previously rendered a hardcoded venue list from client
-- config while match cards rendered venue names from public.venues — two
-- sources for the same fact. Venues follow the tournament_teams.metadata
-- pattern: a jsonb metadata column carries editorial facts that are not
-- derivable from schedule data. Only the host nation qualifies (country_code
-- is GB for England, Scotland and Wales alike); venue tags such as "Opening
-- match" and "Final" are derived client-side from the real fixtures and are
-- deliberately NOT stored, so they can never drift from the schedule.

begin;

alter table public.venues
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.venues.metadata is
  'Editorial venue facts keyed for display (e.g. hostNation). Schedule-derivable facts (opening/semi/final tags) are computed from matches and never stored here.';

update public.venues
set metadata = metadata || jsonb_build_object('hostNation', seed.host_nation)
from (
  values
    ('wembley-stadium', 'England'),
    ('tottenham-hotspur-stadium', 'England'),
    ('national-stadium-of-wales', 'Wales'),
    ('manchester-city-stadium', 'England'),
    ('everton-stadium', 'England'),
    ('st-james-park', 'England'),
    ('villa-park', 'England'),
    ('hampden-park', 'Scotland'),
    ('dublin-arena', 'Republic of Ireland')
) as seed (slug, host_nation)
where public.venues.slug = seed.slug;

do $migration$
declare
  missing_count bigint;
begin
  select count(*) into missing_count
  from public.venues
  where is_active
    and (metadata ->> 'hostNation') is null;
  if missing_count > 0 then
    raise exception 'Every active Euro 2028 venue needs a hostNation in metadata; % missing', missing_count;
  end if;
end
$migration$;

commit;
