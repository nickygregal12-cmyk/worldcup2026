import { describe, expect, it } from 'vitest'
import {
  EURO28_STAGING_PROJECT_REF,
  STAGE16A_P6B_ALLOWED_BRANCH,
  STAGE16A_P6B_BLOCKED_COMMANDS,
  STAGE16A_P6B_EXECUTOR_PREPARATION_VERSION,
  STAGE16A_P6B_NO_WRITE_GUARD,
  STAGE16A_P6B_REQUIRED_LOCAL_ENV_KEYS,
  WC26_PRODUCTION_PROJECT_REF,
  buildStage16aP6BSeedWriteExecutorPreparation,
  validateStage16aP6BSeedWriteExecutorPreparation,
} from '../lib/stage16aSeedWriteExecutorPreparation.mjs'

describe('Stage 16A-P6B seed write executor preparation', () => {
  it('keeps P6B as executor preparation with no write executor', () => {
    expect(STAGE16A_P6B_NO_WRITE_GUARD.stage).toBe('16A-P6B')
    expect(STAGE16A_P6B_NO_WRITE_GUARD.executorPreparationVersion).toBe(STAGE16A_P6B_EXECUTOR_PREPARATION_VERSION)
    expect(STAGE16A_P6B_NO_WRITE_GUARD.writesDatabase).toBe(false)
    expect(STAGE16A_P6B_NO_WRITE_GUARD.createsUsers).toBe(false)
    expect(STAGE16A_P6B_NO_WRITE_GUARD.seedsProvisionalTeams).toBe(false)
    expect(STAGE16A_P6B_NO_WRITE_GUARD.seedsPredictions).toBe(false)
    expect(STAGE16A_P6B_NO_WRITE_GUARD.seedsLeagues).toBe(false)
    expect(STAGE16A_P6B_NO_WRITE_GUARD.usesServiceRoleCredential).toBe(false)
    expect(STAGE16A_P6B_NO_WRITE_GUARD.readsServiceRoleCredential).toBe(false)
    expect(STAGE16A_P6B_NO_WRITE_GUARD.canStartWrite).toBe(false)
    expect(STAGE16A_P6B_NO_WRITE_GUARD.hasWriteExecutor).toBe(false)
    expect(STAGE16A_P6B_NO_WRITE_GUARD.exposesWriteCommand).toBe(false)
  })

  it('inherits the P6A acceptance counts, env names and safety boundary', () => {
    const plan = buildStage16aP6BSeedWriteExecutorPreparation()

    expect(plan.stage).toBe('16A-P6B')
    expect(plan.projectRef).toBe(EURO28_STAGING_PROJECT_REF)
    expect(plan.branch).toBe(STAGE16A_P6B_ALLOWED_BRANCH)
    expect(plan.sourceAcceptancePlanVersion).toBe('stage16a-seed-write-acceptance-plan-v1')
    expect(plan.plannedCounts).toEqual(expect.objectContaining({ personas: 19, provisionalTeamSlots: 24, timePhaseCases: 11, leagues: 3 }))
    expect(plan.requiredLocalEnv.map(item => item.key)).toEqual(STAGE16A_P6B_REQUIRED_LOCAL_ENV_KEYS)
    expect(plan.requiredLocalEnv.every(item => item.valueRead === false && item.valuePrinted === false)).toBe(true)
    expect(validateStage16aP6BSeedWriteExecutorPreparation(plan)).toBe(true)
  })

  it('defines planned executor modules but keeps every module non-executable', () => {
    const plan = buildStage16aP6BSeedWriteExecutorPreparation()

    expect(plan.plannedExecutorModules.map(module => module.key)).toEqual([
      'context_guard',
      'synthetic_user_writer',
      'provisional_team_writer',
      'prediction_seed_writer',
      'league_seed_writer',
      'seed_validator',
      'synthetic_teardown',
      'reseed_validator',
    ])
    expect(plan.plannedExecutorModules.every(module => module.executableInP6B === false)).toBe(true)
    expect(plan.blockedCommands).toEqual(STAGE16A_P6B_BLOCKED_COMMANDS)
  })

  it('preserves dual-marker teardown, zero residue and reseed proof', () => {
    const plan = buildStage16aP6BSeedWriteExecutorPreparation()

    expect(plan.syntheticMarkers.emailDomain).toBe('synthetic.euro28.test')
    expect(plan.syntheticMarkers.metadataMarker.synthetic_euro28).toBe(true)
    expect(plan.teardownSelector.requiresBothMarkers).toBe(true)
    expect(plan.teardownSelector.emailDomainOnlyAllowed).toBe(false)
    expect(plan.teardownSelector.metadataOnlyAllowed).toBe(false)
    expect(plan.zeroResidueTargets.every(target => target.expectedAfterTeardown === 0)).toBe(true)
    expect(plan.reseedValidation.expectedDuplicateSyntheticRowsAfterReseed).toBe(0)
  })

  it('keeps Original Predictor and KO Predictor separate', () => {
    const plan = buildStage16aP6BSeedWriteExecutorPreparation()

    expect(plan.competitions.original).toBe('original')
    expect(plan.competitions.koPredictor).toBe('ko_predictor')
    expect(plan.competitions.combinedTotal).toBe(false)
    expect(plan.combinesCompetitions).toBe(false)
  })

  it('fails closed outside Euro staging or the development branch', () => {
    expect(() => buildStage16aP6BSeedWriteExecutorPreparation({
      projectRef: WC26_PRODUCTION_PROJECT_REF,
      branch: STAGE16A_P6B_ALLOWED_BRANCH,
    })).toThrow(/blocked against the WC26 production project/)

    expect(() => buildStage16aP6BSeedWriteExecutorPreparation({
      projectRef: 'random-project',
      branch: STAGE16A_P6B_ALLOWED_BRANCH,
    })).toThrow(/requires Euro staging project/)

    expect(() => buildStage16aP6BSeedWriteExecutorPreparation({
      projectRef: EURO28_STAGING_PROJECT_REF,
      branch: 'main',
    })).toThrow(/requires branch euro28-development/)
  })
})
