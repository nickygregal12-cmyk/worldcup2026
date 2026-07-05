import { describe, expect, it } from 'vitest'
import {
  EURO28_STAGING_PROJECT_REF,
  STAGE16A_P6A_ACCEPTANCE_PLAN_VERSION,
  STAGE16A_P6A_ALLOWED_BRANCH,
  STAGE16A_P6A_NO_WRITE_GUARD,
  STAGE16A_P6A_REQUIRED_LOCAL_ENV_KEYS,
  STAGE16A_P6A_TEARDOWN_CONFIRMATION,
  WC26_PRODUCTION_PROJECT_REF,
  buildStage16aP6ASeedWriteAcceptancePlan,
  validateStage16aP6ASeedWriteAcceptancePlan,
} from '../lib/stage16aSeedWriteAcceptancePlan.mjs'

describe('Stage 16A-P6A seed write acceptance plan', () => {
  it('keeps P6A as an acceptance plan with no write executor', () => {
    expect(STAGE16A_P6A_NO_WRITE_GUARD.stage).toBe('16A-P6A')
    expect(STAGE16A_P6A_NO_WRITE_GUARD.acceptancePlanVersion).toBe(STAGE16A_P6A_ACCEPTANCE_PLAN_VERSION)
    expect(STAGE16A_P6A_NO_WRITE_GUARD.writesDatabase).toBe(false)
    expect(STAGE16A_P6A_NO_WRITE_GUARD.createsUsers).toBe(false)
    expect(STAGE16A_P6A_NO_WRITE_GUARD.seedsPredictions).toBe(false)
    expect(STAGE16A_P6A_NO_WRITE_GUARD.usesServiceRoleCredential).toBe(false)
    expect(STAGE16A_P6A_NO_WRITE_GUARD.readsServiceRoleCredential).toBe(false)
    expect(STAGE16A_P6A_NO_WRITE_GUARD.envValuesRead).toBe(false)
    expect(STAGE16A_P6A_NO_WRITE_GUARD.envValuesPrinted).toBe(false)
    expect(STAGE16A_P6A_NO_WRITE_GUARD.canStartWrite).toBe(false)
    expect(STAGE16A_P6A_NO_WRITE_GUARD.hasWriteExecutor).toBe(false)
    expect(STAGE16A_P6A_NO_WRITE_GUARD.createsMigration).toBe(false)
    expect(STAGE16A_P6A_NO_WRITE_GUARD.combinesCompetitions).toBe(false)
    expect(STAGE16A_P6A_NO_WRITE_GUARD.requiresExplicitNextSliceApproval).toBe(true)
  })

  it('builds the exact acceptance plan from P3 and P5 evidence', () => {
    const plan = buildStage16aP6ASeedWriteAcceptancePlan()

    expect(plan.stage).toBe('16A-P6A')
    expect(plan.projectRef).toBe(EURO28_STAGING_PROJECT_REF)
    expect(plan.branch).toBe(STAGE16A_P6A_ALLOWED_BRANCH)
    expect(plan.sourceManifestVersion).toBe('stage16a-seed-manifest-dry-run-v1')
    expect(plan.sourcePreflightVersion).toBe('stage16a-staging-write-preflight-v1')
    expect(plan.plannedCounts.personas).toBe(19)
    expect(plan.plannedCounts.provisionalTeamSlots).toBe(24)
    expect(plan.plannedCounts.timePhaseCases).toBe(11)
    expect(plan.plannedCounts.leagues).toBe(3)
    expect(plan.competitions.original).toBe('original')
    expect(plan.competitions.koPredictor).toBe('ko_predictor')
    expect(plan.competitions.combinedTotal).toBe(false)
    expect(validateStage16aP6ASeedWriteAcceptancePlan(plan)).toBe(true)
  })

  it('defines exact local env names and later-slice write flags without reading values', () => {
    const plan = buildStage16aP6ASeedWriteAcceptancePlan()
    const envKeys = plan.requiredLocalEnv.map(item => item.key)

    expect(envKeys).toEqual(STAGE16A_P6A_REQUIRED_LOCAL_ENV_KEYS)
    for (const item of plan.requiredLocalEnv) {
      expect(item.valueRead).toBe(false)
      expect(item.valuePrinted).toBe(false)
      expect(item.requiredForLaterWriteSlice).toBe(true)
    }

    expect(plan.writeEnablementFlags).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'STAGE16A_ALLOW_STAGING_SEED_WRITE', requiredValue: 'true', laterWriteSliceOnly: true }),
      expect.objectContaining({ key: 'STAGE16A_SEED_TEARDOWN_CONFIRMATION', requiredValue: STAGE16A_P6A_TEARDOWN_CONFIRMATION, laterWriteSliceOnly: true }),
    ]))
    expect(plan.writeEnablementFlags.every(flag => flag.valueReadByP6A === false && flag.valuePrintedByP6A === false)).toBe(true)
  })

  it('requires exact dual-marker teardown and zero-residue proof', () => {
    const plan = buildStage16aP6ASeedWriteAcceptancePlan()

    expect(plan.syntheticMarkers.emailDomain).toBe('synthetic.euro28.test')
    expect(plan.syntheticMarkers.metadataMarker.synthetic_euro28).toBe(true)
    expect(plan.teardownSelector.emailSelector).toBe('@synthetic.euro28.test')
    expect(plan.teardownSelector.metadataMarker.synthetic_euro28).toBe(true)
    expect(plan.teardownSelector.requiresBothMarkers).toBe(true)
    expect(plan.teardownSelector.emailDomainOnlyAllowed).toBe(false)
    expect(plan.teardownSelector.metadataOnlyAllowed).toBe(false)
    expect(plan.zeroResidueTargets.map(target => target.key)).toEqual(expect.arrayContaining([
      'auth_users',
      'profiles',
      'prediction_sets',
      'match_predictions',
      'bracket_predictions',
      'prediction_points',
      'prediction_totals',
      'leagues',
      'provisional_team_slots',
    ]))
    expect(plan.zeroResidueTargets.every(target => target.expectedAfterTeardown === 0)).toBe(true)
  })

  it('requires reseed validation after zero residue', () => {
    const plan = buildStage16aP6ASeedWriteAcceptancePlan()

    expect(plan.reseedValidation.requiresFirstSeedValidation).toBe(true)
    expect(plan.reseedValidation.requiresTeardownBeforeReseed).toBe(true)
    expect(plan.reseedValidation.requiresZeroResidueBeforeReseed).toBe(true)
    expect(plan.reseedValidation.expectedDuplicateSyntheticRowsAfterReseed).toBe(0)
    expect(plan.reseedValidation.expectedCountsAfterFirstSeed).toEqual(plan.plannedCounts)
    expect(plan.reseedValidation.expectedCountsAfterReseed).toEqual(plan.plannedCounts)
    expect(plan.acceptanceSequence.map(step => step.key)).toEqual([
      'refuse_unsafe_context',
      'confirm_local_env_names',
      'confirm_write_enablement_flags',
      'seed_synthetic_only',
      'validate_first_seed',
      'teardown_synthetic_only',
      'prove_zero_residue',
      'reseed_same_manifest',
      'validate_reseed',
    ])
  })

  it('fails closed outside Euro staging or the development branch', () => {
    expect(buildStage16aP6ASeedWriteAcceptancePlan({
      projectRef: EURO28_STAGING_PROJECT_REF,
      branch: STAGE16A_P6A_ALLOWED_BRANCH,
    }).projectRef).toBe(EURO28_STAGING_PROJECT_REF)

    expect(() => buildStage16aP6ASeedWriteAcceptancePlan({
      projectRef: WC26_PRODUCTION_PROJECT_REF,
      branch: STAGE16A_P6A_ALLOWED_BRANCH,
    })).toThrow(/blocked against the WC26 production project/)

    expect(() => buildStage16aP6ASeedWriteAcceptancePlan({
      projectRef: 'random-project',
      branch: STAGE16A_P6A_ALLOWED_BRANCH,
    })).toThrow(/requires Euro staging project/)

    expect(() => buildStage16aP6ASeedWriteAcceptancePlan({
      projectRef: EURO28_STAGING_PROJECT_REF,
      branch: 'main',
    })).toThrow(/blocked on branch main/)

    expect(() => buildStage16aP6ASeedWriteAcceptancePlan({
      projectRef: EURO28_STAGING_PROJECT_REF,
      branch: 'feature/seed-write',
    })).toThrow(/requires branch euro28-development/)
  })
})
