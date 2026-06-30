import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const projectRoot = path.resolve(path.dirname(scriptPath), '..')

const WC26_PRODUCTION_REF = 'ouhxawizadnwrhrjppld'
const EURO28_STAGING_REF = 'gcfdwobpnanjchcnvdco'
const BASELINE_FILENAME = '202606300001_euro28_core_tournament.sql'
const ACTIVE_MIGRATIONS_DIR = path.join(projectRoot, 'supabase', 'migrations')
const EURO_BASELINE_MIGRATION = path.join(ACTIVE_MIGRATIONS_DIR, BASELINE_FILENAME)
const ARCHIVED_WC26_MIGRATION = path.join(
  projectRoot,
  'supabase',
  'reference',
  'wc26-migrations',
  '202606270001_harden_prediction_writes.sql',
)
const SUPABASE_CONFIG = path.join(projectRoot, 'supabase', 'config.toml')
const SUPABASE_SEED = path.join(projectRoot, 'supabase', 'seed.sql')
const LINKED_PROJECT_FILE = path.join(projectRoot, 'supabase', '.temp', 'project-ref')

const errors = []

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

function relative(filePath) {
  return path.relative(projectRoot, filePath)
}

for (const relativePath of [
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
]) {
  const filePath = path.join(projectRoot, relativePath)
  const content = readIfPresent(filePath)

  if (!content) continue

  if (content.includes(WC26_PRODUCTION_REF)) {
    errors.push(`${relativePath} points at the WC26 production Supabase project.`)
  }

  const projectRefs = [
    ...content.matchAll(/https:\/\/([a-z0-9]{20})\.supabase\.co/gi),
  ].map((match) => match[1])

  for (const projectRef of projectRefs) {
    if (projectRef !== EURO28_STAGING_REF) {
      errors.push(
        `${relativePath} contains an unexpected Supabase project reference: ${projectRef}`,
      )
    }
  }
}

const linkedProjectRef = readIfPresent(LINKED_PROJECT_FILE)?.trim() ?? ''

if (linkedProjectRef === WC26_PRODUCTION_REF) {
  errors.push('The local Supabase link points at the WC26 production project.')
} else if (linkedProjectRef && linkedProjectRef !== EURO28_STAGING_REF) {
  errors.push(
    `The local Supabase link points at unexpected project ${linkedProjectRef}.`,
  )
}

const activeMigrationFiles = listFilesRecursively(ACTIVE_MIGRATIONS_DIR)
  .filter((filePath) => filePath.endsWith('.sql'))
  .sort((left, right) => path.basename(left).localeCompare(path.basename(right)))

if (activeMigrationFiles.length === 0) {
  errors.push('No active Euro migrations were found.')
}

if (!fs.existsSync(EURO_BASELINE_MIGRATION)) {
  errors.push(`The required Euro baseline migration is missing: ${BASELINE_FILENAME}`)
}

const migrationVersions = new Set()
const migrationFilenamePattern = /^(\d{12})_[a-z0-9_]+\.sql$/
const blockedActiveTerms = [
  WC26_PRODUCTION_REF,
  'fifa_v2',
  '2026-06-18',
  'match_number between 73 and 88',
  'maximum of 8 group-stage jokers',
]

for (const migrationPath of activeMigrationFiles) {
  const filename = path.basename(migrationPath)
  const filenameMatch = filename.match(migrationFilenamePattern)

  if (!filenameMatch) {
    errors.push(
      `${relative(migrationPath)} does not use the required timestamp_name.sql format.`,
    )
  } else if (migrationVersions.has(filenameMatch[1])) {
    errors.push(`Duplicate migration version found: ${filenameMatch[1]}`)
  } else {
    migrationVersions.add(filenameMatch[1])
  }

  const content = fs.readFileSync(migrationPath, 'utf8').toLowerCase()

  for (const term of blockedActiveTerms) {
    if (content.includes(term.toLowerCase())) {
      errors.push(
        `${relative(migrationPath)} contains inherited WC26 term: ${term}`,
      )
    }
  }
}

if (
  activeMigrationFiles.length > 0
  && path.basename(activeMigrationFiles[0]) !== BASELINE_FILENAME
) {
  errors.push('The Euro core migration must remain the first active migration.')
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

if (baseline) {
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
    errors.push('The baseline migration must not add browser write policies.')
  }

  if (/using\s*\(\s*true\s*\)/i.test(baseline)) {
    errors.push('The baseline migration contains an unconditional RLS read policy.')
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
console.log(`Baseline migration: ${BASELINE_FILENAME}`)
console.log(
  linkedProjectRef
    ? `Linked staging project: ${linkedProjectRef}`
    : 'Linked staging project: not linked in this working copy',
)
console.log('WC26 production project reference: blocked')
console.log('Browser write policies in baseline: none')
