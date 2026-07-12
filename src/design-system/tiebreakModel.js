// Item 64 — the tiebreak position picker, MODEL half.
//
// The COMPONENT half (TiebreakPositionPicker.jsx) landed at DP-PRIMITIVES driven
// by stub inputs. This is the half that feeds it from real predictions:
//
//   * detecting a genuinely undecidable tie   -> buildUnresolvedTies
//   * holding the player's manual ordering    -> resolutionFor / saveResolution
//   * the reset-on-edit rule                  -> reconcileTieResolutions
//
// Detection is NOT re-derived here. resolveGroupTable already knows which teams
// its provisional criteria could not separate: it returns `unresolvedTieGroups`
// (every partition it failed to split) and raises a PROVISIONAL_TIE_FALLBACK
// issue. Re-implementing that logic would be a second, drifting source of truth,
// so this reads the resolver's own answer and shapes it for the picker.

// Swap the item at `index` with its neighbour in `direction`; a no-op past the ends.
export function moveItem(list, index, direction) {
  const target = index + direction
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

// The picker's starting order is the tie's own team order — detection decides
// that, not the component.
export function orderFromTie(tie) {
  return (tie?.teams ?? []).map(team => team.teamId)
}

// A tie needs the player's help only when two or more teams are actually tied.
// A partition of one is a team the resolver separated perfectly well; showing it
// a "we can't decide this" banner would be a lie. (This read `teams?.length` —
// truthy, not `> 1` — so a single-team partition raised the whole picker.)
export function hasUnresolvedTie(tie) {
  return Boolean(tie && tie.teams?.length > 1)
}

export function labelFor(tie, teamId) {
  return tie?.teams?.find(team => team.teamId === teamId)?.label ?? teamId
}

// A manual ordering is only valid for the exact scores that produced the tie.
// Any edit to that group's scores can move the standings underneath it, so the
// signature changes and the saved order is treated as stale — the reset-on-edit
// rule. Keyed on the scores themselves, not on the tie's team set: two different
// scorelines can produce the same tied teams for different reasons.
export function groupScoreSignature(matches, draft) {
  return (matches ?? [])
    .map(match => {
      const row = draft?.groupPredictions?.[String(match.matchNumber)]
      return `${match.matchNumber}:${row?.homeScore ?? ''}-${row?.awayScore ?? ''}`
    })
    .join('|')
}

// Shape the resolver's unresolved partitions into tie descriptors the picker can
// render. One descriptor per genuinely undecidable partition (2+ teams).
export function buildUnresolvedTies(tablesModel, reference, draft) {
  const groups = tablesModel?.groups ?? []

  return groups.flatMap(group => {
    const table = group.table
    const partitions = (table?.unresolvedTieGroups ?? []).filter(partition => partition.length > 1)
    if (partitions.length === 0) return []

    const matches = (reference?.groupMatches ?? []).filter(match => match.groupCode === group.code)
    const signature = groupScoreSignature(matches, draft)
    const rowsById = new Map((table?.rows ?? []).map(row => [row.teamId, row]))

    return partitions.map(teamIds => Object.freeze({
      groupCode: group.code,
      signature,
      reason: 'the tie-break criteria do not separate them',
      teams: Object.freeze(teamIds.map(teamId => {
        const row = rowsById.get(teamId)
        const team = reference?.teamsById?.[teamId]
        return Object.freeze({
          teamId,
          label: team?.label ?? row?.label ?? row?.stableKey ?? teamId,
        })
      })),
    }))
  })
}

// Reconcile saved orderings against the ties that currently exist.
//
// A saved order survives only while its group's scores are unchanged. When the
// signature has moved, the order is dropped AND the group is reported in
// `resetGroupCodes` so the picker can say so out loud — a silent reset would
// leave the player believing positions they no longer have. A tie that has
// simply gone away needs no notice: the standings resolved themselves.
export function reconcileTieResolutions(saved, ties) {
  const resolutions = {}
  const resetGroupCodes = []

  for (const tie of ties ?? []) {
    const previous = saved?.[tie.groupCode]
    if (!previous) continue
    if (previous.signature === tie.signature) resolutions[tie.groupCode] = previous
    else resetGroupCodes.push(tie.groupCode)
  }

  return Object.freeze({
    resolutions: Object.freeze(resolutions),
    resetGroupCodes: Object.freeze(resetGroupCodes),
  })
}

// The ordering the player saved for this tie, or null while it is unanswered.
export function resolutionFor(resolutions, tie) {
  return resolutions?.[tie?.groupCode]?.order ?? null
}

// Record an ordering against the scores that produced it.
export function saveResolution(saved, tie, order) {
  return Object.freeze({
    ...saved,
    [tie.groupCode]: Object.freeze({ order: Object.freeze([...order]), signature: tie.signature }),
  })
}
