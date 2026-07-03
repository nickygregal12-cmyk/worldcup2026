import { describe, expect, it } from 'vitest'
import { buildGuestReference } from '../../guest/__tests__/fixtures.js'
import { buildKoReadiness } from '../koReadiness.js'
import { APP_ROUTE } from '../appRoutes.js'
import { buildNavigationDestinations, deriveNavigationLifecycle, NAVIGATION_PHASE } from '../navigationLifecycle.js'

function lifecycleReference({ completedGroups = 0, resolvedRoundOf16 = 0 } = {}) {
  const reference = buildGuestReference()
  return {
    ...reference,
    groupMatches: reference.groupMatches.map((match, index) => ({
      ...match,
      status: index < completedGroups ? 'completed' : 'scheduled',
      resultStatus: index < completedGroups ? 'confirmed' : 'pending',
    })),
    knockoutMatches: reference.knockoutMatches.map(match => {
      const roundIndex = match.matchNumber - 37
      const resolved = roundIndex >= 0 && roundIndex < resolvedRoundOf16
      return {
        ...match,
        homeTeamId: resolved ? `home-${match.matchNumber}` : null,
        awayTeamId: resolved ? `away-${match.matchNumber}` : null,
        participantsResolved: resolved,
      }
    }),
  }
}

describe('phase-driven navigation lifecycle', () => {
  it('keeps Groups primary and omits KO from More before a complete pairing exists', () => {
    const lifecycle = deriveNavigationLifecycle(lifecycleReference())

    expect(lifecycle).toMatchObject({
      phase: NAVIGATION_PHASE.GROUPS_PRIMARY,
      primaryRoute: APP_ROUTE.PREDICT,
      bracketRoute: APP_ROUTE.BRACKET,
      showKoInMore: false,
      showGroupReviewInMore: false,
      resolvedRoundOf16Count: 0,
    })
  })

  it('offers KO through More when the first complete Round of 16 pairing exists', () => {
    const lifecycle = deriveNavigationLifecycle(lifecycleReference({ resolvedRoundOf16: 1 }))

    expect(lifecycle).toMatchObject({
      phase: NAVIGATION_PHASE.KO_EARLY_ACCESS,
      primaryRoute: APP_ROUTE.PREDICT,
      showKoInMore: true,
      showGroupReviewInMore: false,
      resolvedRoundOf16Count: 1,
    })
    expect(lifecycle.availableKoMatches.map(match => match.matchNumber)).toEqual([37])
    expect(buildNavigationDestinations(lifecycle).phaseMoreDestinations).toEqual([
      expect.objectContaining({ key: APP_ROUTE.KO_PREDICTOR, label: 'KO Predictor', icon: 'trophy' }),
    ])
  })


  it('can consume a prebuilt shared KO readiness signal', () => {
    const reference = lifecycleReference({ resolvedRoundOf16: 1 })
    const readiness = buildKoReadiness(reference)
    const lifecycle = deriveNavigationLifecycle(reference, { koReadiness: readiness })

    expect(lifecycle.koReadiness).toBe(readiness)
    expect(lifecycle.showKoInMore).toBe(true)
    expect(lifecycle.resolvedRoundOf16Count).toBe(1)
  })

  it('keeps Groups primary after the group stage until all eight pairings are resolved', () => {
    const lifecycle = deriveNavigationLifecycle(lifecycleReference({ completedGroups: 36, resolvedRoundOf16: 7 }))

    expect(lifecycle).toMatchObject({
      phase: NAVIGATION_PHASE.KO_EARLY_ACCESS,
      groupStageComplete: true,
      roundOf16Complete: false,
      primaryRoute: APP_ROUTE.PREDICT,
      showKoInMore: true,
    })
  })

  it('does not switch early even if all eight pairings are populated before the final group result', () => {
    const lifecycle = deriveNavigationLifecycle(lifecycleReference({ completedGroups: 35, resolvedRoundOf16: 8 }))

    expect(lifecycle).toMatchObject({
      phase: NAVIGATION_PHASE.KO_EARLY_ACCESS,
      groupStageComplete: false,
      roundOf16Complete: true,
      primaryRoute: APP_ROUTE.PREDICT,
    })
  })

  it('switches Position 1 atomically to KO only at the fully ready transition', () => {
    const lifecycle = deriveNavigationLifecycle(lifecycleReference({ completedGroups: 36, resolvedRoundOf16: 8 }))

    expect(lifecycle).toMatchObject({
      phase: NAVIGATION_PHASE.KO_PRIMARY,
      groupStageComplete: true,
      roundOf16Complete: true,
      primaryRoute: APP_ROUTE.KO_PREDICTOR,
      bracketRoute: APP_ROUTE.BRACKET,
      showKoInMore: false,
      showGroupReviewInMore: true,
    })

    const destinations = buildNavigationDestinations(lifecycle)
    expect(destinations.primary).toMatchObject({ key: APP_ROUTE.KO_PREDICTOR, label: 'KO Predictor', shortLabel: 'KO', icon: 'trophy' })
    expect(destinations.bracket).toMatchObject({ key: APP_ROUTE.BRACKET, label: 'Bracket', icon: 'bracket' })
    expect(destinations.phaseMoreDestinations).toEqual([
      expect.objectContaining({ key: APP_ROUTE.PREDICT, label: 'Group stage review', icon: 'predict' }),
    ])
  })

  it('fails safe when the resolver is unhealthy at the transition moment', () => {
    const lifecycle = deriveNavigationLifecycle(
      lifecycleReference({ completedGroups: 36, resolvedRoundOf16: 8 }),
      { resolverHealthy: false },
    )

    expect(lifecycle).toMatchObject({
      phase: NAVIGATION_PHASE.KO_EARLY_ACCESS,
      primaryRoute: APP_ROUTE.PREDICT,
      showKoInMore: true,
      showGroupReviewInMore: false,
      resolverHealthy: false,
    })
  })

  it('never exposes unresolved TBC fixtures as available KO matches', () => {
    const reference = lifecycleReference({ resolvedRoundOf16: 2 })
    reference.knockoutMatches[1] = {
      ...reference.knockoutMatches[1],
      awayTeamId: null,
      participantsResolved: false,
    }

    const lifecycle = deriveNavigationLifecycle(reference)

    expect(lifecycle.resolvedRoundOf16Count).toBe(1)
    expect(lifecycle.availableKoMatches.map(match => match.matchNumber)).toEqual([37])
    expect(buildNavigationDestinations(lifecycle).phaseMoreDestinations).toEqual([
      expect.objectContaining({ key: APP_ROUTE.KO_PREDICTOR, label: 'KO Predictor', icon: 'trophy' }),
    ])
  })
})
