# Development workflow

## Safety

- Work only in `~/Desktop/euro28predictor` on `euro28-development`.
- Never alter WC26 `main` or its production Supabase project.
- Never run `npx supabase db reset --linked`.
- Never use `sudo` or `npm audit fix --force`.

## Definition of done

A batch is complete only when code and documentation agree, `npm run check` passes, local reset and pgTAP pass, the linked project is verified, only the intended migration appears in the dry run, hosted tests/lint pass, and the branch is pushed cleanly.

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

Stage 12 does not implement an external result provider, public admin assignment, a global prediction unlock, league-specific scoring or the final design-system rebuild.
