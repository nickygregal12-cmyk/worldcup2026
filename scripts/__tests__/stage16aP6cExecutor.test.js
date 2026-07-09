import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import {
  BACKUP_CHECKSUMS_FILENAME,
  BACKUP_METADATA_FILENAME,
  backupTargetFromMetadata,
  deriveMatchState,
  effectiveKickoff,
  requireFreshBackup,
  syntheticScore,
} from '../stage16a-p6c-executor.mjs'

describe('Stage 16A-P6C clock-derived match state', () => {
  const kickoff = new Date('2028-06-15T16:00:00.000Z')

  it('is scheduled before kickoff', () => {
    expect(deriveMatchState(new Date('2028-06-15T15:59:00Z'), kickoff)).toBe('scheduled')
  })
  it('is live within the in-progress window', () => {
    expect(deriveMatchState(new Date('2028-06-15T16:00:00Z'), kickoff)).toBe('live')
    expect(deriveMatchState(new Date('2028-06-15T17:30:00Z'), kickoff)).toBe('live')
  })
  it('is final after the plausible finish time', () => {
    expect(deriveMatchState(new Date('2028-06-15T18:30:00Z'), kickoff)).toBe('final')
  })

  it('is idempotent and bidirectional: the same T always yields the same state', () => {
    for (const iso of ['2028-06-15T15:00:00Z', '2028-06-15T16:30:00Z', '2028-06-16T00:00:00Z']) {
      const once = deriveMatchState(new Date(iso), kickoff)
      const again = deriveMatchState(new Date(iso), kickoff)
      expect(once).toBe(again)
    }
    // moving backward reduces a finished match back to scheduled
    expect(deriveMatchState(new Date('2028-06-20T00:00:00Z'), kickoff)).toBe('final')
    expect(deriveMatchState(new Date('2028-06-01T00:00:00Z'), kickoff)).toBe('scheduled')
  })
})

describe('Stage 16A-P6C deterministic score oracle', () => {
  it('produces the same plausible scoreline for a match every time', () => {
    for (let n = 1; n <= 51; n += 1) {
      const a = syntheticScore(n)
      const b = syntheticScore(n)
      expect(a).toEqual(b)
      expect(a.home).toBeGreaterThanOrEqual(0)
      expect(a.home).toBeLessThanOrEqual(4)
      expect(a.away).toBeGreaterThanOrEqual(0)
      expect(a.away).toBeLessThanOrEqual(4)
    }
  })
  it('varies scorelines across matches (not a constant)', () => {
    const set = new Set(Array.from({ length: 36 }, (_, i) => JSON.stringify(syntheticScore(i + 1))))
    expect(set.size).toBeGreaterThan(3)
  })
})

describe('Stage 16A-P6C effective kickoff', () => {
  it('derives a deterministic timestamp from the seeded scheduled_date', () => {
    expect(effectiveKickoff('2028-06-09', 1).toISOString()).toBe('2028-06-09T13:00:00.000Z')
    expect(effectiveKickoff('2028-06-09', 2).toISOString()).toBe('2028-06-09T16:00:00.000Z')
    expect(effectiveKickoff('2028-06-09', 3).toISOString()).toBe('2028-06-09T19:00:00.000Z')
  })
})

