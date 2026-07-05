import { describe, expect, it } from 'vitest'
import {
  EURO28_STAGING_PROJECT_REF,
  STAGE16A_P5_REQUIRED_LOCAL_ENV_KEYS,
  STAGE16A_P5_TEARDOWN_CONFIRMATION,
  STAGE16A_P5_WRITE_PREFLIGHT_GUARD,
  STAGE16A_P5_WRITE_PREFLIGHT_VERSION,
  WC26_PRODUCTION_PROJECT_REF,
  buildStage16aP5WritePreflightPlan,
  buildStage16aP5WritePreflightReport,
  validateStage16aP5WritePreflightPlan,
} from '../lib/stage16aSeedWritePreflight.mjs'

describe('Stage 16A-P5 staging write preflight', () => {
  it('keeps the P5 guard non-writing and approval-gated', () => {
    expect(STAGE16A_P5_WRITE_PREFLIGHT_GUARD.stage).toBe('16A-P5')
    expect(STAGE16A_P5_WRITE_PREFLIGHT_GUARD.preflightVersion).toBe(STAGE16A_P5_WRITE_PREFLIGHT_VERSION)
    expect(STAGE16A_P5_WRITE_PREFLIGHT_GUARD.writesDatabase).toBe(false)
    expect(STAGE16A_P5_WRITE_PREFLIGHT_GUARD.createsUsers).toBe(false)
    expect(STAGE16A_P5_WRITE_PREFLIGHT_GUARD.seedsPredictions).toBe(false)
    expect(STAGE16A_P5_WRITE_PREFLIGHT_GUARD.usesServiceRoleCredential).toBe(false)
    expect(STAGE16A_P5_WRITE_PREFLIGHT_GUARD.readsServiceRoleCredential).toBe(false)
    expect(STAGE16A_P5_WRITE_PREFLIGHT_GUARD.canStartWrite).toBe(false)
    expect(STAGE16A_P5_WRITE_PREFLIGHT_GUARD.requiresExplicitNextSliceApproval).toBe(true)
    expect(STAGE16A_P5_WRITE_PREFLIGHT_GUARD.createsMigration).toBe(false)
    expect(STAGE16A_P5_WRITE_PREFLIGHT_GUARD.combinesCompetitions).toBe(false)
  })

  it('builds a staging-only preflight plan from P3 and P4 evidence', () => {
    const plan = buildStage16aP5WritePreflightPlan()

    expect(plan.stage).toBe('16A-P5')
    expect(plan.projectRef).toBe(EURO28_STAGING_PROJECT_REF)
    expect(plan.sourceManifestVersion).toBe('stage16a-seed-manifest-dry-run-v1')
    expect(plan.sourceSqlPreviewVersion).toBe('stage16a-seed-sql-dry-run-v1')
    expect(plan.plannedCounts.personas).toBe(19)
    expect(plan.plannedCounts.provisionalTeamSlots).toBe(24)
    expect(plan.plannedCounts.timePhaseCases).toBe(11)
    expect(plan.plannedCounts.leagues).toBe(3)
    expect(plan.competitions.original).toBe('original')
    expect(plan.competitions.koPredictor).toBe('ko_predictor')
    expect(plan.competitions.combinedTotal).toBe(false)
    expect(validateStage16aP5WritePreflightPlan(plan)).toBe(true)
  })

  it('records required local env names without reading or printing values', () => {
    const plan = buildStage16aP5WritePreflightPlan()
    const envKeys = plan.requiredLocalEnv.map(item => item.key)

    expect(envKeys).toEqual(STAGE16A_P5_REQUIRED_LOCAL_ENV_KEYS)
    for (const item of plan.requiredLocalEnv) {
      expect(item.valueRead).toBe(false)
      expect(item.valuePrinted).toBe(false)
      expect(item.requiredForLaterWriteSlice).toBe(true)
    }
  })

  it('requires dual synthetic teardown markers and zero-residue reseed checks', () => {
    const plan = buildStage16aP5WritePreflightPlan()

    expect(plan.syntheticMarkers.emailDomain).toBe('synthetic.euro28.test')
    expect(plan.syntheticMarkers.metadataMarker.synthetic_euro28).toBe(true)
    expect(plan.teardown.requiresBothMarkers).toBe(true)
    expect(plan.teardown.selectorRequiresEmailDomain).toBe('@synthetic.euro28.test')
    expect(plan.teardown.selectorRequiresMetadataMarker.synthetic_euro28).toBe(true)
    expect(plan.teardown.confirmationPhrase).toBe(STAGE16A_P5_TEARDOWN_CONFIRMATION)
    expect(plan.teardown.zeroResidueAssertionRequired).toBe(true)
    expect(plan.teardown.reseedValidationRequired).toBe(true)
    expect(plan.teardown.protectsRealAccounts).toBe(true)
    expect(plan.teardown.protectsTournamentConfig).toBe(true)
    expect(plan.teardown.protectsStagingControls).toBe(true)
  })

  it('fails closed outside Euro staging and explicitly blocks WC26 production', () => {
    expect(buildStage16aP5WritePreflightPlan({ projectRef: EURO28_STAGING_PROJECT_REF }).projectRef).toBe(EURO28_STAGING_PROJECT_REF)
    expect(() => buildStage16aP5WritePreflightPlan({ projectRef: WC26_PRODUCTION_PROJECT_REF })).toThrow(/blocked against the WC26 production project/)
    expect(() => buildStage16aP5WritePreflightPlan({ projectRef: 'random-project' })).toThrow(/requires Euro staging project/)
  })

  it('prints a safe JSON report with no secret values and no write permission', () => {
    const report = JSON.parse(buildStage16aP5WritePreflightReport())

    expect(report.stage).toBe('16A-P5')
    expect(report.preflightVersion).toBe(STAGE16A_P5_WRITE_PREFLIGHT_VERSION)
    expect(report.writesDatabase).toBe(false)
    expect(report.createsUsers).toBe(false)
    expect(report.seedsPredictions).toBe(false)
    expect(report.usesServiceRoleCredential).toBe(false)
    expect(report.readsServiceRoleCredential).toBe(false)
    expect(report.canStartWrite).toBe(false)
    expect(report.requiresExplicitNextSliceApproval).toBe(true)
    expect(report.envValuesRead).toBe(false)
    expect(report.envValuesPrinted).toBe(false)
    expect(report.requiredLocalEnvKeys).toEqual(STAGE16A_P5_REQUIRED_LOCAL_ENV_KEYS)
  })
})
