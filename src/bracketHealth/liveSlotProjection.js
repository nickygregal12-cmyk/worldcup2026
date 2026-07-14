import { EURO28_GROUP_CODES } from '../resolver/index.js'

// Bracket Health reveal timing — owner ruling 2026-07-14.
//
// The question this module answers is "which R16 slots can we honestly project an
// occupant into, right now?" — and the slot-reference architecture already encodes the
// answer. A group_position slot (1A, 2C, …) depends on exactly ONE group's table. A
// best_third slot depends on a ranking ACROSS ALL SIX groups plus the 15-combination
// matrix. So the two kinds of slot become projectable at different moments, and the
// partial state is not a special case to be papered over — it is the architecture.
//
// The threshold is per group: a group speaks once every team in it has played two
// matches (its matchday 2 is complete — four of its six fixtures final).
//
// Why two and not one: after matchday 1 a group is two teams on three points separated
// only by goal difference and two on zero. A projected occupant would be noise that
// flips with every result. After matchday 2 each team has played two of its three, teams
// can be mathematically qualified or eliminated, and the table has real separation.
//
// Why not wait for matchday 3: at that point it is not a projection at all — it is the
// resolved bracket, which the live surfaces already show.
export const PROJECTION_MATCHES_PLAYED = 2

// A live match carries no scoreline until full time, so `played` only ever counts
// finished matches. A group mid-way through its second round does not qualify.
export function groupAtThreshold(table) {
  if (!table) return false
  // A finished group clears the bar by definition: six fixtures scored means every one of
  // its four teams has played three.
  if (Number(table.completedMatchCount ?? 0) >= 6) return true
  const rows = table.rows ?? []
  if (rows.length === 0) return false
  return rows.every(row => Number(row.played ?? 0) >= PROJECTION_MATCHES_PLAYED)
}

export function buildLiveSlotProjection(liveSnapshot) {
  const groups = liveSnapshot?.groups ?? null
  const tables = groups ?? {}
  const groupsReady = EURO28_GROUP_CODES.filter(code => groupAtThreshold(tables[code]))
  const groupMatchesPlayed = EURO28_GROUP_CODES
    .reduce((total, code) => total + Number(tables[code]?.completedMatchCount ?? 0), 0)

  return Object.freeze({
    groupsReady: Object.freeze(groupsReady),
    groupsReadyCount: groupsReady.length,
    groupsTotal: EURO28_GROUP_CODES.length,
    allGroupsReady: Boolean(groups) && groupsReady.length === EURO28_GROUP_CODES.length,
    // One group at its second round is enough to project that group's own slots, which is
    // enough for the tab to have something true to say.
    revealed: groupsReady.length > 0,
    // Distinguishes "the tournament has not started" from "it has started but no group has
    // reached the threshold yet" — the two states get different treatment on the page.
    tournamentUnderway: groupMatchesPlayed > 0,
    groupMatchesPlayed,
  })
}

// Resolve a slot to the team that WOULD occupy it on the standings so far. Every value
// here comes from the resolver's own output — the group tables and the best-third matrix
// it already computed from the played matches. Nothing is re-derived, and nothing is
// invented: a slot whose group has not reached the threshold returns null and stays a
// placeholder.
export function projectedSlotTeamId({ source, matchNumber, liveSnapshot, projection }) {
  if (!source || !projection?.revealed) return null

  if (source.sourceType === 'group_position') {
    if (!projection.groupsReady.includes(source.groupCode)) return null
    const rows = liveSnapshot?.groups?.[source.groupCode]?.rows ?? []
    return rows.find(row => row.rank === source.position)?.teamId ?? null
  }

  if (source.sourceType === 'best_third') {
    // The four best third-placed teams are a cross-group ranking, and which R16 slot each
    // one drops into is decided by the combination of the four groups they come from. One
    // group short and the combination key is wrong, so the assignment is worthless.
    if (!projection.allGroupsReady) return null
    return liveSnapshot?.bestThird?.assignmentsByMatch?.[matchNumber]?.teamId ?? null
  }

  // match_winner slots (quarter-final onwards) depend on knockout results, not group
  // standings. There is nothing to project from a group table, so they stay unresolved
  // until a real result confirms a winner.
  return null
}
