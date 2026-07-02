import os from 'node:os'
import path from 'node:path'

export const EURO28_STAGING_REF = 'gcfdwobpnanjchcnvdco'
export const EURO28_BRANCH = 'euro28-development'
export const BACKUP_FORMAT_VERSION = 1
export const REQUIRED_DUMP_FILES = Object.freeze([
  'roles.sql',
  'schema.sql',
  'data.sql',
  'migration-history-schema.sql',
  'migration-history-data.sql',
])

export function parseBackupArgs(argv) {
  const options = {
    label: 'manual',
    outputRoot: process.env.EURO28_BACKUP_ROOT || path.join(os.homedir(), 'Euro28Backups', 'euro28-staging'),
    planOnly: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]

    if (argument === '--plan') {
      options.planOnly = true
      continue
    }

    if (argument === '--label') {
      options.label = argv[index + 1]
      index += 1
      continue
    }

    if (argument === '--output-root') {
      options.outputRoot = argv[index + 1]
      index += 1
      continue
    }

    throw new Error(`Unknown backup option: ${argument}`)
  }

  options.label = normaliseBackupLabel(options.label)
  if (!options.outputRoot) throw new Error('Backup output root is required.')
  options.outputRoot = path.resolve(options.outputRoot)

  return options
}

export function normaliseBackupLabel(label) {
  if (typeof label !== 'string' || label.trim() === '') {
    throw new Error('Backup label must be a non-empty string.')
  }

  const normalised = label.trim().toLowerCase()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalised)) {
    throw new Error('Backup label may contain only lowercase letters, numbers and single hyphens.')
  }

  if (normalised.length > 60) {
    throw new Error('Backup label must be 60 characters or fewer.')
  }

  return normalised
}

export function timestampForDirectory(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.valueOf())) {
    throw new Error('A valid date is required for the backup timestamp.')
  }

  return date.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[-:]/g, '')
}

export function buildBackupDirectoryName({ createdAt, commitShort, label }) {
  const safeCommit = String(commitShort || '').trim().toLowerCase()
  if (!/^[a-f0-9]{7,40}$/.test(safeCommit)) {
    throw new Error('A valid Git commit hash is required for the backup directory.')
  }

  return `${timestampForDirectory(createdAt)}-${safeCommit.slice(0, 8)}-${normaliseBackupLabel(label)}`
}

export function assertOutputRootOutsideProject(projectRoot, outputRoot) {
  const project = path.resolve(projectRoot)
  const output = path.resolve(outputRoot)
  const relation = path.relative(project, output)

  if (relation === '' || (!relation.startsWith('..') && !path.isAbsolute(relation))) {
    throw new Error('Backup output must be outside the Git repository.')
  }

  return output
}

export function buildDumpPlan(backupDirectory) {
  const destination = filename => path.join(backupDirectory, filename)
  const linkedBase = ['supabase', 'db', 'dump', '--linked']

  return [
    {
      key: 'roles',
      filename: 'roles.sql',
      args: [...linkedBase, '--file', destination('roles.sql'), '--role-only'],
    },
    {
      key: 'schema',
      filename: 'schema.sql',
      args: [...linkedBase, '--file', destination('schema.sql')],
    },
    {
      key: 'data',
      filename: 'data.sql',
      args: [
        ...linkedBase,
        '--file', destination('data.sql'),
        '--data-only',
        '--use-copy',
        '--exclude', 'storage.buckets_vectors',
        '--exclude', 'storage.vector_indexes',
      ],
    },
    {
      key: 'migration-history-schema',
      filename: 'migration-history-schema.sql',
      args: [
        ...linkedBase,
        '--file', destination('migration-history-schema.sql'),
        '--schema', 'supabase_migrations',
      ],
    },
    {
      key: 'migration-history-data',
      filename: 'migration-history-data.sql',
      args: [
        ...linkedBase,
        '--file', destination('migration-history-data.sql'),
        '--schema', 'supabase_migrations',
        '--data-only',
        '--use-copy',
      ],
    },
  ]
}

export function buildBackupMetadata({
  createdAt,
  projectRef,
  branch,
  gitCommit,
  workingTreeClean,
  migrationCount,
  supabaseCliVersion,
  files,
}) {
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAtUtc: createdAt.toISOString(),
    source: {
      projectRef,
      branch,
      gitCommit,
      workingTreeClean,
      migrationCount,
    },
    tooling: {
      engine: 'pg_dump via Supabase CLI',
      supabaseCliVersion,
    },
    scope: {
      type: 'logical application database backup',
      includes: [
        'custom roles',
        'application schema',
        'application table data',
        'Supabase migration history',
      ],
      excludes: [
        'Supabase-managed Auth schema and identities',
        'Supabase-managed Storage schema and stored objects',
        'project secrets and provider configuration',
        'extension-managed schemas excluded by Supabase CLI',
      ],
    },
    files,
  }
}
