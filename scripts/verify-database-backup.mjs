import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { REQUIRED_DUMP_FILES, EURO28_STAGING_REF } from './lib/databaseBackup.mjs'

function fail(message) {
  console.error(`Backup verification failed: ${message}`)
  process.exit(1)
}

const requestedPath = process.argv[2]
if (!requestedPath) fail('provide the backup directory path as the first argument.')

const backupDirectory = path.resolve(requestedPath)
const metadataPath = path.join(backupDirectory, 'backup-metadata.json')
const checksumsPath = path.join(backupDirectory, 'SHA256SUMS.txt')

if (!fs.existsSync(metadataPath)) fail('backup-metadata.json is missing.')
if (!fs.existsSync(checksumsPath)) fail('SHA256SUMS.txt is missing.')

let metadata
try {
  metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
} catch (error) {
  fail(`backup-metadata.json is invalid: ${error.message}`)
}

if (metadata?.source?.projectRef !== EURO28_STAGING_REF) {
  fail(`backup source is ${metadata?.source?.projectRef || '<unknown>'}, not Euro staging.`)
}

const checksumLines = fs.readFileSync(checksumsPath, 'utf8').trim().split('\n').filter(Boolean)
const expectedChecksums = new Map()
for (const line of checksumLines) {
  const match = line.match(/^([a-f0-9]{64})  (.+)$/)
  if (!match) fail(`invalid checksum line: ${line}`)
  expectedChecksums.set(match[2], match[1])
}

for (const filename of [...REQUIRED_DUMP_FILES, 'backup-metadata.json']) {
  const filePath = path.join(backupDirectory, filename)
  if (!fs.existsSync(filePath)) fail(`${filename} is missing.`)
  if (fs.statSync(filePath).size === 0) fail(`${filename} is empty.`)

  const expected = expectedChecksums.get(filename)
  if (!expected) fail(`${filename} has no checksum entry.`)

  const actual = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
  if (actual !== expected) fail(`${filename} checksum does not match.`)
}

console.log('Euro database backup verification passed.')
console.log(`Source project: ${metadata.source.projectRef}`)
console.log(`Created at: ${metadata.createdAtUtc}`)
console.log(`Git commit: ${metadata.source.gitCommit}`)
console.log(`Active migrations: ${metadata.source.migrationCount}`)
console.log(`Backup directory: ${backupDirectory}`)
