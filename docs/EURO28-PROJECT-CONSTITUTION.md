# EURO 2028 PREDICTOR — PROJECT CONSTITUTION
## The permanent context document

> **What this is:** the one document that is always true. It contains only
> facts and rules that do not change as the build progresses. It is never
> superseded, never versioned against the build, and safe to paste into any
> new chat at any point in the project's life.
>
> **What this is not:** a source of current state. It deliberately contains
> NO commits, migration counts, stage progress, feature lists, palette
> values, layout decisions, or anything else that changes. Treating this
> document as evidence of current state is itself a violation of it.

---

## 1. The project

- **Product:** Euro 2028 Predictor — a football prediction game for the
  UEFA Euro 2028 tournament (hosted by the UK and Ireland, June–July 2028).
- **Owner:** Nicky. Sole product owner and sole decision-maker. Based in
  Scotland. All work is delivered for Nicky to run on Nicky's own machine.
- **Players:** a private social group of roughly 65 people, mostly Scottish.
  This is a passion project for real friends, not a commercial product.
- **Heritage:** successor to the WC26 Predictor (World Cup 2026), which ran
  successfully but suffered from untested, duplicated, page-by-page code
  that had to be firefought during the live tournament. The Euro build is a
  from-scratch rebuild whose entire purpose is to never repeat that.
- **The mission, in one line:** every component fully functional, nothing
  half-wired, no issue discovered for the first time during the live
  tournament.

## 2. Authority hierarchy — where truth lives

This document defines the hierarchy; it does not compete in it. Current
truth ALWAYS lives in the repository's living documents:

1. **Consolidated Decision Register and approved addenda** — product rules and decisions.
2. **Design Charter** — visual and interaction rules.
3. **Functional Completion Ledger** — the true state of every feature:
   what is functional, partial, missing, or rejected. A stage is only
   complete when its ledger rows say so.
4. **Agent Rules and Roadmap** — working process and stage sequencing.
5. **Continuation handover** (freshly generated) — the current checkpoint:
   commit, migration count, and next task.
6. **Stage documents** — historical records only. Never current authority.

Rules of the hierarchy:
- A confirmed decision in these documents is changed only by an explicit
  decision from Nicky, recorded as an amendment. Silent changes, silent
  removals, and decisions that "lapse" are process failures regardless of
  technical merit.
- "Recorded complete" must equal "actually complete." Claims are verified
  against the product, not against other documents.
- If any document contradicts this constitution, stop and ask Nicky.

## 3. Permanent environment boundaries

- Repository: `github.com/nickygregal12-cmyk/worldcup2026`.
- All Euro work happens on the branch `euro28-development`, in the local
  folder `~/Desktop/euro28predictor`.
- The branch `main` belongs to the WC26 Predictor. It is NEVER committed
  to, merged into, or targeted by any instruction from this workstream,
  under any circumstances, forever.
- The WC26 Supabase project `ouhxawizadnwrhrjppld` is PERMANENTLY BLOCKED.
  It must never appear in Euro code, configuration, migrations, scripts,
  or terminal commands. Its appearance anywhere in a diff is a stop-
  everything event.
- Only the hosted Supabase project explicitly permitted by the current
  handover may be touched. Approved disposable local Supabase environments
  may be used where the roadmap explicitly permits them. No other hosted
  project may be accessed. Database references are never taken from memory
  or from this document.

## 4. Immutable product invariants

These are architectural commitments. No stage, redesign, or good idea may
break them. Exact values (caps, points, triggers) live in the register —
only the principles are recorded here, because the principles never change:

1. **Two competitions, never combined.** The Original Predictor (group
   predictions plus a pre-tournament winner-only bracket) and the KO
   Predictor (the real knockout fixtures) have separate predictions,
   points, jokers, leaderboards, and winners. No combined total exists
   anywhere, ever.
2. **One canonical resolver.** Guest, predicted, and live brackets all
   resolve through a single engine. There is exactly one best-third
   allocation matrix, and every one of its combinations is unit-tested.
3. **Predicted and live are never blended** — not in data, not in
   presentation. A user always knows which world they are looking at.
4. **Slot-reference architecture.** Teams are data, never hardcoded to
   bracket positions or components. Replacing placeholder teams with real
   ones is a data update requiring zero code changes.
5. **The server is the enforcer.** Locks, jokers, privacy, and admin
   rights are enforced by the database (RLS and controlled RPCs), never
   only by the UI. Browser code performs no direct writes to protected
   tables. Anything hidden in the UI must also be denied at the data
   boundary.
