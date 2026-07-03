import process from 'node:process'
import { describe, expect, it } from 'vitest'
import {
  buildReconciliationVerificationSql,
  buildRoleTransactionSql,
  normaliseAcceptanceAction,
  resolveAcceptanceOutputPath,
} from '../lib/stage13fk3AcceptanceSql.mjs'

describe('Stage 13F-K3 acceptance SQL', () => {
  it('accepts only the two published actions', () => {
    expect(normaliseAcceptanceAction('role-transaction')).toBe('role-transaction')
    expect(normaliseAcceptanceAction('reconciliation-verify')).toBe('reconciliation-verify')
    expect(() => normaliseAcceptanceAction('fixture-write')).toThrow(/--action/)
  })

  it('builds rollback-safe role evidence from three distinct staging accounts', () => {
    const sql = buildRoleTransactionSql({
      ownerEmail: 'owner@example.com',
      resultsEmail: 'results@example.com',
      memberEmail: 'member@example.com',
    })

    expect(sql).toContain("Project ref: gcfdwobpnanjchcnvdco")
    expect(sql).toContain("where code = 'euro-2028'")
    expect(sql).toContain("admin_role = 'owner'")
    expect(sql).toContain("admin_role = 'results_admin'")
    expect(sql).toContain('Tournament owner access is required')
    expect(sql).toContain('Tournament administrator access is required')
    expect(sql).toContain('context_row.kickoff_at')
    expect(sql).toContain('context_row.scheduled_date')
    expect(sql).toContain('rollback;')
    expect(sql).toContain('Fixture transaction did not roll back')
    expect(sql).not.toContain('make_timestamptz')
    expect(sql).not.toContain('admin_apply_global_lock')
    expect(sql).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
  })

  it('rejects reused acceptance identities', () => {
    expect(() => buildRoleTransactionSql({
      ownerEmail: 'same@example.com',
      resultsEmail: 'same@example.com',
      memberEmail: 'member@example.com',
    })).toThrow(/must be distinct/)
  })

  it('builds read-only reconciliation evidence for an exact note', () => {
    const sql = buildReconciliationVerificationSql({
      note: 'Stage 13F-K3 complete staging reconciliation acceptance',
    })

    expect(sql).toContain("operation_type = 'tournament_points_reconciled'")
    expect(sql).toContain("run.status")
    expect(sql).toContain("competition_key not in ('original', 'ko_predictor')")
    expect(sql).toContain('PASS — completed run')
    expect(sql).not.toContain('admin_reconcile_tournament_points(')
    expect(sql).not.toMatch(/\binsert\s+into\b/i)
    expect(sql).not.toMatch(/\bupdate\s+public\./i)
    expect(sql).not.toMatch(/\bdelete\s+from\b/i)
  })

  it('refuses to write generated SQL inside the repository', () => {
    expect(() => resolveAcceptanceOutputPath('./acceptance.sql', process.cwd()))
      .toThrow(/inside the repository/)
    expect(resolveAcceptanceOutputPath('/tmp/euro28-stage13fk3.sql', process.cwd()))
      .toBe('/tmp/euro28-stage13fk3.sql')
  })
})
