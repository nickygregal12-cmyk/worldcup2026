# CLAUDE.md — Euro 2028 Predictor

Read this before doing anything. It is the standing law for every agent session in this
repo. Where it conflicts with your assumptions, this file wins. Where it conflicts with
the governing docs listed below, the docs win — tell Nicky about the conflict instead of
resolving it silently.

## 0. First acts of every session (non-negotiable)

1. `git pull` before starting work. `git status --short` and `git log --oneline -5` —
   confirm the tree matches what your task brief assumes. If the brief's premises don't
   hold against the tree (files missing, counts wrong, commits absent), STOP and report
   the discrepancy before working. Sessions have repeatedly acted on stale trees; verify,
   don't trust.
2. One session per working tree. If evidence appears that another session is writing to
   this tree (files changing that you didn't change), stop and report.
3. Push after your work is committed, in the same session, unless told otherwise.
4. Never `git add .` — stage files explicitly by name.

## 1. Authority hierarchy

- `docs/EURO28-PROJECT-CONSTITUTION.md` — process law (discrepancies reported not
  resolved; decisions changed only by explicit owner amendment; check suite is a
  ratchet, never loosened to pass — §5.8 exceptions require an explicit owner decision
  recorded in the code and the commit).
- The Consolidated Decision Register — product decisions (append-only).
- `docs/reference-prototypes/euro28-product-experience-v3.md` — the binding Product
  Experience v3 visual/behaviour contract. The non-visual architecture rules in
  `docs/EURO28-DESIGN-CHARTER.md` remain live.
- The other approved prototypes in `docs/reference-prototypes/` remain binding content/
  interaction contracts where Product Experience v3 does not amend them.
- `docs/RULES-SCORING-LOCKED-CONTRACT.md` — the ONLY scoring authority. See §4.
- `docs/design programme/` is superseded visual provenance. It no longer governs new
  implementation; owner rulings extracted from it remain binding only where preserved in
  the Decision Register or Product Experience v3.

## 2. Git and cross-session truths

- `reports/` is **gitignored**. Reports are working notes that never travel between
  machines. The only reliable cross-session channel is the Copy-Back Report returned to
  Nicky at the end of a session. Never assume another session's report is visible to you.
- The repo folder is named `worldcup2026` but contains the **Euro 2028** project. The
  WC26 production Supabase (`ouhxawizadnwrhrjppld`) is permanently off-limits. Euro
  staging is `gcfdwobpnanjchcnvdco`; staging writes require a fresh verified backup
  first, every time.
- Never modify scoring/resolver/Auth SQL logic in staging sessions.
- Some work may exist only on the owner's Mac (pending sync). If premises reference
  work you can't find (Playwright visual tier, docs/archive/ consolidation, Migration
  021's file), it is likely Mac-stranded — report, don't recreate.

## 3. Sessions and scope

- Do exactly the scoped task. Log side-findings as notes in your Copy-Back Report;
  do not fix them opportunistically.
- Every session ends with a Copy-Back Report, including an **advisory findings**
  section: anything logically inconsistent, confusing, or improvable — reported for
  owner decision, never acted on unilaterally.
- If a task will produce or change anything user-visible, note which pages changed so
  they join the owner's visual review queue.
- Prefer surgical fixes over rewrites. Pushback on weak instructions is welcome;
  silent reinterpretation is not.

## 4. Scoring law (owner ruling 2026-07-10 — supersedes all older values)

Per `docs/RULES-SCORING-LOCKED-CONTRACT.md`:
- Group matches: **5** exact score / **3** correct result.
- Group positions: **2** per correct position, **+5** bonus for a perfect group.
- Top Scorer: **30** (entered on Review; player pool pending Stage 17A).
- Group-goals total: tiered **25 / 15 / 5** (exact / within 5 / within 10),
  **auto-calculated** from the user's 36 group predictions — never player-entered.
- **Highest-Scoring Team does not exist.** Do not reference it as a feature.
- The superseded 30/10 match values and flat-20 tournament picks are dead. Never write,
  assert, or pin them anywhere, including audits and prototypes.
- Jokers: a joker doubles THAT MATCH'S score points only (group matches and KO
  Predictor matches; never position points, never bonuses, never anything on the
  Original Bracket — bracket jokers do not exist). Caps: 5 group / 0 bracket / 5 KO.
- KO Predictor match scoring (LOCKED, owner-ruled 2026-07-10): three additive +5
  components per match — correct ADVANCER (your team goes through, any method incl.
  ET/pens) + correct DRAW CALL (you predicted 90 mins level and it was) + EXACT
  90-minute score. Max 10 on a regulation game, 15 on an ET game; a joker doubles the
  match total. Examples: actual 1-1 with Scotland through in ET → picked 1-1 Scotland
  = 15; 1-1 Germany = 10; 2-2 Scotland = 10; 2-1 Scotland = 5 (advancer only); 2-1
  Germany = 0. This SUPERSEDES the earlier "draw-plus-advancer bonus, value TBD"
  amendment — the bonus IS the draw component.
