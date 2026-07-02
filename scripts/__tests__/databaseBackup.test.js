import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  EURO28_STAGING_REF,
  REQUIRED_DUMP_FILES,
  assertOutputRootOutsideProject,
  buildBackupDirectoryName,
  buildBackupMetadata,
  buildDumpPlan,
  normaliseBackupLabel,
  parseBackupArgs,
  timestampForDirectory,
} from '../lib/databaseBackup.mjs'

describe('Euro staging database backup helpers', () => {
  it('normalises safe labels', () => {
    expect(normaliseBackupLabel('Pre-Migration-015')).toBe('pre-migration-015')
  })

  it('rejects labels that could create unsafe paths', () => {
    expect(() => normaliseBackupLabel('../staging')).toThrow(/only lowercase letters/)
    expect(() => normaliseBackupLabel('migration 015')).toThrow(/only lowercase letters/)
  })

  it('parses a plan with an explicit output root', () => {
    expect(parseBackupArgs(['--plan', '--label', 'before-015', '--output-root', '/tmp/euro-backups'])).toEqual({
      label: 'before-015',
      outputRoot: path.resolve('/tmp/euro-backups'),
      planOnly: true,
    })
  })

  it('formats stable UTC directory timestamps', () => {
    expect(timestampForDirectory(new Date('2026-07-02T18:04:05.000Z'))).toBe('20260702T180405Z')
  })

  it('builds an auditable directory name', () => {
    expect(buildBackupDirectoryName({
      createdAt: new Date('2026-07-02T18:04:05.000Z'),
      commitShort: '505d31abcdef1234',
      label: 'pre-migration-015',
    })).toBe('20260702T180405Z-505d31ab-pre-migration-015')
  })

  it('blocks backup output inside the repository', () => {
    expect(() => assertOutputRootOutsideProject('/Users/nicky/project', '/Users/nicky/project/backups')).toThrow(/outside/)
    expect(assertOutputRootOutsideProject('/Users/nicky/project', '/Users/nicky/Euro28Backups')).toBe('/Users/nicky/Euro28Backups')
  })

  it('creates the complete linked Supabase dump plan', () => {
    const plan = buildDumpPlan('/private/backups/example')

    expect(plan.map(step => step.filename)).toEqual(REQUIRED_DUMP_FILES)
    expect(plan).toHaveLength(5)
    plan.forEach(step => expect(step.args).toContain('--linked'))
    expect(plan.find(step => step.key === 'data').args).toEqual(expect.arrayContaining([
      '--data-only',
      '--use-copy',
      '--exclude',
      'storage.buckets_vectors',
      'storage.vector_indexes',
    ]))
    expect(plan.find(step => step.key === 'migration-history-data').args).toEqual(expect.arrayContaining([
      '--schema',
      'supabase_migrations',
      '--data-only',
    ]))
  })

  it('records the source, scope and checksums without secrets', () => {
    const metadata = buildBackupMetadata({
      createdAt: new Date('2026-07-02T18:04:05.000Z'),
      projectRef: EURO28_STAGING_REF,
      branch: 'euro28-development',
      gitCommit: '505d31abcdef1234',
      workingTreeClean: true,
      migrationCount: 14,
      supabaseCliVersion: '2.50.0',
      files: { 'schema.sql': { bytes: 100, sha256: 'a'.repeat(64) } },
    })

    expect(metadata.source).toMatchObject({
      projectRef: EURO28_STAGING_REF,
      branch: 'euro28-development',
      migrationCount: 14,
    })
    expect(metadata.tooling.engine).toBe('pg_dump via Supabase CLI')
    expect(metadata.scope.excludes).toContain('Supabase-managed Auth schema and identities')
    expect(JSON.stringify(metadata)).not.toMatch(/password|token|secret-role/i)
  })
})
