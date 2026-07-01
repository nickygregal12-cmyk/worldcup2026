import { describe, expect, it } from 'vitest'
import { resolveEuro28Tournament } from '../canonicalTournamentResolver.js'
import {
  EURO28_RESOLVER_VERSION,
  RESOLVER_CONTEXT,
} from '../euro28ResolverConfig.js'
import {
  buildAllHomeKnockoutDecisions,
  buildGroupMatches,
  buildGroups,
} from './fixtures.js'

function resolveFor(context, options = {}) {
  return resolveEuro28Tournament({
    context,
    groups: buildGroups(),
    groupMatches: buildGroupMatches(context, options),
    knockoutDecisions: [],
  })
}

describe('canonical Euro 2028 tournament resolver', () => {
  it('uses one versioned engine for guest, predicted and live contexts', () => {
    for (const context of Object.values(RESOLVER_CONTEXT)) {
      const resolved = resolveFor(context)
      expect(resolved.resolverVersion).toBe(EURO28_RESOLVER_VERSION)
      expect(resolved.context).toBe(context)
      expect(Object.keys(resolved.groupTables)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
      expect(resolved.bestThird.combinationKey).toBe('ABCD')
      expect(resolved.knockout.matches).toHaveLength(15)
    }
  })

  it('produces the same structural result from equivalent context-specific inputs', () => {
    const guest = resolveFor(RESOLVER_CONTEXT.GUEST)
    const predicted = resolveFor(RESOLVER_CONTEXT.PREDICTED)
    const live = resolveFor(RESOLVER_CONTEXT.LIVE)

    expect(guest.groupTables.A.rows.map(row => row.teamId))
      .toEqual(predicted.groupTables.A.rows.map(row => row.teamId))
    expect(predicted.groupTables.A.rows.map(row => row.teamId))
      .toEqual(live.groupTables.A.rows.map(row => row.teamId))
    expect(guest.bestThird.assignmentsByMatch).toEqual(live.bestThird.assignmentsByMatch)
  })

  it('never accepts mixed guest, predicted and live records', () => {
    const matches = buildGroupMatches(RESOLVER_CONTEXT.PREDICTED)
    matches[0] = { ...matches[0], context: RESOLVER_CONTEXT.LIVE }

    expect(() => resolveEuro28Tournament({
      context: RESOLVER_CONTEXT.PREDICTED,
      groups: buildGroups(),
      groupMatches: matches,
      knockoutDecisions: [],
    })).toThrow('contexts must never be blended')

    expect(() => resolveEuro28Tournament({
      context: RESOLVER_CONTEXT.PREDICTED,
      groups: buildGroups(),
      groupMatches: buildGroupMatches(RESOLVER_CONTEXT.PREDICTED),
      knockoutDecisions: [{
        context: RESOLVER_CONTEXT.LIVE,
        matchNumber: 37,
        advancingTeamId: 'A1',
      }],
    })).toThrow('contexts must never be blended')
  })

  it('keeps predicted and live brackets independent when their inputs differ', () => {
    const predicted = resolveFor(RESOLVER_CONTEXT.PREDICTED)
    const liveMatches = buildGroupMatches(RESOLVER_CONTEXT.LIVE)
    liveMatches[0] = { ...liveMatches[0], homeScore: 0, awayScore: 5 }
    const live = resolveEuro28Tournament({
      context: RESOLVER_CONTEXT.LIVE,
      groups: buildGroups(),
      groupMatches: liveMatches,
      knockoutDecisions: [],
    })

    expect(predicted.groupTables.A.rows[0].teamId).toBe('A1')
    expect(live.groupTables.A.rows[0].teamId).not.toBe(predicted.groupTables.A.rows[0].teamId)
    expect(predicted.context).toBe('predicted')
    expect(live.context).toBe('live')
  })

  it('propagates a complete context-specific knockout path', () => {
    const context = RESOLVER_CONTEXT.PREDICTED
    const resolved = resolveEuro28Tournament({
      context,
      groups: buildGroups(),
      groupMatches: buildGroupMatches(context),
      knockoutDecisions: buildAllHomeKnockoutDecisions(context),
    })

    expect(resolved.knockout.championTeamId).toBe('B1')
    expect(resolved.knockout.milestones.round_of_16).toHaveLength(16)
    expect(resolved.knockout.milestones.quarter_final).toHaveLength(8)
    expect(resolved.knockout.milestones.semi_final).toHaveLength(4)
    expect(resolved.knockout.milestones.final).toHaveLength(2)
  })

  it('requires all six groups and all 36 official group fixtures', () => {
    expect(() => resolveEuro28Tournament({
      context: RESOLVER_CONTEXT.GUEST,
      groups: buildGroups().slice(0, 5),
      groupMatches: buildGroupMatches(RESOLVER_CONTEXT.GUEST),
      knockoutDecisions: [],
    })).toThrow('all six groups')

    expect(() => resolveEuro28Tournament({
      context: RESOLVER_CONTEXT.GUEST,
      groups: buildGroups(),
      groupMatches: buildGroupMatches(RESOLVER_CONTEXT.GUEST).slice(0, 35),
      knockoutDecisions: [],
    })).toThrow('all 36 group fixtures')
  })

  it('requires every group fixture to carry a unique identifier', () => {
    const matches = buildGroupMatches(RESOLVER_CONTEXT.GUEST)
    matches[1] = { ...matches[1], matchNumber: matches[0].matchNumber }

    expect(() => resolveEuro28Tournament({
      context: RESOLVER_CONTEXT.GUEST,
      groups: buildGroups(),
      groupMatches: matches,
      knockoutDecisions: [],
    })).toThrow('unique matchNumber or id')
  })
})
