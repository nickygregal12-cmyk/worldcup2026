-- Euro 2028 provisional joker-cap correction (Migration 008).
--
-- Linked staging diagnostics found that the canonical provisional ruleset had
-- drifted to a group-stage joker cap of 8 even though both exact joker caps
-- remain deliberately unresolved. Keep the ruleset provisional and restore
-- both nullable caps without changing any scoring values or lock behaviour.

begin;

do $migration$
declare
  target_count bigint;
  target_status text;
begin
  select count(*), min(status)
    into target_count, target_status
  from public.scoring_rulesets
  where ruleset_key = 'euro28-scoring-provisional-v2';

  if target_count <> 1 then
    raise exception 'Expected exactly one canonical Euro 2028 provisional scoring ruleset, found %', target_count;
  end if;

  if target_status <> 'provisional' then
    raise exception 'Canonical Euro 2028 scoring ruleset must remain provisional before joker caps are corrected';
  end if;

  update public.scoring_rulesets
  set
    group_stage_joker_cap = null,
    knockout_joker_cap = null
  where ruleset_key = 'euro28-scoring-provisional-v2'
    and (
      group_stage_joker_cap is not null
      or knockout_joker_cap is not null
    );
end
$migration$;

commit;
