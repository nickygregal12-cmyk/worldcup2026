# Development workflow

## Safety

- Work only in `~/Desktop/euro28predictor` on `euro28-development`.
- Never alter WC26 `main` or its production Supabase project.
- Never run `npx supabase db reset --linked`.
- Never use `sudo` or `npm audit fix --force`.

## Definition of done

A batch is complete only when code and documentation agree, `npm run check` passes, local reset and pgTAP pass, the linked project is verified, only the intended migration appears in the dry run, hosted tests/lint pass, and the branch is pushed cleanly.

## Stage 8 architecture

### Original predictor

`src/journey/` edits 36 group scores and a winner-only pre-tournament bracket. Five jokers are available only on group matches. No bracket score, decision method or joker is stored.

### KO Predictor

`src/koPredictor/` is a separate competition using resolved real knockout fixtures. It predicts 90-minute score, advancing team and method, with five separate jokers. Its revision, future scoring, leaderboard and winner are independent of the original predictor.

### Grace

`src/grace/` reads competition-scoped exceptions. Server grant/revoke operations remain service-role only. A grant can affect only one competition, one user and one unstarted match.

### Canonical progression

`src/resolver/` remains the only group, best-third and bracket progression engine. The original predicted bracket and live bracket are never blended. The KO Predictor consumes real resolved fixtures rather than the user's original bracket.

## Deliberate exclusions

Stage 8 does not implement points calculation, scoring runs, leaderboards, live results, admin result entry or the full admin control room.
