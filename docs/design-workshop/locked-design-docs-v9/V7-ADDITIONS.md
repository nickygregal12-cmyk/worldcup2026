# v7 additions — Streamlined Remaining Jobs Plan

This v7 pack keeps the v6 locked visual-contract, missing-surface, candidate-team-pool and
scenario-runner records intact, and adds the streamlined remaining-jobs plan as the governing
implementation sequence.

## Purpose

The v7 addition replaces the earlier long, fragmented job list with a cleaner grouped plan.

The principle is:

> Do not split work into tiny stages where the same files or same user journey would be edited multiple times.

Work should be grouped where:

- the same pages/routes are affected;
- one feature depends on another;
- the same docs/config/copy need updating;
- the same acceptance rules apply;
- implementation needs to stay coherent.

Work should stay separate where:

- data safety risk is high;
- admin/staging tools could affect scoring/results;
- database/schema assumptions might be involved;
- legacy deletion needs proof;
- final readiness testing depends on multiple completed features.

## Streamlined batch order

```text
0. CONTRACTS-REF-LOCKED-SURFACES-3
1. STAGE-RULES-SCORING-LOCK-1
2. STAGE-ENTRY-AND-REVIEW-JOURNEY-1
3. STAGE-MORE-ACCOUNT-TRUST-1
4. STAGE-TOURNAMENT-STORY-SURFACES-1
5. STAGE-LEAGUE-MANAGEMENT-1
6. STAGE-CONTEXTUAL-SURFACES-1
7. STAGE-CANDIDATE-TEAM-POOL-1
8. STAGE-ADMIN-SCENARIO-RUNNER-1
9. STAGE-LEGACY-REFERENCE-CLEANUP-1
10. STAGE-TOURNAMENT-READINESS-ACCEPTANCE-1
```

## Important change from previous packs

The previous packs recorded many future items. v7 adds the decision about **how to group and
sequence them**.

The immediate next repo work remains recording-only:

`CONTRACTS-REF-LOCKED-SURFACES-3`

After that, implementation should not jump straight to isolated Home or individual surface jobs.
The grouped order should be followed unless Nicky explicitly re-sequences it.
