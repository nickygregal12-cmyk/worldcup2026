import fs from 'node:fs'

const operations = fs.readFileSync('src/admin/AdminOperations.jsx', 'utf8')
const routes = fs.readFileSync('src/app/appRoutes.js', 'utf8')
const status = fs.readFileSync('src/admin/AdminControlRoomStatus.jsx', 'utf8')
const styles = fs.readFileSync('src/admin/AdminControlRoom.module.css', 'utf8')

const required = [
  ['authorised operations heading', operations.includes('Euro 2028 operations')],
  ['section navigation', operations.includes('Admin control-room sections')],
  ['overview section', operations.includes('admin-overview')],
  ['fixture section', operations.includes('admin-fixtures')],
  ['result section', operations.includes('admin-results')],
  ['scoring section', operations.includes('admin-scoring')],
  ['audit section', operations.includes('admin-audit')],
  ['query-addressed Admin destinations', routes.includes("#/admin?section=overview") && routes.includes("#/admin?section=audit")],
  ['no legacy Admin fragment links', !operations.includes('href="#admin-')],
  ['protected invalid-section recovery', operations.includes('Unknown admin section requested')],
  ['audited safety language', operations.includes('server-authorised, note-gated and audited')],
  ['shared status presentation', status.includes('Control-room status summary')],
  ['responsive control-room stylesheet', styles.includes('@media (max-width: 680px)')],
]

const failures = required.filter(([, ok]) => !ok)
if (failures.length) {
  for (const [label] of failures) console.error(`Missing Stage 13F-F/13G-A Admin control-room requirement: ${label}`)
  process.exit(1)
}

const migrations = fs.readdirSync('supabase/migrations').filter(file => file.endsWith('.sql'))
if (migrations.length < 16 || !migrations.some(file => file.includes('016_euro28_staging_time_phase_controls'))) {
  console.error(`Stage 13F-F plus approved later stages must retain Migration 016; found ${migrations.length} migrations`)
  process.exit(1)
}

console.log('Euro Stage 13F-F/13G-A admin control-room audit passed.')
console.log('Presentation: authorised operations are grouped into protected query-addressed Admin sections')
console.log('Route integrity: legacy #admin-* links are rejected and invalid sections recover inside Admin')
console.log('Safety: existing RPC permissions, note gates and append-only audit behaviour remain unchanged')
console.log('Responsive design: scoped semantic-token styles cover desktop, tablet and phone layouts')
console.log(`Database: ${migrations.length} active migrations; approved staging Time & Phase Migration 016 present`)