6. **Scoring lives in one place**, centrally configured and versioned.
   Scoring logic is never duplicated into components. Scoring values are
   never changed silently.
7. **Manual results are authoritative.** Any external data source is
   advisory, validated at the boundary, and can never silently overwrite
   an admin's correction. Result corrections are revision-safe and
   append-only audited.
8. **Privacy gates are absolute.** Predictions are private until the
   rules in the register expose them (broadly: nothing shared before the
   relevant lock/start). Aggregate statistics obey the same gates at
   every layer, because aggregates leak.
9. **Guest mode is browser-only and unscored.** Guests never earn points;
   scoring requires an account.
10. **Admin is invisible and service-granted.** Non-admin users see no
    evidence that admin surfaces exist. Admin rights are granted only
    through documented service-side procedures — never from the browser,
    never silently — and every admin action is audit-logged.

## 5. Permanent construction principles — HOW the product is built

These govern construction regardless of what the design currently is.
Exact values (file-size numbers, spacing scales, palette) live in the
charter; the principles below never change:

1. **One design language, everywhere, enforced by structure.** Every
   screen — including admin, errors, dialogs, and empty states — is
   composed from the same shared primitives. A concept has ONE component:
   one match card, one team label, one score input, one leaderboard row,
   used identically wherever the concept appears. No page ever builds its
   own version of something that exists. If two screens need the same
   element, it becomes a shared primitive first. Uniformity is not a
   review step; it is the only thing the structure permits.
2. **Shared pieces first, screens second.** Primitives are built and
   tested before the screens that use them. Screens are thin composition
   layers: they arrange primitives, wire hooks, and hold layout — no
   business logic, no scoring maths, no date arithmetic. Logic lives in
   pure, tested model modules.
3. **Primitives are dumb; features are smart.** Shared components take
   props and emit events. They never fetch data, never import the
   database client, never know about jokers, locks, or phases. The
   feature decides; the primitive renders.
4. **Small files, one job, enforced limits.** Monolithic files are
   forbidden. Hard size limits exist for components and stylesheets;
   their exact values live in the charter and are ENFORCED by an audit
   that fails the build. A file over its limit is split, not excused.
   Any frozen legacy allowance only ever ratchets downward.
5. **All styling flows through semantic tokens.** Raw colour values,
   ad-hoc fonts, and arbitrary spacing exist nowhere outside the token
   files, enforced by audit. Changing the entire look of the product
   must never require touching a component.
6. **Dependencies flow one way.** Shared primitives import nothing from
   features or the shell; features import primitives; the shell composes
   features. Never the reverse, never sideways between features.
7. **One source of truth for every fact.** Tournament facts, dates,
   phases, scoring values, and configuration are defined once, centrally,
   and consumed everywhere. No component-level dates, no duplicated
   constants, no value that must be updated in two places. Behaviour
   that depends on tournament phase reads central phase state — never a
   hardcoded calendar.
8. **Every rule that matters gets an enforcing check.** A rule that
   exists only in a document will eventually be violated silently; a rule
   wired into the check suite fails loudly instead. When a new invariant
   is agreed, the same batch adds the audit or test that guards it. The
   check suite only ever gets stricter — it is a ratchet, never loosened
   to make a batch pass.
9. **Complete states are part of "built".** A screen is not finished
   until it handles loading, empty, error, and partial-failure, in both
   themes, with visible state for everything that has state. A component
   missing a state is an incomplete component, not a polish item.
10. **Accessible by construction, not by audit.** Semantic elements,
    labelled inputs, visible keyboard focus, adequate touch targets, and
    reduced-motion support are built in as components are written —
    retrofitting accessibility is a failure pattern.
11. **External data is validated at the boundary.** Nothing from outside
    the application — API responses, function payloads, third-party data
    — crosses into the system unvalidated. Malformed data fails loudly at
    the door; it never propagates.
12. **Dev tooling is gated and registered.** Test fixtures, time
    controls, and debug surfaces are explicitly gated out of production
    reach, registered in the ledger as capabilities, and built to the
    same quality bar as the product. Nothing dev-era is reachable by a
    real user, and nothing built is left unrecorded.
13. **Working beats beautiful; finished beats started.** A functional
    feature in plain clothes outranks a polished fragment. Polish never
    precedes function, and no new work begins while the current batch's
    scope is half-wired.
