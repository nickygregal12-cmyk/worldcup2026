# Archive Candidates

Archive means move with an index, not delete.

Proposed future archive path: `docs/archive/2026-07-agent-control-consolidation/`

Do not archive source documents referenced by active audits unless the audit is updated in the same approved stage. Do not archive visual contracts or design baselines as ordinary stale docs.

## Looks Superseded Or Duplicate

- `docs/NEXT-CHAT-PROMPT-*`
- older handoff/export prompts, if their facts are preserved in active ledgers
- superseded stage-order notes once `AGENT-CONTROL/09-STAGE-ORDER.md` and active ledgers preserve the current order
- duplicate stage audit summaries whose proof has been copied into the functional completion ledger

## Definitely Stay Active

- `AGENT-CONTROL/`
- `PROJECT-CONTROL.md`
- `docs/EURO28-PROJECT-CONSTITUTION.md`
- `docs/EURO28-DESIGN-CHARTER.md`
- `docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md`
- `docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md`
- `docs/EDGE-CASE-RULES-ADDENDUM.md`
- `docs/SIMULATION-SAFETY-GUIDELINES.md`
- `docs/OPERATIONS-RUNBOOK.md`
- `docs/TESTING.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT.md`
- `docs/DEVELOPMENT.md`
- `docs/THIRD-PARTY-ASSETS.md`
- `docs/reference-prototypes/`
- `docs/design-baselines/`

## Stay Reference-Only

- `docs/EURO28-AGENT-RULES-AND-ROADMAP.md`
- `docs/PRODUCT-COMPLETENESS-ROADMAP.md`
- `docs/STREAMLINED-BATCH-ORDER.md`
- `docs/AGENT-DRIFT-GUARDS.md`
- `docs/DESIGN-CONTRAST-GUARDS.md`
- `docs/design-workshop/locked-design-docs-v9/`
- `docs/STAGE-*`

## Needs Human Review Before Archiving

- Any `docs/STAGE-*` document referenced by an active audit, package script, roadmap or completion ledger.
- Any `docs/NEXT-CHAT-PROMPT-*` file that contains current task context not yet copied into `PROJECT-CONTROL.md` or `AGENT-CONTROL/`.
- Any design workshop file that may still be an approved visual contract.
- Any deployment, Supabase, Auth or public-signup note that may reflect external state not visible in git.

## Hygiene Debt To Record

- `.DS_Store`
- `coverage/`
- `supabase/.temp/`
- `supabase/.branches/`
- `node_modules/`
- `.env.local`
