-- Stage DP-SCORING — idempotent scoring_rulesets value update.
--
-- STAGING FOLLOW-UP — DO NOT run against production (WC26 ouhxawizadnwrhrjppld).
-- Euro staging is gcfdwobpnanjchcnvdco. Per CLAUDE.md, a fresh VERIFIED backup is
-- required before any staging write, every time. This script was NOT applied in
-- the authoring session; it is queued for a backup-first staging run.
--
-- What it does: repoints the active Euro scoring_rulesets row to the locked
-- contract (CLAUDE.md §4). The row is 'provisional' (mutable); locked rows are
-- immutable by trigger. Data-driven columns (group match, bracket ladder, KO
-- advancer) take effect on the next euro28_recalculate_points run. The KO
-- three-component behaviour also needs migration 202607100021 (function change);
-- the knockout_decision_method_points column (kept at 5) becomes the draw-call
-- value under that function.
--
-- Idempotent: re-running sets the same values. Guarded so it refuses to touch a
-- locked/retired ruleset.

begin;

do $$
declare
  target_id constant uuid := 'e0285000-0000-4000-8000-000000000001';
  current_status text;
begin
  select status into current_status from public.scoring_rulesets where id = target_id;
  if current_status is null then
    raise exception 'DP-SCORING: scoring_rulesets row % not found', target_id;
  end if;
  if current_status <> 'provisional' then
    raise exception 'DP-SCORING: ruleset % is % (not provisional); a locked ruleset is immutable — insert a new version instead', target_id, current_status;
  end if;
end $$;

update public.scoring_rulesets
set
  match_exact_score_points        = 5,   -- was 30
  match_correct_outcome_points    = 3,   -- was 10
  knockout_advancing_team_points  = 5,   -- was 10 (KO correct advancer)
  knockout_decision_method_points = 5,   -- reused as the KO draw-call value (see migration 021)
  round_of_16_team_points         = 8,   -- was 10
  quarter_final_team_points       = 12,  -- was 15
  semi_final_team_points          = 15,  -- was 20
  finalist_points                 = 20,  -- was 25
  champion_points                 = 45,  -- was 50 (Final 20 + 25 champion bonus)
  group_stage_joker_cap           = 5,
  knockout_joker_cap              = 5,
  updated_at                      = now()
where id = 'e0285000-0000-4000-8000-000000000001'
  and status = 'provisional';

-- Verification (should return the locked values):
select match_exact_score_points, match_correct_outcome_points,
       knockout_advancing_team_points, knockout_decision_method_points,
       round_of_16_team_points, quarter_final_team_points, semi_final_team_points,
       finalist_points, champion_points, group_stage_joker_cap, knockout_joker_cap
from public.scoring_rulesets
where id = 'e0285000-0000-4000-8000-000000000001';

commit;