describe('Stage 16A-P6C backup precondition', () => {
  let root
  const savedEnv = {}
  const ENV_KEYS = ['EURO28_BACKUP_ROOT', 'STAGE16A_TARGET', 'STAGE16A_SKIP_BACKUP_PRECONDITION', 'STAGE16A_BACKUP_MAX_AGE_MIN']

  // Writes a backup directory in the repo-wide layout: a dump, backup-metadata.json,
  // and SHA256SUMS.txt covering both files.
  function writeBackup(name, metadata) {
    const dir = path.join(root, name)
    fs.mkdirSync(dir, { recursive: true })
    const dumpFile = 'local-db.sql'
    fs.writeFileSync(path.join(dir, dumpFile), `-- dump for ${name}\n`)
    fs.writeFileSync(path.join(dir, BACKUP_METADATA_FILENAME), `${JSON.stringify(metadata, null, 2)}\n`)
    const sha = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, file))).digest('hex')
    const sums = [dumpFile, BACKUP_METADATA_FILENAME].map(f => `${sha(f)}  ${f}`).join('\n')
    fs.writeFileSync(path.join(dir, BACKUP_CHECKSUMS_FILENAME), `${sums}\n`)
    return dir
  }

  function touch(dir, ageMinutes) {
    const when = new Date(Date.now() - ageMinutes * 60000)
    fs.utimesSync(path.join(dir, BACKUP_METADATA_FILENAME), when, when)
  }

  beforeEach(() => {
    for (const key of ENV_KEYS) savedEnv[key] = process.env[key]
    delete process.env.STAGE16A_SKIP_BACKUP_PRECONDITION
    delete process.env.STAGE16A_BACKUP_MAX_AGE_MIN
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'euro28-backup-root-'))
    process.env.EURO28_BACKUP_ROOT = root
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key]
      else process.env[key] = savedEnv[key]
    }
  })

  describe('backupTargetFromMetadata', () => {
    it('reads an explicit target', () => {
      expect(backupTargetFromMetadata({ target: 'local' })).toBe('local')
    })
    it('derives staging from the recorded Euro staging project ref', () => {
      expect(backupTargetFromMetadata({ source: { projectRef: 'gcfdwobpnanjchcnvdco' } })).toBe('staging')
    })
    it('derives production from the recorded WC26 project ref', () => {
      expect(backupTargetFromMetadata({ source: { projectRef: 'ouhxawizadnwrhrjppld' } })).toBe('production')
    })
    it('returns null for an unknown or absent ref, so it can never match a target', () => {
      expect(backupTargetFromMetadata({ source: { projectRef: 'someoneelse' } })).toBeNull()
      expect(backupTargetFromMetadata({})).toBeNull()
      expect(backupTargetFromMetadata(null)).toBeNull()
    })
  })

  it('accepts a fresh backup whose recorded target matches STAGE16A_TARGET', () => {
    const dir = writeBackup('local-fresh', { target: 'local' })
    const result = requireFreshBackup('local')
    expect(result.dir).toBe(dir)
    expect(result.target).toBe('local')
    expect(result.files).toBe(2)
  })

  // THE GAP: a stale local backup must not satisfy a staging write.
  it('REJECTS a local backup when the run targets staging', () => {
    writeBackup('local-fresh', { target: 'local' })
    expect(() => requireFreshBackup('staging')).toThrow(/no backup of target "staging"/)
  })

  // ...and the mirror image: a staging backup must not satisfy a local write.
  it('REJECTS a staging backup when the run targets local', () => {
    writeBackup('staging-fresh', { source: { projectRef: 'gcfdwobpnanjchcnvdco' } })
    expect(() => requireFreshBackup('local')).toThrow(/no backup of target "local"/)
  })

  it('names the mismatched backups it refused, rather than failing silently', () => {
    writeBackup('local-fresh', { target: 'local' })
    expect(() => requireFreshBackup('staging')).toThrow(/local-fresh → local/)
  })

  // The old behaviour: newest-by-mtime wins regardless of target. A newer local
  // backup must not shadow the older staging backup that actually covers the run.
  it('picks the newest backup OF THE REQUESTED TARGET, not the newest overall', () => {
    const staging = writeBackup('staging-older', { source: { projectRef: 'gcfdwobpnanjchcnvdco' } })
    touch(staging, 30)
    const local = writeBackup('local-newer', { target: 'local' })
    touch(local, 1)

    expect(requireFreshBackup('staging').dir).toBe(staging)
    expect(requireFreshBackup('local').dir).toBe(local)
  })

  it('chooses the freshest among several backups of the same target', () => {
    const older = writeBackup('local-older', { target: 'local' })
    touch(older, 120)
    const newer = writeBackup('local-newer', { target: 'local' })
    touch(newer, 5)
    expect(requireFreshBackup('local').dir).toBe(newer)
  })

  it('rejects a target-matching backup that is older than the max age', () => {
    const dir = writeBackup('local-stale', { target: 'local' })
    touch(dir, 500)
    expect(() => requireFreshBackup('local')).toThrow(/newest "local" backup is \d+m old/)
  })

  it('rejects a tampered target: metadata is covered by SHA256SUMS.txt', () => {
    const dir = writeBackup('local-fresh', { target: 'local' })
    // Rewrite the recorded target to claim it is a staging backup, without
    // updating the checksum file.
    fs.writeFileSync(path.join(dir, BACKUP_METADATA_FILENAME), JSON.stringify({ target: 'staging' }))
    expect(() => requireFreshBackup('staging')).toThrow(/checksum mismatch for backup-metadata\.json/)
  })

  it('rejects a backup directory whose metadata is unparseable', () => {
    const dir = writeBackup('local-broken', { target: 'local' })
    fs.writeFileSync(path.join(dir, BACKUP_METADATA_FILENAME), '{ not json')
    expect(() => requireFreshBackup('local')).toThrow(/no backup of target "local"/)
  })

  it('ignores a legacy metadata.json directory that lacks the repo-wide filename', () => {
    const dir = path.join(root, 'local-legacy')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'local-db.sql'), '-- dump\n')
    fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({ target: 'local' }))
    fs.writeFileSync(path.join(dir, BACKUP_CHECKSUMS_FILENAME), 'deadbeef  local-db.sql\n')
    expect(() => requireFreshBackup('local')).toThrow(/no verified backup/)
  })

  it('fails when the backup root is unset or missing', () => {
    delete process.env.EURO28_BACKUP_ROOT
    expect(() => requireFreshBackup('local')).toThrow(/EURO28_BACKUP_ROOT missing or unset/)
  })

  it('still honours the explicit skip escape hatch', () => {
    process.env.STAGE16A_SKIP_BACKUP_PRECONDITION = 'i-accept-the-risk'
    expect(requireFreshBackup('staging')).toEqual({ skipped: true })
  })
})
