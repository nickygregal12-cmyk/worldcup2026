import { describe, expect, it } from 'vitest'
import {
  assertSafeOutputPath,
  buildStagingAdminSql,
  normaliseEmail,
} from '../lib/stagingAdminSql.mjs'

describe('staging administrator SQL generator', () => {
  it('normalises the target email', () => {
    expect(normaliseEmail(' NickyGregal12@GMAIL.com ')).toBe('nickygregal12@gmail.com')
  })

  it('builds an explicit owner grant with guards and audit function', () => {
    const sql = buildStagingAdminSql({
      action: 'grant',
      email: 'nickygregal12@gmail.com',
      role: 'owner',
      note: 'Explicit product-owner staging grant for Stage 13 testing',
    })

    expect(sql).toContain("where code = 'euro-2028'")
    expect(sql).toContain("where lower(email) = lower('nickygregal12@gmail.com')")
    expect(sql).toContain('private.euro28_set_tournament_admin')
    expect(sql).toContain("'owner'")
    expect(sql).toContain('true,')
    expect(sql).toContain("event.operation_type in ('admin_granted', 'admin_revoked')")
    expect(sql).not.toContain('service_role')
  })

  it('builds a revoke using the stored current role', () => {
    const sql = buildStagingAdminSql({
      action: 'revoke',
      email: 'nickygregal12@gmail.com',
      note: 'Revoke product-owner staging access after testing',
    })

    expect(sql).toContain('v_current_role text')
    expect(sql).toContain('v_current_role,')
    expect(sql).toContain('false,')
    expect(sql).toContain('No tournament administrator assignment exists')
  })

  it('builds a read-only verification query', () => {
    const sql = buildStagingAdminSql({
      action: 'verify',
      email: 'nickygregal12@gmail.com',
    })

    expect(sql).toContain('join private.tournament_admins assignment')
    expect(sql).toContain('from public.admin_operation_events event')
    expect(sql).not.toContain('euro28_set_tournament_admin')
    expect(sql).not.toContain('begin;')
  })

  it('escapes apostrophes in audit notes', () => {
    const sql = buildStagingAdminSql({
      action: 'grant',
      email: 'nickygregal12@gmail.com',
      role: 'owner',
      note: "Nicky's explicit staging admin grant",
    })
    expect(sql).toContain("Nicky''s explicit staging admin grant")
  })

  it('refuses generated SQL inside the repository', () => {
    expect(() => assertSafeOutputPath('/repo/admin.sql', '/repo')).toThrow(
      'Refusing to write generated admin SQL inside the repository',
    )
    expect(assertSafeOutputPath('/tmp/admin.sql', '/repo')).toBe('/tmp/admin.sql')
  })
})
