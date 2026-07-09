# Document Authority Map — THE index and documentation constitution

## The documentation constitution

1. **This file is the single index.** Every living governance/reference document is
   listed below with one clear job. A document not listed here is either archived
   (`docs/archive/`), a reference artefact (`docs/reference-prototypes/`,
   `docs/design-baselines/`, `docs/design-workshop/` pack, `supabase/design/`), or it
   should not exist. `scripts/check-doc-structure.mjs` enforces this mechanically.
2. **Same-commit truth.** Any change that makes a living document stale must update it in
   the same commit (rule recorded here and in the Constitution; mechanically enforced by
   `check-governance-coherence.mjs` for migration counts, version headers and return
   points, anchored to `PROJECT-CONTROL.md`'s Latest verified commit).
3. **New documents need a job no existing document has.** A new stage's working spec goes
   straight to `docs/archive/` when the stage closes; session findings go to `reports/`
   as `REPORT-<topic>-<YYYY-MM-DD>.md` (gitignored working notes); durable rules extend an
   existing living document before a new one is created. Creating a living document means
   adding its row below in the same commit, or the structure audit fails.
4. **Archiving.** A superseded document moves to `docs/archive/` with a top ARCHIVED
   banner naming this index and the date. Archived docs are frozen: never edited to track
   later state, still valid as audit-marker evidence.
5. **Reports.** All session reports live in `reports/` with the dated naming rule above.
   `REPORT-P6C-EXECUTOR.md` predates the rule and is grandfathered.

If this map conflicts with repo/runtime/tests/audits/build/visual review/deployment/Supabase evidence, stop and record the conflict.

## Living documents

| Document/path | Current role | Authority level | Status | Why | Key rules or decisions extracted | Conflicts or uncertainty |
| --- | --- | --- | --- | --- | --- | --- |
| `AGENT-CONTROL/` | Durable first-read agent-control layer | Highest docs/process authority after repo/runtime proof and current user task | Keep active | Created to reduce repeated long prompts | Read first, stop on conflicts, keep scope narrow | New layer; validate against future repo facts |
| `PROJECT-CONTROL.md` | Live dashboard | High current-state summary | Keep active | Records current operational state without long history | Branch, stage, deployment URL, migration count, blockers, priorities | Must be updated as state changes |
| `docs/EURO28-PROJECT-CONSTITUTION.md` | Project constitution | Highest historical source document | Keep active | Declares owner, hierarchy, product invariants and safety boundaries | Nicky owns decisions; WC26 production blocked; Original/KO separate; one resolver; central scoring; privacy/admin gates; no `sudo`, no `npm audit fix --force`, no `git add .` | Older than this control layer but remains foundational |
| `docs/EURO28-AGENT-RULES-AND-ROADMAP.md` | Historical agent rules and roadmap ledger | High reference; not first-read | Reference only | Large accumulated roadmap and marker records | Public signup remains closed; Migration 019 blocked; visual contracts binding as references; Original/KO separation | Too large for first-read; may contain superseded stage order |
| `docs/EURO28-DESIGN-CHARTER.md` | Design constitution | High design authority | Keep active | Governs visual and interaction rules | Semantic tokens; shared design language; CSS Modules; Lucide icon source; no raw colour drift; predicted/live contexts distinct | Exact token values may evolve through approved updates |
| `docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md` | Completion ledger | High evidence reference | Keep active | Records accepted/completed functional areas and standing priorities | Completion requires proof; accepted stages remain evidence | Some rows may be historical rather than current priority |
| `docs/PRODUCT-COMPLETENESS-ROADMAP.md` | Product roadmap | Medium-high product reference | Reference only | Consolidates gaps and sequencing | Public signup gates; completion gaps; suggested sequencing | May be superseded by newer stage-order docs |
| `docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md` | Decision register and roadmap | High product-rule reference | Keep active | Records confirmed product decisions and scoring model | Product decisions, scoring model, navigation and roadmap decisions | Needs reconciliation if it conflicts with newer approved contracts |
| `docs/EDGE-CASE-RULES-ADDENDUM.md` | Edge-case product rules | High rule reference | Keep active | Captures unresolved/tournament edge cases | Tiebreaker prompts, best-third resolver, bracket invalidation, KO scoring examples | Verify runtime implementation before claiming complete |
| `docs/SIMULATION-SAFETY-GUIDELINES.md` | Simulation safety rules | High safety authority | Keep active | Prevents fake data affecting real users | Fake results never become official; normal scoring ignores simulation; WC26 production fail-closed | Schema/runtime state must be verified before relying on implementation |
| `docs/OPERATIONS-RUNBOOK.md` | Human operations runbook | Medium-high operations authority | Keep active | Written for Nicky for deploys, backups and incidents | Backup, rollback, secrets, visual eyes-on acceptance, privacy basics | Some operational steps may depend on external services |
| `docs/TESTING.md` | Test guidance | Medium-high verification authority | Keep active | Lists gates, focused audits and database tests | Full code gate, focused audits, database tests, package-lock checks | Current `npm run check` chain may be too broad for every stage |
| `docs/DATABASE.md` | Database development reference | High database reference | Keep active | Lists active migrations and DB model | 21 active migrations (list kept current same-commit); Original/KO DB separation; admin control-room model | Must verify live DB/schema before hosted changes |
| `docs/DEPLOYMENT.md` | Deployment reference | High deployment reference | Keep active | Records Euro staging deploy and Supabase guardrails | Deployment URL; WC26 production blocked; backup before migration; Auth redirects | External Netlify/Supabase state can drift |
| `docs/DEVELOPMENT.md` | Development workflow reference | Medium-high engineering reference | Keep active | Captures repo safety and architecture notes | No WC26 main/prod; no `sudo`; no `npm audit fix --force`; architecture separations | May contain stage-specific historical details |
| `docs/THIRD-PARTY-ASSETS.md` | Asset provenance reference | Medium asset authority | Keep active | Records visual asset sources and constraints | Circle Flags and UEFA identity cautions | Verify licenses and asset availability before new use |
| `docs/AGENT-DRIFT-GUARDS.md` | Audit rationale | Medium audit reference | Reference only | Explains drift-prevention scripts | Import reachability, dependency hygiene, debug leftovers, client singleton | Script wiring must be verified in `package.json` before relying on it |
| `docs/DESIGN-CONTRAST-GUARDS.md` | Contrast audit rationale | Medium design-audit reference | Reference only | Explains contrast failures and guard intent | No surface tokens as foreground colour; runtime contrast guard proposed | Playwright route contrast guard is not proved installed/wired |
| `docs/design-workshop/locked-design-docs-v9/` | Locked visual/design source set | High design reference | Keep active | Contains approved locked design docs | Approved design direction and visual contracts | Do not treat as production implementation |
| `docs/reference-prototypes/` | Binding visual contracts | High visual reference | Keep active | Approved prototypes guide layout/composition/state coverage | Binding visual contracts; do not port HTML/CSS directly into `src/`; a `-vN` file supersedes its unsuffixed predecessor, and any `-vN-superseded` file is historical provenance only and never binding | Prototype code/data are reference artefacts only. Home, Groups, KO Predictor and Bracket are now governed by their `-v2` files; the three reference-adoption audit scripts were repointed at the v2 paths in commit `0889c72` and pass |
| `docs/design-baselines/` | Visual baseline evidence | High visual evidence | Keep active | Stores visual baseline captures and references | Baselines support review and regression checks | Do not archive as ordinary stale docs |
| `visual-tests/` + `visual-baselines/` | Visual testing tier (Playwright) | High verification authority for pixels | Keep active | The check chain never renders; this tier screenshots the built app deterministically | `check:visual` is the hard pixel gate once baselines are blessed; `visual:diff` is advisory conformance for owner review; blessing requires a recorded note (BLESS-LOG.md); `audit:visual-freshness` bridges it into the main chain | Baselines deliberately empty until prototypes are re-approved; see visual-baselines/README.md and docs/TESTING.md |
| `docs/archive/` | Frozen historical evidence (stage specs, prompts, closed briefs) | Historical evidence only | Archived | 131 closed docs moved 2026-07-10 with banners | Never edited to track later state; audits may assert markers within | Additions require the ARCHIVED banner (enforced by check-doc-structure) |
| `docs/*-CONTRACT.md` + `docs/CONTEXTUAL-RETURN-RULE.md` + `docs/RULES-SCORING-LOCKED-CONTRACT.md` + `docs/UNRESOLVED-GROUP-TIEBREAKER-PROMPT.md` | Binding product-gate contracts still in force (signup gates, trust contracts, return rule, tie-break holdout) | High rule reference | Keep active | Each is audit-asserted and still governs an open gate | Public signup closed until its contracts pass; contextual return; locked scoring wording | Archive each once its gate permanently closes |
| `docs/APPROVED-VISUAL-CONTRACT-INVENTORY.md` + `docs/REFERENCE-FILE-INSTALL-MAP.md` | Visual-contract inventory and prototype install record | High visual reference | Keep active | Names the binding prototype set | v2 files supersede v1; inventory countable | Update alongside prototype supersessions |
| `docs/EURO28-SITE-ACCESS-MAP.md` | Route/access truth map | High access reference | Keep active | Records who reaches which route | Guest-first access; admin invisibility | Verify against appRoutes on route changes |
| `docs/DATABASE-BACKUP-AND-RESTORE.md` + `docs/STAGING-ADMIN-ACCESS.md` + `docs/ADMIN-SCENARIO-RUNNER-BRIEF.md` + `docs/CANDIDATE-TEAM-POOL-BRIEF.md` | Operational procedures (backup/restore, staging admin, scenario tooling, team-pool data scripts) | Medium-high operations reference | Keep active | Procedures still executed by owner/agents | Backup before writes; SQL-editor route; idempotent data scripts | Keep aligned with scripts they describe |
| `visual-tests/` + `visual-baselines/` | Visual testing tier (Playwright) | High verification authority for pixels | Keep active | The check chain never renders; this tier screenshots the built app deterministically | check:visual gate; advisory conformance report; blessing requires a note; audit:visual-freshness bridges into main chain | Baselines empty until prototypes re-approved |
| `reports/` | Session reports, `REPORT-<topic>-<date>.md` | Working notes, no authority | Gitignored | Per-session findings | Naming rule enforced by check-doc-structure | REPORT-P6C-EXECUTOR.md grandfathered |
