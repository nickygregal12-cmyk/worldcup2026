import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const requiredFiles = [
  'scripts/backup-database.mjs',
  'scripts/verify-database-backup.mjs',
  'scripts/lib/databaseBackup.mjs',
  'scripts/__tests__/databaseBackup.test.js',
  'docs/DATABASE-BACKUP-AND-RESTORE.md',
]
const errors = []

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(projectRoot, relativePath))) {
    errors.push(`missing ${relativePath}`)
  }
}

const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))
for (const scriptName of ['db:backup', 'db:backup:verify', 'audit:backup']) {
  if (!packageJson.scripts?.[scriptName]) errors.push(`package.json is missing ${scriptName}`)
}

if (!packageJson.scripts?.check?.includes('audit:backup')) {
  errors.push('npm run check does not include audit:backup')
}

const backupSource = fs.readFileSync(path.join(projectRoot, 'scripts/backup-database.mjs'), 'utf8')
const helperSource = fs.readFileSync(path.join(projectRoot, 'scripts/lib/databaseBackup.mjs'), 'utf8')
const documentation = fs.readFileSync(path.join(projectRoot, 'docs/DATABASE-BACKUP-AND-RESTORE.md'), 'utf8')

for (const requiredText of [
  'gcfdwobpnanjchcnvdco',
  'euro28-development',
  'supabase/.temp/project-ref',
  'SHA256SUMS.txt',
  'backup-metadata.json',
]) {
  if (!`${backupSource}\n${helperSource}`.includes(requiredText)) {
    errors.push(`backup implementation is missing required guard or output: ${requiredText}`)
  }
}

for (const destructivePattern of [
  /db\s+reset\s+--linked/i,
  /db\s+push/i,
  /drop\s+database/i,
  /delete\s+project/i,
]) {
  if (destructivePattern.test(backupSource)) {
    errors.push(`backup script contains destructive database operation: ${destructivePattern}`)
  }
}

for (const requiredPhrase of [
  'before every future hosted migration',
  'Auth',
  'Storage',
  'disposable',
  'never restore directly over Euro staging as the first test',
]) {
  if (!documentation.toLowerCase().includes(requiredPhrase.toLowerCase())) {
    errors.push(`backup documentation is missing required guidance: ${requiredPhrase}`)
  }
}

if (errors.length) {
  console.error('Euro backup and restore audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro backup and restore audit passed.')
console.log('Source guard: linked Euro staging project only')
console.log('Dump engine: pg_dump via Supabase CLI')
console.log('Backup set: roles, schema, data and migration history')
console.log('Storage: private directory outside Git with SHA-256 verification')
console.log('Restore policy: rehearse against a disposable destination first')
