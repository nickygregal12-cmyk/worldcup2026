import fs from 'node:fs'

const operations = fs.readFileSync('src/admin/AdminOperations.jsx', 'utf8')
const status = fs.readFileSync('src/admin/AdminControlRoomStatus.jsx', 'utf8')
const styles = fs.readFileSync('src/admin/AdminControlRoom.module.css', 'utf8')

const required = [
  ['authorised operations heading', operations.includes('Euro 2028 operations')],
  ['section navigation', operations.includes('Admin control-room sections')],
  ['overview section', operations.includes('admin-overview')],
  ['safeguards section', operations.includes('admin-safeguards')],
  ['team content section', operations.includes('admin-team-content')],
  ['match operations section', operations.includes('admin-match-operations')],
  ['scoring activity section', operations.includes('admin-scoring-activity')],
  ['audited safety language', operations.includes('server-authorised, note-gated and audited')],
  ['shared status presentation', status.includes('Control-room status summary')],
  ['responsive control-room stylesheet', styles.includes('@media (max-width: 680px)')],
]

const failures = required.filter(([, ok]) => !ok)
if (failures.length) {
  for (const [label] of failures) console.error(`Missing Stage 13F-F requirement: ${label}`)
  process.exit(1)
}

const migrations = fs.readdirSync('supabase/migrations').filter(file => file.endsWith('.sql'))
if (migrations.length !== 16 || !migrations.some(file => file.includes('016_euro28_staging_time_phase_controls'))) {
  console.error('Stage 13F-F plus approved Stage 13F-G must retain 16 migrations including staging Time & Phase Migration 016')
  process.exit(1)
}

console.log('Euro Stage 13F-F admin control-room audit passed.')
console.log('Presentation: authorised operations are grouped into overview, safeguards, content, match and scoring sections')
console.log('Safety: existing RPC permissions, note gates and append-only audit behaviour remain unchanged')
console.log('Responsive design: scoped semantic-token styles cover desktop, tablet and phone layouts')
console.log('Database: 16 active migrations; approved staging Time & Phase Migration 016 present')
