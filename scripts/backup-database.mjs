import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  EURO28_BRANCH,
  EURO28_STAGING_REF,
  REQUIRED_DUMP_FILES,
  assertOutputRootOutsideProject,
  buildBackupDirectoryName,
  buildBackupMetadata,
  buildDumpPlan,
  parseBackupArgs,
} from './lib/databaseBackup.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const linkedProjectFile = path.join(projectRoot, 'supabase', '.temp', 'project-ref')
const migrationsDirectory = path.join(projectRoot, 'supabase', 'migrations')

function fail(message) {
  console.error(`Euro database backup failed: ${message}`)
  process.exit(1)
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || projectRoot,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    env: process.env,
  })

  if (result.error) throw result.error
  if (result.status !== 0) {
    const detail = options.capture ? (result.stderr || result.stdout || '').trim() : ''
    throw new Error(`${command} ${args.join(' ')} exited with code ${result.status}${detail ? `: ${detail}` : ''}`)
  }

  return options.capture ? (result.stdout || '').trim() : ''
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

function fileMetadata(filePath) {
  const stats = fs.statSync(filePath)
  if (!stats.isFile() || stats.size === 0) {
    throw new Error(`${path.basename(filePath)} was not created or is empty.`)
  }

  return {
    bytes: stats.size,
    sha256: sha256(filePath),
  }
}

function countMigrations() {
  return fs.readdirSync(migrationsDirectory).filter(filename => filename.endsWith('.sql')).length
}

function ensurePreconditions(outputRoot) {
  const branch = run('git', ['branch', '--show-current'], { capture: true })
  if (branch !== EURO28_BRANCH) {
    throw new Error(`expected branch ${EURO28_BRANCH}, found ${branch || '<none>'}.`)
  }

  if (!fs.existsSync(linkedProjectFile)) {
    throw new Error('supabase/.temp/project-ref is missing. Link the Euro staging project first.')
  }

  const linkedRef = fs.readFileSync(linkedProjectFile, 'utf8').trim()
  if (linkedRef !== EURO28_STAGING_REF) {
    throw new Error(`linked project ${linkedRef || '<empty>'} is not Euro staging ${EURO28_STAGING_REF}.`)
  }

  assertOutputRootOutsideProject(projectRoot, outputRoot)

  run('docker', ['info'], { capture: true })

  const gitCommit = run('git', ['rev-parse', 'HEAD'], { capture: true })
  const workingTreeClean = run('git', ['status', '--porcelain'], { capture: true }) === ''
  const supabaseCliVersion = run('npx', ['supabase', '--version'], { capture: true })

  return {
    branch,
    linkedRef,
    gitCommit,
    workingTreeClean,
    supabaseCliVersion,
  }
}

function printPlan({ backupDirectory, dumpPlan, preconditions, migrationCount }) {
  console.log('Euro staging backup plan')
  console.log(`Project: ${preconditions.linkedRef}`)
  console.log(`Branch: ${preconditions.branch}`)
  console.log(`Git commit: ${preconditions.gitCommit}`)
  console.log(`Working tree clean: ${preconditions.workingTreeClean ? 'yes' : 'no'}`)
  console.log(`Active migrations: ${migrationCount}`)
  console.log(`Destination: ${backupDirectory}`)
  console.log('Dump engine: pg_dump via Supabase CLI')
  console.log('Planned files:')
  dumpPlan.forEach(step => console.log(`- ${step.filename}`))
  console.log('Managed Auth/Storage internals and stored objects are not included.')
}

let options
try {
  options = parseBackupArgs(process.argv.slice(2))
} catch (error) {
  fail(error.message)
}

let preconditions
try {
  preconditions = ensurePreconditions(options.outputRoot)
} catch (error) {
  fail(error.message)
}

const createdAt = new Date()
const migrationCount = countMigrations()
const backupDirectory = path.join(
  options.outputRoot,
  buildBackupDirectoryName({
    createdAt,
    commitShort: preconditions.gitCommit,
    label: options.label,
  }),
)
const dumpPlan = buildDumpPlan(backupDirectory)

printPlan({ backupDirectory, dumpPlan, preconditions, migrationCount })

if (options.planOnly) {
  console.log('Plan only: no backup files were written.')
  process.exit(0)
}

if (fs.existsSync(backupDirectory)) {
  fail(`backup destination already exists: ${backupDirectory}`)
}

try {
  fs.mkdirSync(options.outputRoot, { recursive: true, mode: 0o700 })
  fs.chmodSync(options.outputRoot, 0o700)
  fs.mkdirSync(backupDirectory, { recursive: false, mode: 0o700 })
  fs.chmodSync(backupDirectory, 0o700)

  for (const step of dumpPlan) {
    console.log(`Creating ${step.filename}...`)
    run('npx', step.args)
  }

  const files = {}
  for (const filename of REQUIRED_DUMP_FILES) {
    const filePath = path.join(backupDirectory, filename)
    fs.chmodSync(filePath, 0o600)
    files[filename] = fileMetadata(filePath)
  }

  const metadata = buildBackupMetadata({
    createdAt,
    projectRef: preconditions.linkedRef,
    branch: preconditions.branch,
    gitCommit: preconditions.gitCommit,
    workingTreeClean: preconditions.workingTreeClean,
    migrationCount,
    supabaseCliVersion: preconditions.supabaseCliVersion,
    files,
  })

  const metadataPath = path.join(backupDirectory, 'backup-metadata.json')
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, { mode: 0o600 })
  fs.chmodSync(metadataPath, 0o600)

  const checksumFiles = [...REQUIRED_DUMP_FILES, 'backup-metadata.json']
  const checksumText = checksumFiles
    .map(filename => `${sha256(path.join(backupDirectory, filename))}  ${filename}`)
    .join('\n')
  const checksumsPath = path.join(backupDirectory, 'SHA256SUMS.txt')
  fs.writeFileSync(checksumsPath, `${checksumText}\n`, { mode: 0o600 })
  fs.chmodSync(checksumsPath, 0o600)

  run('shasum', ['-a', '256', '-c', 'SHA256SUMS.txt'], {
    capture: false,
    cwd: backupDirectory,
  })

  console.log('Euro staging backup completed successfully.')
  console.log(`Backup directory: ${backupDirectory}`)
  console.log(`Active migrations recorded: ${migrationCount}`)
  console.log('Checksum verification: passed')
  console.log('Keep this directory private and outside Git.')
} catch (error) {
  fs.rmSync(backupDirectory, { recursive: true, force: true })
  fail(`${error.message} Partial backup files were removed.`)
}
