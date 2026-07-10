// Native OS form controls are a recurring bug class. This is the policy.
//
// The symptom the owner reports: dropdowns that open as the iPhone wheel
// picker instead of a designed control. The cause is any native <select> in
// the tree. NOTE — and this matters for every page redesign: the shared
// SelectField primitive ALSO renders a native <select> (design-system/
// index.jsx). Its .ui-select-field class has no stylesheet rule anywhere, and
// nothing sets appearance:none. Migrating a raw <select> to SelectField makes
// the code consistent; it does NOT remove the OS picker. Removing the OS
// picker needs a designed control that is not a native <select> underneath —
// a listbox primitive, or no dropdown at all. Authority for "not a native
// select": the approved League visual contract
// (docs/reference-prototypes/euro28-league-page-prototype.html) contains no
// <select> element at all, and Design Charter §9 requires shared components
// to own their states. A future replacement control is unspecified; the
// design programme proposes a horizontal pill row here, but that is
// (design programme — proposed, not yet adopted) and governs nothing.
//
// Detected classes, all of them the same failure — a control the design
// system does not own:
//   select      raw <select> in JSX
//   select-dom  document.createElement('select')
//   date-time   <input type="date|time|datetime-local|month|week">
//   checkbox    <input type="checkbox">
//   radio       <input type="radio">
//   dialog      confirm() / alert() / prompt()

// Files permitted to contain a native control because they DEFINE the shared
// primitive that wraps it. Exactly one file may hold the sanctioned <select>.
export const PRIMITIVE_SOURCES = Object.freeze({
  'src/design-system/index.jsx': Object.freeze({ select: 1 }),
})

// Known debt, recorded exactly as found by the 2026-07-10 sweep.
//
// PROVENANCE — this list was not slipped in under a green tick. Before it
// existed, check-stage13g-interaction-enforcement.mjs FAILED on
// src/leagues/LeaguePresentation.jsx ("Native select elements outside
// SelectField"). Granting that file `select: 1` below turns that hard failure
// into recorded debt, which the Constitution (§5.8 — the check suite only ever
// gets stricter) permits only by explicit owner decision. That decision exists:
// APPROVED BY OWNER RULING 2026-07-10. Nothing else here is grandfathered.
//
// This list is a RATCHET, not an exemption pool:
//   * a count that RISES fails      — a new native control slipped in
//   * a count that FALLS fails      — shrink the entry in the same commit
//   * a file that is not listed fails on its first native control
//
// Each entry's marker names the SURFACE whose redesign owns its removal, and
// only the stage that redesigns that surface may delete the entry.
//
// "PENDING-RECUT" is a debt label, not a schedule. No per-page re-cut stage is
// approved or scheduled: the design programme that proposes them is
// (design programme — proposed, not yet adopted). Until such a stage exists,
// these entries are removed by whichever approved stage redesigns the named
// surface. The debt is real regardless of what that stage ends up being called.
export const PENDING_RECUT_ALLOWLIST = Object.freeze([
  Object.freeze({
    file: 'src/leagues/LeaguePresentation.jsx',
    marker: 'PENDING-RECUT: Leagues',
    counts: Object.freeze({ select: 1 }),
    // LeaguePicker. Uses <optgroup> to head Original / KO Predictor groups.
    // SelectField supports neither optgroup nor multi-select, so it is not a
    // drop-in — and would not remove the OS picker anyway (see header).
    // Whatever replaces it must keep Original and KO leagues visually
    // separate and never combined (Decision Register, "Points separation";
    // Charter §10). The approved League contract shows no <select>; the
    // replacement control itself is not yet specified by any binding
    // authority, and Charter §12A holds Leagues closed unless Nicky
    // explicitly reopens the surface.
  }),
  Object.freeze({
    file: 'src/admin/AdminControlRoomSections.jsx',
    marker: 'PENDING-RECUT: Admin Control Room',
    counts: Object.freeze({ 'date-time': 1 }),
    // Grace-window "Expires" datetime-local. No shared date primitive exists.
  }),
  Object.freeze({
    file: 'src/admin/AdminFixtureOperations.jsx',
    marker: 'PENDING-RECUT: Admin Control Room',
    counts: Object.freeze({ 'date-time': 2 }),
    // Scheduled date + venue-local kick-off. No shared date primitive exists.
  }),
  Object.freeze({
    file: 'src/admin/AdminScoringRecovery.jsx',
    marker: 'PENDING-RECUT: Admin Control Room',
    counts: Object.freeze({ checkbox: 1 }),
    // Reconcile-all acknowledgement box. No shared checkbox primitive exists.
  }),
])

export const MARKER_PATTERN = /^PENDING-RECUT: \S/

export const CONTROL_RULES = Object.freeze([
  Object.freeze({ id: 'select', describe: 'raw select element', patterns: [/<select[\s/>]/g] }),
  Object.freeze({ id: 'select-dom', describe: 'scripted select element', patterns: [/createElement\(\s*['"`]select['"`]/g] }),
  Object.freeze({ id: 'date-time', describe: 'native date or time input', patterns: [/type\s*=\s*["'](?:date|time|datetime-local|month|week)["']/g] }),
  Object.freeze({ id: 'checkbox', describe: 'native checkbox input', patterns: [/type\s*=\s*["']checkbox["']/g] }),
  Object.freeze({ id: 'radio', describe: 'native radio input', patterns: [/type\s*=\s*["']radio["']/g] }),
  Object.freeze({
    id: 'dialog',
    describe: 'browser confirm, alert or prompt',
    // Bare call, plus the window-qualified form the bare pattern's lookbehind
    // deliberately excludes so the two can never double-count one call site.
    patterns: [/(?<![\w.$])(?:confirm|alert|prompt)\s*\(/g, /window\.(?:confirm|alert|prompt)\s*\(/g],
  }),
])

export const CONTROL_IDS = Object.freeze(CONTROL_RULES.map(rule => rule.id))

// { [controlId]: occurrences } for every class present in the source.
export function countNativeControls(source) {
  const counts = {}
  for (const rule of CONTROL_RULES) {
    const total = rule.patterns.reduce((sum, pattern) => sum + [...source.matchAll(pattern)].length, 0)
    if (total > 0) counts[rule.id] = total
  }
  return counts
}

// How many occurrences of `controlId` this file is permitted to contain.
export function allowanceFor(file, controlId) {
  const primitive = PRIMITIVE_SOURCES[file]
  if (primitive?.[controlId]) return primitive[controlId]
  const entry = PENDING_RECUT_ALLOWLIST.find(candidate => candidate.file === file)
  return entry?.counts[controlId] ?? 0
}
