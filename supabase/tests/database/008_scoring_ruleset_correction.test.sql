begin;

set local role postgres;

create extension if not exists pgtap with schema extensions;

set local search_path = public, extensions;

select plan(7);

select is(
  (
    select count(*)
    from public.scoring_rulesets
    where ruleset_key = 'euro28-scoring-provisional-v2'
  ),
  1::bigint,
  'the canonical provisional Euro ruleset exists exactly once'
);

select is(
  (
    select status
    from public.scoring_rulesets
    where ruleset_key = 'euro28-scoring-provisional-v2'
  ),
  'provisional',
  'the canonical ruleset remains provisional'
);

select is(
  (
    select group_stage_joker_cap
    from public.scoring_rulesets
    where ruleset_key = 'euro28-scoring-provisional-v2'
  ),
  5,
  'the original group-stage joker cap is five'
);

select is(
  (
    select knockout_joker_cap
    from public.scoring_rulesets
    where ruleset_key = 'euro28-scoring-provisional-v2'
  ),
  5,
  'the separate KO Predictor joker cap is five'
);

select is(
  (
    select joker_multiplier
    from public.scoring_rulesets
    where ruleset_key = 'euro28-scoring-provisional-v2'
  ),
  2.000::numeric,
  'the provisional joker multiplier remains 2x'
);

select is(
  (
    select match_exact_score_points
    from public.scoring_rulesets
    where ruleset_key = 'euro28-scoring-provisional-v2'
  ),
  30,
  'the exact-score value remains unchanged'
);

select ok(
  exists (
    select 1
    from public.tournaments as tournament
    join public.scoring_rulesets as ruleset
      on ruleset.id = tournament.active_scoring_ruleset_id
     and ruleset.tournament_id = tournament.id
    where tournament.code = 'euro-2028'
      and ruleset.ruleset_key = 'euro28-scoring-provisional-v2'
  ),
  'the tournament still points at the corrected canonical ruleset'
);

select * from finish();

rollback;
