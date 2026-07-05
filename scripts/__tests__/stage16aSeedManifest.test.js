import { describe, expect, it } from 'vitest'
import {
  EURO28_STAGING_PROJECT_REF,
  STAGE16A_P3_DRY_RUN_LEAGUES,
  STAGE16A_P3_DRY_RUN_OPERATIONS,
  STAGE16A_P3_TEAM_SLOTS,
  WC26_PRODUCTION_PROJECT_REF,
  buildStage16aSeedManifestDryRun,
  validateStage16aSeedManifest,
} from '../lib/stage16aSeedManifest.mjs'

describe('Stage 16A-P3 seed manifest dry-run', () => {
  it('publishes the dry-run seed manifest counts without database writes', () => {
    const validation = validateStage16aSeedManifest()

    expect(validation.personaCount).toBe(19)
    expect(validation.teamSlotCount).toBe(24)
    expect(validation.groupCount).toBe(6)
    expect(validation.timeCaseCount).toBe(11)
    expect(validation.leagueCount).toBe(3)
    expect(validation.originalBundleCount).toBeGreaterThan(0)
    expect(validation.koBundleCount).toBeGreaterThan(0)
    expect(validation.dryRunOnly).toBe(true)
    expect(validation.writesDatabase).toBe(false)
    expect(validation.createsUsers).toBe(false)
    expect(validation.seedsPredictions).toBe(false)
    expect(validation.createsMigration).toBe(false)
    expect(validation.combinesCompetitions).toBe(false)
  })

  it('keeps provisional teams as 24 synthetic slots across six groups', () => {
    expect(STAGE16A_P3_TEAM_SLOTS).toHaveLength(24)
    for (const group of ['A', 'B', 'C', 'D', 'E', 'F']) {
      expect(STAGE16A_P3_TEAM_SLOTS.filter(slot => slot.group === group)).toHaveLength(4)
    }
    for (const slot of STAGE16A_P3_TEAM_SLOTS) {
      expect(slot.provisional).toBe(true)
      expect(slot.writesDatabase).toBe(false)
      expect(slot.isoCode).toMatch(/^S[A-F][1-4]$/)
    }
  })

  it('models large, tiny, multi-league and no-league evidence without writes', () => {
    const membershipCounts = new Map()
    for (const league of STAGE16A_P3_DRY_RUN_LEAGUES) {
      expect(league.writesDatabase).toBe(false)
      expect(league.competitionEvidence).toContain('original')
      expect(league.competitionEvidence).toContain('ko_predictor')
      for (const key of league.memberKeys) membershipCounts.set(key, (membershipCounts.get(key) ?? 0) + 1)
    }

    expect(STAGE16A_P3_DRY_RUN_LEAGUES.some(league => league.memberKeys.length >= 14)).toBe(true)
    expect(STAGE16A_P3_DRY_RUN_LEAGUES.some(league => league.memberKeys.length >= 2 && league.memberKeys.length <= 3)).toBe(true)
    expect([...membershipCounts.values()].some(count => count > 1)).toBe(true)
  })

  it('keeps every operation in dry-run-only mode', () => {
    for (const operation of STAGE16A_P3_DRY_RUN_OPERATIONS) {
      expect(operation.wouldWrite).toBe(false)
      expect(operation.writeMode).toBe('dry_run_only')
    }
  })

  it('fails closed outside Euro staging and explicitly blocks WC26 production', () => {
    expect(buildStage16aSeedManifestDryRun({ projectRef: EURO28_STAGING_PROJECT_REF }).projectRef).toBe(EURO28_STAGING_PROJECT_REF)
    expect(() => buildStage16aSeedManifestDryRun({ projectRef: WC26_PRODUCTION_PROJECT_REF })).toThrow(/blocked against the WC26 production project/)
    expect(() => buildStage16aSeedManifestDryRun({ projectRef: 'random-project' })).toThrow(/requires Euro staging project/)
  })

  it('builds a guarded manifest with dual-marker teardown and separated competitions', () => {
    const plan = buildStage16aSeedManifestDryRun()

    expect(plan.stage).toBe('16A-P3')
    expect(plan.dryRunOnly).toBe(true)
    expect(plan.writesDatabase).toBe(false)
    expect(plan.createsUsers).toBe(false)
    expect(plan.seedsPredictions).toBe(false)
    expect(plan.requiresServiceRole).toBe(false)
    expect(plan.createsMigration).toBe(false)
    expect(plan.combinesCompetitions).toBe(false)
    expect(plan.plannedCounts.provisionalTeamSlots).toBe(24)
    expect(plan.plannedCounts.personas).toBe(19)
    expect(plan.plannedCounts.timePhaseCases).toBe(11)
    expect(plan.teardownGuard.requiresReservedEmailDomain).toBe(true)
    expect(plan.teardownGuard.requiresSyntheticMetadataMarker).toBe(true)
    expect(plan.teardownGuard.seedValidateTeardownZeroResidueReseed).toBe(true)
  })
})
