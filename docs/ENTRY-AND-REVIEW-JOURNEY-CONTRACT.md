# Entry and Review Journey Contract

This contract is the implementation target for `STAGE-ENTRY-AND-REVIEW-JOURNEY-1`.

## Contract summary

Home, Review Picks, Welcome and Invite/Join form one entry/completion journey.

The app must guide users through:

```text
Welcome / Home → Groups → Original Bracket → Review Picks → Leagues
```

The KO Predictor remains separate and must not become a pre-tournament primary CTA before real knockout readiness.

## Locked CTA ladder

- No picks started → Start Groups.
- Groups incomplete → Continue Groups.
- Groups complete, bracket incomplete → Continue to Bracket.
- Groups complete, bracket complete, Review incomplete → Review Picks.
- Review complete before lock → You're ready / View leagues / Join league.
- Original locked → View your picks / View leagues.
- Tournament live → View today's matches / View points / View leagues.

## Review blockers

Review is incomplete until row counts and qualitative blockers are clear:

- all 36 group scores complete;
- bracket picks complete once available;
- unresolved in-group tiebreaker prompt answered;
- best-third prompt answered where required;
- stale bracket after group-score edits reviewed;
- joker-on-incomplete-score issue cleared;
- saved/import state is clear for the user's account/guest context.

## Required prompt wording

```text
Change scores
Pick positions
```

```text
Your group changes affected your bracket.
Some knockout picks need reviewed before lock.
```

```text
This joker will double the points you earn from this match.
```

```text
Predicted group-stage goals: 84
Calculated from your 36 group match predictions.
```

## Safety

- Group goals are auto-calculated only.
- Review must not include a manual group-goals input.
- Original and KO Predictor points remain separate.
- The stage does not require Migration 019.
- No Supabase write, Auth, RLS, result-entry, scoring engine or resolver behaviour changes are approved by this contract alone.
