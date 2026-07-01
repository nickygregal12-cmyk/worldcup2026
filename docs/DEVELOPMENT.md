# Development workflow

## Safety

- Work only in `~/Desktop/euro28predictor` on `euro28-development`.
- Never alter WC26 `main` or its production Supabase project.
- Never run `npx supabase db reset --linked`.
- Never use `sudo` or `npm audit fix --force`.

## Definition of done

A batch is complete only when code and documentation agree, `npm run check` passes, local reset and pgTAP pass, the linked project is verified, only the intended migration appears in the dry run, hosted tests/lint pass, and the branch is pushed cleanly.

## Stage 10 architecture

### Service-managed admin access

`private.tournament_admins` is not browser-readable or writable. Only service-role or trusted SQL may grant or revoke access.

### Safe result operations

Browser controls use authenticated security-definer RPCs. Result writes include an expected revision, require a note and fail rather than overwrite a newer correction.

### Append-only audit

`admin_operation_events` records grants, revocations, result writes, status changes and manual recalculation. Rows cannot be updated or deleted.

### Status and recalculation

Status-only changes preserve the result revision. Explicit recalculation is limited to confirmed results and uses the Stage 9 replacement-scoring function.

### Canonical separation

Original predictor totals and KO Predictor totals remain separate. Guest, predicted and live resolver contexts remain separate.

## Deliberate exclusions

Stage 10 does not implement private leagues, shared member prediction viewing, automated result polling or an external result provider.
