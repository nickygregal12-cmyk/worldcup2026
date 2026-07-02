# Development workflow

## Safety

- Work only in `~/Desktop/euro28predictor` on `euro28-development`.
- Never alter WC26 `main` or its production Supabase project.
- Never run `npx supabase db reset --linked`.
- Never use `sudo` or `npm audit fix --force`.

## Definition of done

A batch is complete only when code and documentation agree, `npm run check` passes and the branch is pushed cleanly. Database batches additionally require local reset, pgTAP, linked-project verification, a one-migration dry run and hosted database lint. Frontend-only batches must prove that no migration changed and must not run a database push.

## Stage 13A frontend architecture

### Application shell

The active Euro entrypoint uses deterministic hash destinations so Netlify needs no new rewrite rules. Desktop navigation, mobile bottom navigation and the More dialog all use the same destination register. A central navigation lifecycle derives readiness from authoritative group-match status and resolved Round of 16 slots: KO appears in More after the first complete pairing, but Position 1 changes from Groups to KO only after all 36 group matches and all eight Round of 16 pairings are ready. Bracket remains permanent.

### Design-system boundary

New shared tokens and primitives live outside the inherited foundation stylesheet. Existing Stage 12 feature modules remain intact behind routed destinations while later Stage 13 batches progressively rebuild their presentation.

### Theme boundary

Light and dark appearance is stored only on the current device. A blocked storage API falls back safely to the system preference.

### Home data boundary

The dashboard composes existing trusted read services. Each section has its own availability state so a failed request cannot masquerade as zero points or zero predictions.

### Visual QA

Stage 13A establishes deterministic mobile, tablet, desktop and dark-mode screenshot baselines.

## Stage 12 architecture

### Role boundary

- `owner`: may apply the irreversible global lock, manage grace and change feature controls.
- `results_admin`: retains result entry, status and recalculation access, subject to the current feature controls.
- admin access itself remains service-managed.

### Kill-switch boundary

Controls are enforced by database triggers or trusted functions. Hiding or disabling a button is not treated as enforcement.

### Grace boundary

Grace is never global. It applies to one user, one competition and one unstarted match, expires before kick-off and remains permanently visible in the audit trail after expiry or revocation.

### Lock boundary

`prediction_locked_at` is monotonic. Stage 12 adds a protected owner RPC to set it but deliberately adds no unlock route.

### Operational review

The control room reports fixture completeness, result/scoring health, feature state, joker locks and the canonical knockout source slots. It does not mutate tournament allocation while displaying it.

### Audit boundary

Lock, grace and feature changes append to `admin_operation_events`. Existing result, status and scoring events remain in the same combined timeline.

## Deliberate exclusions

Stage 13A does not implement an external result provider, public admin assignment, a global prediction unlock, league-specific scoring or any new database rule. The remaining predictor, bracket, league, results and admin page rebuilds continue in Stages 13B–13E.
