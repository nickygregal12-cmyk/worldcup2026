# Development workflow

## Safety

- Work only in `~/Desktop/euro28predictor` on `euro28-development`.
- Never alter WC26 `main` or its production Supabase project.
- Never run `npx supabase db reset --linked`.
- Never use `sudo` or `npm audit fix --force`.

## Definition of done

A batch is complete only when code and documentation agree, `npm run check` passes, local reset and pgTAP pass, the linked project is verified, only the intended migration appears in the dry run, hosted tests/lint pass, and the branch is pushed cleanly.

## Stage 11 architecture

### Shared membership, separate competitions

A league is not duplicated for the KO Predictor. One membership list is used, while each standings RPC requires an explicit competition key. No query adds Original Predictor and KO Predictor points together.

### Controlled writes

League creation, joining, leaving and deletion use security-definer RPCs. RLS remains enabled and browser roles receive no direct league-table writes.

### Controlled reads

Private standings require current membership. The overall people/points table uses a separate post-lock RPC, while league viewing additionally verifies that both caller and target belong to the same league.

### Lock-aware privacy

Original predictions are hidden until the global tournament prediction lock. KO Predictor rows are revealed fixture by fixture only after canonical match start.

### Head to head

The client compares two controlled, read-only bundles. It does not create a merged prediction record or change scoring.

## Deliberate exclusions

Stage 11 does not implement league-specific scoring, public league directories, result-provider polling, lock/grace allocation controls or the full final design-system rebuild.
