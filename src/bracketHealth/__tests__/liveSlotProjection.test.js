import { describe, expect, it } from 'vitest'
import {
  PROJECTION_MATCHES_PLAYED,
  buildLiveSlotProjection,
  groupAtThreshold,
  projectedSlotTeamId,
} from '../liveSlotProjection.js'

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F']

// A group table shaped like the resolver's: four ranked rows, each carrying `played`.
function table(code, played, { completedMatchCount } = {}) {
  return {
    groupCode: code,
    completedMatchCount: completedMatchCount ?? played * 2,
    rows: [1, 2, 3, 4].map(rank => ({ teamId: `${code}${rank}`, rank, played })),
  }
}

function snapshot(playedByGroup, bestThird = null) {
  return {
    groups: Object.fromEntries(GROUPS.map(code => [code, table(code, playedByGroup[code] ?? 0)])),
    bestThird,
  }
}

describe('groupAtThreshold', () => {
  it('is two matches per team, matching the owner ruling', () => {
    expect(PROJECTION_MATCHES_PLAYED).toBe(2)
  })

  it('refuses a group where every team has played once', () => {
    expect(groupAtThreshold(table('A', 1))).toBe(false)
  })

  it('accepts a group where every team has played twice', () => {
    expect(groupAtThreshold(table('A', 2))).toBe(true)
  })

  it('refuses a group where one team is still a match behind the others', () => {
    const uneven = table('A', 2)
    uneven.rows[3] = { ...uneven.rows[3], played: 1 }
    expect(groupAtThreshold(uneven)).toBe(false)
  })

  it('accepts a finished group even without row detail', () => {
    expect(groupAtThreshold({ completedMatchCount: 6 })).toBe(true)
  })

  it('refuses an empty or missing table', () => {
    expect(groupAtThreshold(null)).toBe(false)
    expect(groupAtThreshold({ rows: [] })).toBe(false)
  })
})

describe('buildLiveSlotProjection', () => {
  it('is not revealed before a ball is kicked', () => {
    const projection = buildLiveSlotProjection(snapshot({}))
    expect(projection.revealed).toBe(false)
    expect(projection.tournamentUnderway).toBe(false)
    expect(projection.groupsReadyCount).toBe(0)
  })

  it('is not revealed mid-groups while every group is still on matchday one', () => {
    const projection = buildLiveSlotProjection(snapshot(Object.fromEntries(GROUPS.map(code => [code, 1]))))
    expect(projection.revealed).toBe(false)
    // The distinction the page depends on: started, but nothing to say yet.
    expect(projection.tournamentUnderway).toBe(true)
  })

  it('reveals as soon as the first group reaches its second round, and names it', () => {
    const projection = buildLiveSlotProjection(snapshot({ A: 2, B: 1, C: 1, D: 1, E: 1, F: 1 }))
    expect(projection.revealed).toBe(true)
    expect(projection.groupsReady).toEqual(['A'])
    expect(projection.allGroupsReady).toBe(false)
  })

  it('reports all six ready only when every group has got there', () => {
    const projection = buildLiveSlotProjection(snapshot(Object.fromEntries(GROUPS.map(code => [code, 2]))))
    expect(projection.allGroupsReady).toBe(true)
    expect(projection.groupsReadyCount).toBe(6)
  })

  it('survives a snapshot with no groups at all', () => {
    const projection = buildLiveSlotProjection(null)
    expect(projection.revealed).toBe(false)
    expect(projection.allGroupsReady).toBe(false)
  })
})

describe('projectedSlotTeamId', () => {
  const bestThird = { assignmentsByMatch: { 39: { matchNumber: 39, teamId: 'D3' } } }

  it('projects a group-position slot from a ready group', () => {
    const live = snapshot({ A: 2, B: 1, C: 1, D: 1, E: 1, F: 1 })
    const projection = buildLiveSlotProjection(live)
    const teamId = projectedSlotTeamId({
      source: { sourceType: 'group_position', groupCode: 'A', position: 1 },
      matchNumber: 37, liveSnapshot: live, projection,
    })
    expect(teamId).toBe('A1')
  })

  it('refuses a group-position slot whose group has not reached the threshold', () => {
    const live = snapshot({ A: 2, B: 1, C: 1, D: 1, E: 1, F: 1 })
    const projection = buildLiveSlotProjection(live)
    // Match 37 is A1 v C2. Group A is ready; group C is not — so C2 stays a placeholder.
    const teamId = projectedSlotTeamId({
      source: { sourceType: 'group_position', groupCode: 'C', position: 2 },
      matchNumber: 37, liveSnapshot: live, projection,
    })
    expect(teamId).toBeNull()
  })

  it('withholds a best-third slot until ALL six groups are ready', () => {
    const live = { ...snapshot({ A: 2, B: 2, C: 2, D: 2, E: 2, F: 1 }), bestThird }
    const projection = buildLiveSlotProjection(live)
    expect(projection.revealed).toBe(true)
    // Five of six is not enough: the best-third matrix is keyed by which four groups the
    // qualifying thirds come from, so one missing group makes the combination key wrong.
    expect(projectedSlotTeamId({
      source: { sourceType: 'best_third' }, matchNumber: 39, liveSnapshot: live, projection,
    })).toBeNull()
  })

  it('projects a best-third slot once all six groups are ready', () => {
    const live = { ...snapshot(Object.fromEntries(GROUPS.map(code => [code, 2]))), bestThird }
    const projection = buildLiveSlotProjection(live)
    expect(projectedSlotTeamId({
      source: { sourceType: 'best_third' }, matchNumber: 39, liveSnapshot: live, projection,
    })).toBe('D3')
  })

  it('never projects a match-winner slot from group standings', () => {
    const live = snapshot(Object.fromEntries(GROUPS.map(code => [code, 2])))
    const projection = buildLiveSlotProjection(live)
    expect(projectedSlotTeamId({
      source: { sourceType: 'match_winner', matchNumber: 37 },
      matchNumber: 45, liveSnapshot: live, projection,
    })).toBeNull()
  })
})
