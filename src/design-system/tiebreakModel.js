// Ordering logic for the item-64 tiebreak position picker. This is the
// COMPONENT half's reorder helper only — detecting an undecidable tie, feeding
// the third-place allocator and the reset-on-edit rule are the MODEL half, and
// are scheduled with the Groups re-cut, not this stage.

// Swap the item at `index` with its neighbour in `direction`; a no-op past the ends.
export function moveItem(list, index, direction) {
  const target = index + direction
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

// The picker's starting order is the tie's own team order — the stub detection
// input decides that, not this component.
export function orderFromTie(tie) {
  return (tie?.teams ?? []).map(team => team.teamId)
}

// A tie is only worth showing when the stub reports two or more tied teams.
export function hasUnresolvedTie(tie) {
  return Boolean(tie && tie.teams?.length)
}

export function labelFor(tie, teamId) {
  return tie?.teams?.find(team => team.teamId === teamId)?.label ?? teamId
}
