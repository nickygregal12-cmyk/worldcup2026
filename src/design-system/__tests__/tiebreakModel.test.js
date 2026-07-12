import { describe, expect, it } from 'vitest'
import {
  buildUnresolvedTies,
  groupScoreSignature,
  hasUnresolvedTie,
  labelFor,
  moveItem,
  orderFromTie,
  reconcileTieResolutions,
  resolutionFor,
  saveResolution,
} from '../tiebreakModel.js'

// Item 64, MODEL half. Detection reads the resolver's own `unresolvedTieGroups`
// rather than re-deriving a second, drifting answer, so these tests feed it the
// shape resolveGroupTable actually returns.

const tie = {
  groupCode: 'A',
  signature: '1:2-1|2:0-0',
  reason: 'the tie-break criteria do not separate them',
  teams: [
    { teamId: 'wal', label: 'Wales' },
    { teamId: 'ger', label: 'Germany' },
  ],
}

const reference = {
  groupMatches: [
    { matchNumber: 1, groupCode: 'A' },
    { matchNumber: 2, groupCode: 'A' },
  ],
  teamsById: {
    wal: { label: 'Wales' },
    ger: { label: 'Germany' },
  },
}

const draft = {
  groupPredictions: {
    1: { homeScore: 2, awayScore: 1 },
    2: { homeScore: 0, awayScore: 0 },
  },
}

// What resolveGroupTable hands back: rows, plus the partitions its criteria could
// not split. A partition of one is a team it separated perfectly well.
const tablesModel = {
  groups: [{
    code: 'A',
    table: {
      groupCode: 'A',
      rows: [{ teamId: 'wal' }, { teamId: 'ger' }],
      unresolvedTieGroups: [['wal', 'ger']],
    },
  }],
}

describe('hasUnresolvedTie', () => {
  it('reports a tie only when two or more teams are actually tied', () => {
    expect(hasUnresolvedTie(tie)).toBe(true)
    expect(hasUnresolvedTie(null)).toBe(false)
    expect(hasUnresolvedTie({ groupCode: 'A', teams: [] })).toBe(false)
  })

  it('does not raise the picker for a single team', () => {
    // The regression. This read `Boolean(tie.teams?.length)` — truthy, not > 1 —
    // so a one-team partition (a team the resolver ranked cleanly) raised the
    // whole "we can't decide this" banner and asked the player to order a list of
    // one. The comment above it always said "two or more"; the code did not.
    expect(hasUnresolvedTie({ groupCode: 'A', teams: [{ teamId: 'wal', label: 'Wales' }] })).toBe(false)
  })
})

describe('buildUnresolvedTies', () => {
  it('shapes the resolver’s unresolved partitions into tie descriptors', () => {
    const ties = buildUnresolvedTies(tablesModel, reference, draft)

    expect(ties).toHaveLength(1)
    expect(ties[0].groupCode).toBe('A')
    expect(ties[0].teams.map(team => team.teamId)).toEqual(['wal', 'ger'])
    expect(ties[0].teams.map(team => team.label)).toEqual(['Wales', 'Germany'])
  })

  it('ignores partitions of one — those are teams the resolver separated', () => {
    const separated = {
      groups: [{
        code: 'A',
        table: { rows: [{ teamId: 'wal' }], unresolvedTieGroups: [['wal']] },
      }],
    }
    expect(buildUnresolvedTies(separated, reference, draft)).toEqual([])
  })

  it('reports no tie when the resolver raised none', () => {
    const clean = { groups: [{ code: 'A', table: { rows: [], unresolvedTieGroups: [] } }] }
    expect(buildUnresolvedTies(clean, reference, draft)).toEqual([])
    expect(buildUnresolvedTies(null, reference, draft)).toEqual([])
  })
})

describe('groupScoreSignature', () => {
  it('changes when any score in the group changes', () => {
    const before = groupScoreSignature(reference.groupMatches, draft)
    const after = groupScoreSignature(reference.groupMatches, {
      groupPredictions: { 1: { homeScore: 3, awayScore: 1 }, 2: { homeScore: 0, awayScore: 0 } },
    })
    expect(after).not.toBe(before)
  })

  it('is stable when nothing changed', () => {
    expect(groupScoreSignature(reference.groupMatches, draft))
      .toBe(groupScoreSignature(reference.groupMatches, draft))
  })

  it('distinguishes an unset score from a predicted nil', () => {
    // 0–0 is a prediction; blank is not. If these hashed alike, filling in a 0–0
    // would silently keep a tie ordering that was decided without it.
    const blank = groupScoreSignature(reference.groupMatches, { groupPredictions: {} })
    const nils = groupScoreSignature(reference.groupMatches, {
      groupPredictions: { 1: { homeScore: 0, awayScore: 0 }, 2: { homeScore: 0, awayScore: 0 } },
    })
    expect(blank).not.toBe(nils)
  })
})

describe('reset-on-edit', () => {
  it('keeps a saved ordering while the scores behind it are untouched', () => {
    const saved = saveResolution({}, tie, ['ger', 'wal'])
    const { resolutions, resetGroupCodes } = reconcileTieResolutions(saved, [tie])

    expect(resolutionFor(resolutions, tie)).toEqual(['ger', 'wal'])
    expect(resetGroupCodes).toEqual([])
  })

  it('drops the ordering and says so once a score in that group is edited', () => {
    const saved = saveResolution({}, tie, ['ger', 'wal'])
    // Same tied teams, different scoreline: the ordering was decided against a
    // table that no longer exists, so it cannot be carried forward.
    const afterEdit = { ...tie, signature: '1:3-1|2:0-0' }

    const { resolutions, resetGroupCodes } = reconcileTieResolutions(saved, [afterEdit])

    expect(resolutionFor(resolutions, afterEdit)).toBeNull()
    // A silent reset would leave the player believing positions they no longer have.
    expect(resetGroupCodes).toEqual(['A'])
  })

  it('does not announce a reset for a tie that simply resolved itself', () => {
    const saved = saveResolution({}, tie, ['ger', 'wal'])
    const { resolutions, resetGroupCodes } = reconcileTieResolutions(saved, [])

    expect(resolutions).toEqual({})
    expect(resetGroupCodes).toEqual([])
  })

  it('re-saving against the new scores clears the reset', () => {
    const afterEdit = { ...tie, signature: '1:3-1|2:0-0' }
    const saved = saveResolution(saveResolution({}, tie, ['ger', 'wal']), afterEdit, ['wal', 'ger'])

    const { resolutions, resetGroupCodes } = reconcileTieResolutions(saved, [afterEdit])

    expect(resolutionFor(resolutions, afterEdit)).toEqual(['wal', 'ger'])
    expect(resetGroupCodes).toEqual([])
  })
})

describe('reorder helpers', () => {
  const list = ['a', 'b', 'c']

  it('moves an item up and down', () => {
    expect(moveItem(list, 1, -1)).toEqual(['b', 'a', 'c'])
    expect(moveItem(list, 1, 1)).toEqual(['a', 'c', 'b'])
  })

  it('is a no-op past the ends', () => {
    expect(moveItem(list, 0, -1)).toEqual(['a', 'b', 'c'])
    expect(moveItem(list, 2, 1)).toEqual(['a', 'b', 'c'])
  })

  it('reads its starting order and labels from the tie descriptor', () => {
    expect(orderFromTie(tie)).toEqual(['wal', 'ger'])
    expect(orderFromTie(null)).toEqual([])
    expect(labelFor(tie, 'ger')).toBe('Germany')
    expect(labelFor(tie, 'unknown')).toBe('unknown') // falls back to the id
  })
})
