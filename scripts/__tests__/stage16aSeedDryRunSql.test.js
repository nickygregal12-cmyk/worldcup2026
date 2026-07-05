import { describe, expect, it } from 'vitest'
import {
  EURO28_STAGING_PROJECT_REF,
  STAGE16A_P4_READ_ONLY_SQL_GUARD,
  STAGE16A_P4_SEED_DRY_RUN_SQL_VERSION,
  WC26_PRODUCTION_PROJECT_REF,
  assertStage16aP4ReadOnlySql,
  buildStage16aP4SeedDryRunPlan,
  buildStage16aP4SeedDryRunSql,
} from '../lib/stage16aSeedDryRunSql.mjs'

const MUTATING_SQL = /\b(insert|update|delete|merge|alter|drop|truncate|grant|revoke|copy|call|execute)\b/i

describe('Stage 16A-P4 seed SQL dry-run preview', () => {
  it('keeps the P4 guard read-only and non-writing', () => {
    expect(STAGE16A_P4_READ_ONLY_SQL_GUARD.stage).toBe('16A-P4')
    expect(STAGE16A_P4_READ_ONLY_SQL_GUARD.previewVersion).toBe(STAGE16A_P4_SEED_DRY_RUN_SQL_VERSION)
    expect(STAGE16A_P4_READ_ONLY_SQL_GUARD.readOnlySelectPreview).toBe(true)
    expect(STAGE16A_P4_READ_ONLY_SQL_GUARD.writesDatabase).toBe(false)
    expect(STAGE16A_P4_READ_ONLY_SQL_GUARD.createsUsers).toBe(false)
    expect(STAGE16A_P4_READ_ONLY_SQL_GUARD.seedsPredictions).toBe(false)
    expect(STAGE16A_P4_READ_ONLY_SQL_GUARD.requiresServiceRole).toBe(false)
    expect(STAGE16A_P4_READ_ONLY_SQL_GUARD.createsMigration).toBe(false)
    expect(STAGE16A_P4_READ_ONLY_SQL_GUARD.combinesCompetitions).toBe(false)
  })

  it('builds a staging-only plan from the P3 manifest counts', () => {
    const plan = buildStage16aP4SeedDryRunPlan()

    expect(plan.stage).toBe('16A-P4')
    expect(plan.projectRef).toBe(EURO28_STAGING_PROJECT_REF)
    expect(plan.readOnlySelectPreview).toBe(true)
    expect(plan.writesDatabase).toBe(false)
    expect(plan.createsUsers).toBe(false)
    expect(plan.seedsPredictions).toBe(false)
    expect(plan.requiresServiceRole).toBe(false)
    expect(plan.createsMigration).toBe(false)
    expect(plan.combinesCompetitions).toBe(false)
    expect(plan.plannedCounts.personas).toBe(19)
    expect(plan.plannedCounts.provisionalTeamSlots).toBe(24)
    expect(plan.plannedCounts.timePhaseCases).toBe(11)
    expect(plan.plannedCounts.leagues).toBe(3)
    expect(plan.competitions.original).toBe('original')
    expect(plan.competitions.koPredictor).toBe('ko_predictor')
    expect(plan.competitions.combinedTotal).toBe(false)
  })

  it('generates only a read-only SELECT preview', () => {
    const sql = buildStage16aP4SeedDryRunSql()

    expect(sql.trim().toLowerCase().startsWith('select')).toBe(true)
    expect(sql).toContain('16A-P4')
    expect(sql).toContain(STAGE16A_P4_SEED_DRY_RUN_SQL_VERSION)
    expect(sql).toContain('read_only_select_preview')
    expect(sql).toContain('writes_database')
    expect(sql).toContain('creates_users')
    expect(sql).toContain('seeds_predictions')
    expect(sql).toContain('original_competition_key')
    expect(sql).toContain('ko_predictor_competition_key')
    expect(sql).not.toMatch(MUTATING_SQL)
    expect(assertStage16aP4ReadOnlySql(sql)).toBe(true)
  })

  it('fails closed outside Euro staging and explicitly blocks WC26 production', () => {
    expect(buildStage16aP4SeedDryRunPlan({ projectRef: EURO28_STAGING_PROJECT_REF }).projectRef).toBe(EURO28_STAGING_PROJECT_REF)
    expect(() => buildStage16aP4SeedDryRunPlan({ projectRef: WC26_PRODUCTION_PROJECT_REF })).toThrow(/blocked against the WC26 production project/)
    expect(() => buildStage16aP4SeedDryRunSql({ projectRef: 'random-project' })).toThrow(/requires Euro staging project/)
  })

  it('rejects SQL text containing mutating statements', () => {
    expect(() => assertStage16aP4ReadOnlySql('insert into example values (1)')).toThrow(/blocked mutating token/)
    expect(() => assertStage16aP4ReadOnlySql('select 1; delete from example;')).toThrow(/blocked mutating token/)
    expect(() => assertStage16aP4ReadOnlySql('with x as (select 1) select * from x;')).toThrow(/must start with a read-only SELECT/)
  })
})
