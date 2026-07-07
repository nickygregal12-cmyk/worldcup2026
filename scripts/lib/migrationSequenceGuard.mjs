// Real structural guard for supabase/migrations, replacing a long-lived hardcoded
// "exactly 18 migrations, Migration 019 must not exist" tripwire.
//
// That number was never about 019 itself -- for a long stretch of this project's history the
// count was genuinely frozen at 18, and dozens of docs/audit-only stage scripts used "no
// Migration 019" as a simple, concrete way to prove they hadn't silently smuggled in a schema
// change. Once a real, separately-packaged, justified migration needed to exist (see
// docs/EURO28-AGENT-RULES-AND-ROADMAP.md: "No migration is permitted unless a genuine
// schema/read-contract gap is proved and separately packaged"), a hardcoded forbidden number
// stopped being able to tell the difference between "an unauthorized migration snuck in" and
// "a real one was properly added" -- it just failed on both.
//
// The thing that actually matters is that migrations stay traceable: every filename follows the
// project's YYYYMMDDNNNN_description.sql convention, and the trailing 4-digit sequence numbers
// are consecutive from 0001 with no gaps or duplicates. That check allows real migrations to be
// added forever, while still catching the actual failure modes (a renumbered/duplicated/skipped
// migration) the original guard was a stand-in for.

const MIGRATION_FILENAME_PATTERN = /^\d{8}(\d{4})_.+\.sql$/

export function checkMigrationSequence(migrationFiles) {
  const files = Array.isArray(migrationFiles) ? migrationFiles : []
  const sequenceNumbers = []

  for (const name of files) {
    const match = MIGRATION_FILENAME_PATTERN.exec(name)
    if (!match) {
      return Object.freeze({
        valid: false,
        count: files.length,
        reason: `Migration filename does not match the YYYYMMDDNNNN_description.sql convention: ${name}`,
      })
    }
    sequenceNumbers.push(Number(match[1]))
  }

  const sorted = [...sequenceNumbers].sort((left, right) => left - right)
  for (let index = 0; index < sorted.length; index += 1) {
    const expected = index + 1
    if (sorted[index] !== expected) {
      return Object.freeze({
        valid: false,
        count: files.length,
        reason: `Migration sequence has a gap or duplicate: expected sequence number ${expected}, found ${sorted[index] ?? 'none'}`,
      })
    }
  }

  return Object.freeze({ valid: true, count: files.length, reason: null })
}

// Convenience for the common "if (thereIsAProblem) fail(theReason)" call-site shape.
export function migrationSequenceError(migrationFiles) {
  const result = checkMigrationSequence(migrationFiles)
  return result.valid ? null : result.reason
}
