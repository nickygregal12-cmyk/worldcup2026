# Agent-drift guards — four audits for the classes of drift AI-agent development creates

Date: 2026-07-05. Validated against the 2026-07-05 handover repo. All four scan every current
and future file automatically — nothing is named per-file except designated owners/exemptions.

## Context

These target the specific failure classes of a project built primarily by AI agents reviewed by
a non-developer: things that are individually small, invisible in a diff review, and compound
into exactly the WC26-style drift the Euro governance exists to prevent.

## 1. check-import-reachability.mjs — no orphaned modules

Walks the real import graph from src/main.jsx. Any active source file nothing imports fails.
Exempt roots (each with recorded reason): quarantined legacy, test fixtures, and src/contracts
(the executable-spec layer, consumed by tests/audits by design).

First-run findings (7, all genuine):
- Six barrel index.js files imported by NOTHING (not even tests): src/admin, src/auth,
  src/leagues, src/matchCentre, src/results, src/teamProfile. Delete or adopt as the public
  import convention — half-conventions drift.
- src/runtime/refreshPolicy.js: tested, referenced by TWO enforcement audits — and never
  imported by the running app. Recorded-equals-real gap: the audits prove the refresh policy
  EXISTS; nothing proves the app USES it. Decide: wire it into the runtime, or reclassify it
  as spec with a recorded reason.

## 2. check-dependency-hygiene.mjs — imports and package.json agree, both directions

Direction 1: every non-relative import in active src/ + scripts/ must be declared (transitive
resolution breaks on any lockfile refresh). Direction 2: every runtime dependency must be
imported somewhere. Quarantined legacy roots excluded from direction 1 by design.

First-run findings (7, all genuine WC26 inheritance): @tanstack/react-query, circle-flags,
date-fns, html2canvas, react-router-dom, web-push, xlsx — runtime dependencies used by nothing
in the live app (the Euro app hash-routes without react-router and has its own flag registry).
Remove at the legacy cleanup stage; until then they are installed weight and attack surface
with no owner.

## 3. check-debug-leftovers.mjs — locked at zero

console.log/debug/info/table/trace, debugger, alert(), and TODO/FIXME/HACK markers in active
source. Currently ZERO — the guard locks that state so leftover number one fails the build.
console.warn/error remain allowed for real error paths. Unfinished work belongs in the ledger,
not in comments.

## 4. check-client-singleton.mjs — one client, no pasted endpoints

createClient only in src/runtime/appClient.js (src/lib/supabase.js tolerated verbatim under the
never-touch rule); Supabase endpoint URLs only in the environment owner modules; any reference
to the blocked WC26 project ref fails anywhere, forever. This converts the most sacred manual
git rule into a mechanical one that covers files that do not exist yet. Currently ZERO findings.

## Wiring

All four are pure Node, safe for the fast check chain. Suggested npm names:
audit:import-reachability, audit:dependency-hygiene, audit:debug-leftovers,
audit:client-singleton. Wire 3 and 4 immediately (green now). Wire 1 and 2 in the same commit
that dispositions their findings (delete barrels / decide refreshPolicy; remove the seven
dependencies) — or wire immediately with ALLOWED_* entries carrying reasons, then burn down.

## Validation notes (honesty record)

Import-pattern regexes were tightened twice during validation: template-literal prose near the
word "from" false-positived until a module-specifier sanity filter was added, and
color-mix-style nested parens do not occur here but multiline greedy matches did. Final runs:
reachability 7/7 genuine, dependency 7/7 genuine, debug 0, singleton 0.