14. **Slick and frictionless is the product sensibility.** The reference
    points are Apple over Samsung, Netflix over Disney+: restraint over
    abundance, opinionated defaults over settings, and the shortest
    possible path between opening the app and the thing the player came
    for. In practice: the app opens into what matters now, never a menu;
    it remembers where the player was; machinery (refreshing, syncing,
    drafts, versions) is never the player's job to see or operate; when
    a screen feels busy, remove before rearranging; a feature is not
    done while its seams show. Where two designs are otherwise equal,
    choose the one with fewer elements and fewer taps.

15. **Access is part of functionality.** Every major capability has one
    intentional primary entry and useful contextual entries. A feature is
    not complete if it can only be found by scrolling through an unrelated
    page, guessing a route, or knowing that hidden code exists. Mobile and
    desktop access are designed together and recorded in the site access map.


## 6. Permanent process rules

**Absolute prohibitions:**
- Never `sudo`. Never `npm audit fix --force`. Never `git add .` — files
  are staged explicitly by name.
- Never `npx supabase db reset --linked`. Local resets only.
- Never ask for, print, or embed secrets (passwords, tokens, service-role
  keys, DSNs). Secrets live in local env files and host environment
  variables only. An exposed secret is rotated, not apologised for.
- Never invent tournament data. Sample data exists only where explicitly
  defined as provisional and is visibly labelled in the UI.

**Verification discipline:**
- No check, test, build, or migration is EVER claimed to have passed
  without the output from Nicky's terminal in the conversation.
  Agent-side testing is supporting evidence only. Predicted output is
  labelled "Expected:", never presented as results.
- The full check suite must pass before any commit.
- Database changes: one new sequential migration per batch; a migration
  applied to a hosted database is never edited — corrections are new
  migrations; a fresh backup precedes every hosted migration.
- Every package ships with an exact versioned filename, a complete file
  manifest, per-file and whole-ZIP checksums, and guarded install
  commands that stop before touching anything if preconditions fail.
  Installed and staged files are diffed against the manifest. Superseded
  packages are deleted immediately; wildcards never select packages.

**Scope discipline:**
- New ideas enter the roadmap/ledger backlog, never the current batch.
- No feature ships half-wired. If a batch cannot complete a feature, the
  batch is split — a smaller finished thing beats a larger broken one.
- No promise appears in UI copy unless the feature behind it works.
- Every batch ends by stating: current checkpoint, migration count, which
  ledger rows moved (with evidence), and the next single task.

## 7. The working relationship

- Nicky is the product owner, not a passenger. Explain plainly what a
  change does and why before giving commands. Surface decisions; never
  bury them in a package.
- Challenge weak ideas with reasons — Nicky explicitly wants pushback,
  not transcription. Equally, deliver the agreed scope without
  gold-plating.
- State uncertainty honestly. "I don't know — verify before relying on
  it" is a required answer, not a weak one.
- British English throughout — code, docs, and UI copy.
- Terminal instructions are complete, numbered, copy-and-paste blocks,
  given one step at a time during installations, never wrapped in
  formats that make copying unreliable.

## 8. Cold-start protocol for any new chat

1. Ask for (or locate in uploads): the current repository ZIP, the
   current continuation handover, and the living documents (register,
   charter, ledger).
2. Inspect the repository. Verify the handover's checkpoint against it:
   branch, commit, migration count, project reference, clean tree.
3. Read the ledger before proposing anything — it is the map of what is
   actually done versus claimed.
4. If the handover is missing or stale, the first task is to help Nicky
   generate a fresh one from the repository — never to guess state.
5. Any discrepancy between documents, or between documents and code, is
   reported to Nicky before any work — not resolved silently.
6. No code, package, or migration is generated until the current state
   is verified and the next task is explicitly agreed.

## 9. Failure patterns this project exists to prevent

Learned from WC26 (live-tournament failures):
- logic duplicated across files, then fixed in some copies but not others;
- rules enforced only in the UI while the database allowed violations;
- no tests, so every fix silently risked new breakage;
- issues discovered first by players, mid-tournament, at night.

Learned during the Euro build itself (process failures):
- confirmed rules quietly disappearing from documents without a decision;
- stages recorded complete while parts of their scope were missing;
- features built to 80% and never wired to the UI, or promised in UI copy
  without existing;
- capabilities built but never registered, then re-planned as if new;
- dead code retained until it confused every search and every agent.

Every rule in this constitution traces back to one of these. When in
doubt, act against the pattern, not the shortcut.

---

*This document is stored in the repository as `docs/EURO28-PROJECT-CONSTITUTION.md`,
referenced by every handover, and included in every new-chat upload pack.
It is amended only by Nicky, and amendments may only add or clarify
permanent truths — anything that can change with the build belongs in the
living documents, not here.*
