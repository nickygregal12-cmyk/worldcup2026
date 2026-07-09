// Bring the LOCAL database to the canonical visual-fixture state by generating
// the three idempotent data scripts (single source: scripts/assign-*.mjs) and
// applying them to local Supabase only. Never touches a remote project.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { projectRoot } from './lib/visualLib.mjs'

// Same local adapter as the Stage 16A executor: superuser psql inside the
// local Supabase container. `supabase db query --local` cannot execute
// multi-statement SQL files (single prepared statement), so it is not usable here.
const LOCAL_DB_CONTAINER = process.env.VISUAL_LOCAL_DB_CONTAINER || 'supabase_db_euro28predictor'

function run(command, args, label, options = {}) {
  const result = spawnSync(command, args, { cwd: projectRoot, stdio: options.stdio ?? 'inherit', input: options.input })
  if (result.status !== 0) {
    console.error(`visual:seed failed at: ${label}`)
    process.exit(1)
  }
}

function applyLocalSql(sqlPath, label) {
  run('docker', ['exec', '-i', LOCAL_DB_CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q'],
    label, { stdio: ['pipe', 'inherit', 'inherit'], input: fs.readFileSync(sqlPath) })
}

// The assign scripts refuse to write outside the repository; use the
// gitignored artifact directory for the generated SQL.
const workDir = path.join(projectRoot, 'visual-artifacts', 'seed-sql')
fs.mkdirSync(workDir, { recursive: true })
const steps = [
  ['assign-candidate-teams.mjs', '01-candidate-teams.sql'],
  ['assign-kickoff-times.mjs', '02-kickoff-times.sql'],
  ['assign-team-profiles.mjs', '03-team-profiles.sql'],
]

for (const [script, output] of steps) {
  const sqlPath = path.join(workDir, output)
  run('node', [path.join('scripts', script), '--output', sqlPath], `generate ${script}`)
  applyLocalSql(sqlPath, `apply ${output} to local database`)
}

// Pre-tournament reset: clears simulated clocks/results and pins the lock to
// the canonical first kick-off, so screenshots always show the same state.
applyLocalSql(path.join(projectRoot, 'visual-tests', 'sql', 'pre-tournament-reset.sql'), 'apply pre-tournament reset to local database')

console.log('Local database seeded to the canonical visual-fixture state (teams, slots, kickoffs, profiles, pre-tournament reset).')