- KO scoring: cumulative team progression — R16=8, QF=12, SF=15, Final=20, Champion
  +25 on top (a champion's Final+win line totals 45; a losing finalist keeps 20).
  There is NO Round-of-32 rung — Euro 2028 is 24 teams, first KO round is the R16.
  (Ladder owner-confirmed 2026-07-10.) — KO Predictor and Original Bracket never share cards, jokers, meters,
  or totals.

## 5. Design rulings in force (2026-07-10)

- **Gold is joker-exclusive** (`#A6790A` family). The broadcast/chrome accent is the
  **sky family** (`#5FC7F5`/`#38BDF8`). No gold in mastheads, tabs, marks, or borders.
- Spacing: the 4px scale (4, 8, 12, 16, 20, 24, 32, 48, 64) is law; owner density
  preference is **compact** — between two steps, take the smaller.
- Team badges: **circular ISO-keyed**; unresolved slots use the neutral dashed
  placeholder chip. Never square colour-blocked tags.
- Dark theme is required as a first-class theme; contrast ≥4.5:1 in both themes.
- Fail-loud provisional indicators (the "Provisional — kick-off time not confirmed"
  label, Rules-hub provenance sentence, amber PROVISIONAL chip) are FEATURES. Never
  remove them; they appear only when the database genuinely lacks confirmed data.
- Mobile bottom nav auto-hide is approved: it hides after ~40–60px sustained downward
  scroll, reveals instantly on any upward scroll and stays visible while a text input is
  focused. All five items share one alignment. Home's larger circle may overlap the bar
  edge slightly, but the Home item, icon, label and tap target are not raised.
- Theme choice follows the device preference on first visit. A manual light/dark choice is
  saved and overrides the device preference on later visits.
- Home carries a quiet KO Predictor teaser before readiness. Confirmed fixtures may open
  early; KO becomes prominent only after the group stage officially ends.
- Leagues remain single-competition entities. Original/KO collection tabs, once available,
  switch between separate league lists and never change a league's competition.
- Score entry: steppers (▲/▼ per side) AND direct numeric entry, 48px targets.
- `SelectField` is a **custom-rendered listbox** as of Stage DP-PRIMITIVES (2026-07-11):
  button trigger + popover option list, no native `<select>` underneath, so the OS wheel
  picker is gone from every surface that uses it. The native-control ratchet now permits
  **zero** native `<select>` anywhere — `PRIMITIVE_SOURCES` is empty. (This supersedes the
  earlier ruling that SelectField still rendered a native `<select>`; that is no longer true.)

### Component conventions ratified 2026-07-11 (owner ruling)

These three fill gaps the design programme did not specify. They are binding house
conventions — the programme itself remains PROPOSED, but these are recorded owner rulings.

- **Popover listbox** (SelectField): a popover, NOT a modal. Standard ARIA
  listbox/combobox semantics; arrows + Home/End move, Enter/Space commit, Escape and Tab
  dismiss, type-ahead jumps; click-outside dismisses; focus returns to the trigger on
  close. No hard focus trap — the modal §12 trap convention does not apply to popovers.
- **Inline confirm** (high-score confirm): a designed in-row confirm in the system's own
  language — warning-soft fill, warning-ink text, 48px actions. Never `window.confirm`;
  the native-controls ratchet polices dialogs.
- **Tiebreak ▲/▼ idiom**: manual ordering controls reuse the vertical stepper idiom, with
  the amber provisional role for the warning state.

## 6. Ground-truth tournament facts

- Match 1: **Wales v Germany, Fri 9 June 2028, 8:00pm (19:00 UTC), National Stadium of
  Wales.** Prediction lock = first kickoff = `2028-06-09T19:00:00Z` exactly.
- 51 matches (36 group + 15 KO); 24 teams; joker caps 5 group / 0 bracket / 5 KO.
- Staging holds the reconciled truth: 24 teams in corrected slots (A1 wales, B1 england,
  C1 netherlands, D1 northern-ireland, E1 republic-of-ireland, F1 scotland), 51/51
  kickoffs, 9/9 venue host nations, Scotland the sole profiled team.

## 7. Copy and content rules

- Player-facing copy only on player surfaces — no internal/spec wording, no "Gameweek".
- No emoji anywhere, including emoji flags.
- Displayed point values render from central versioned config, never hardcoded prose.
- Neutral placeholder names in prototypes and fixtures — nothing resembling real people.
