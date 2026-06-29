import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const projectRoot = path.resolve(path.dirname(scriptPath), '..')

const WC26_PRODUCTION_REF = 'ouhxawizadnwrhrjppld'
const EURO28_STAGING_REF = 'gcfdwobpnanjchcnvdco'
const ACTIVE_MIGRATIONS_DIR = path.join(projectRoot, 'supabase', 'migrations')
const ARCHIVED_WC26_MIGRATION = path.join(
  projectRoot,
  'supabase',
  'reference',
  'wc26-migrations',
  '202606270001_harden_prediction_writes.sql',
)
const EURO_BASELINE_MIGRATION = path.join(
  ACTIVE_MIGRATIONS_DIR,
  '202606300001_euro28_core_tournament.sql',
)
const SUPABASE_CONFIG = path.join(projectRoot, 'supabase', 'config.toml')
const SUPABASE_SEED = path.join(projectRoot, 'supabase', 'seed.sql')

const errors = []
const warnings = []

function readIfPresent(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null
}

function listFilesRecursively(directory) {
  if (!fs.existsSync(directory)) return []

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    return entry.isDirectory() ? listFilesRecursively(entryPath) : [entryPath]
  })
}

for (const relativePath of [
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  'supabase/.temp/project-ref',
  'supabase/config.toml',
]) {
  const filePath = path.join(projectRoot, relativePath)
  const content = readIfPresent(filePath)

  if (content?.includes(WC26_PRODUCTION_REF)) {
    errors.push(`${relativePath} points at the WC26 production Supabase project.`)
  }

  if (
    relativePath === 'supabase/.temp/project-ref'
    && content
    && !content.includes(EURO28_STAGING_REF)
  ) {
    warnings.push(
      'The linked Supabase project is not the known Euro staging project. Verify it before any db push.',
    )
  }
}

const activeMigrationFiles = listFilesRecursively(ACTIVE_MIGRATIONS_DIR)
  .filter((filePath) => filePath.endsWith('.sql'))

if (activeMigrationFiles.length !== 1) {
  errors.push(
    `Expected exactly one active Euro migration, found ${activeMigrationFiles.length}.`,
  )
}

const blockedActiveTerms = [
  WC26_PRODUCTION_REF,
  'fifa_v2',
  '2026-06-18',
  'match_number between 73 and 88',
  'maximum of 8 group-stage jokers',
]

for (const migrationPath of activeMigrationFiles) {
  const content = fs.readFileSync(migrationPath, 'utf8').toLowerCase()
  for (const term of blockedActiveTerms) {
    if (content.includes(term.toLowerCase())) {
      errors.push(
        `${path.relative(projectRoot, migrationPath)} contains inherited WC26 term: ${term}`,
      )
    }
  }
}

if (!fs.existsSync(ARCHIVED_WC26_MIGRATION)) {
  errors.push('The inherited WC26 hardening migration is not preserved in reference storage.')
}

if (!fs.existsSync(SUPABASE_CONFIG)) {
  errors.push('supabase/config.toml is missing. Local database validation cannot run.')
}

if (!fs.existsSync(SUPABASE_SEED)) {
  errors.push('supabase/seed.sql is missing. Local resets would not be reproducible.')
}

const baseline = readIfPresent(EURO_BASELINE_MIGRATION)
if (!baseline) {
  errors.push('The Euro core tournament migration is missing.')
} else {
  const requiredTables = [
    'tournaments',
    'teams',
    'tournament_teams',
    'venues',
    'tournament_venues',
    'tournament_stages',
    'groups',
    'group_memberships',
    'matches',
    'match_slots',
  ]

  for (const table of requiredTables) {
    if (!baseline.includes(`create table public.${table}`)) {
      errors.push(`The Euro baseline does not create public.${table}.`)
    }

    if (!baseline.includes(`alter table public.${table} enable row level security`)) {
      errors.push(`RLS is not enabled for public.${table}.`)
    }
  }

  if (/for\s+(insert|update|delete|all)\s+to\s+(anon|authenticated)/i.test(baseline)) {
    errors.push('The first migration must not add browser write policies.')
  }

  if (/using\s*\(\s*true\s*\)/i.test(baseline)) {
    errors.push('The first migration contains an unconditional RLS read policy.')
  }
}

if (warnings.length > 0) {
  for (const warning of warnings) {
    console.warn(`Database safety warning: ${warning}`)
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`Database safety error: ${error}`)
  }
  process.exit(1)
}

console.log('Database safety checks passed.')
console.log(`Active migrations: ${activeMigrationFiles.length}`)
console.log('WC26 production project reference: blocked')
console.log('Browser write policies in baseline: none')
