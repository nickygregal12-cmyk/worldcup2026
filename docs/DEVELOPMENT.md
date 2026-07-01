# Development workflow

## Safety

- Work only in `~/Desktop/euro28predictor` on `euro28-development`.
- Never alter WC26 `main` or its production Supabase project.
- Never run `npx supabase db reset --linked`.
- Never use `sudo` or `npm audit fix --force`.

## Definition of done

A batch is complete only when code and documentation agree, `npm run check` passes, local reset and pgTAP pass, the linked project is verified, only the intended migration appears in the dry run, hosted tests/lint pass, and the branch is pushed cleanly.

## Stage 9 architecture

### Canonical results

`public.matches` is the current result record. `match_result_events` is the append-only revision history. Only a completed and confirmed result can score.

### Idempotent scoring

`private.euro28_recalculate_points()` deletes and rebuilds affected point rows. A correction cannot add a second award on top of the first.

### Original predictor

Group scores and original bracket milestones feed only the original total and original leaderboard.

### KO Predictor

Real knockout scores, advancing teams, methods and KO jokers feed only the KO Predictor total and KO leaderboard.

### Live context

`src/results/` converts canonical result rows into `live` resolver records. Guest, predicted and live records cannot be mixed.

## Deliberate exclusions

Stage 9 does not implement browser result-entry controls, private leagues, member prediction comparison, the full admin control room or an external result provider.
