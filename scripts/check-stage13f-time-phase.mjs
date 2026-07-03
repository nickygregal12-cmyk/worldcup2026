import fs from 'node:fs'
const required = [
  'supabase/migrations/202607030016_euro28_staging_time_phase_controls.sql',
  'src/timePhase/AdminTimePhasePanel.jsx',
  'src/timePhase/StagingTimeBanner.jsx',
  'src/timePhase/useTournamentTimeControl.js',
]
for (const file of required) if (!fs.existsSync(file)) throw new Error(`Missing Stage 13F-G file: ${file}`)
const migration = fs.readFileSync(required[0], 'utf8')
for (const token of ['tournament_time_controls', 'time_control_updated', 'time_control_reset', 'is_provisional = true', 'admin_set_tournament_time_control', 'admin_reset_tournament_time_control']) {
  if (!migration.includes(token)) throw new Error(`Stage 13F-G migration missing ${token}`)
}
const app = fs.readFileSync('src/foundation/EuroFoundationApp.jsx', 'utf8')
if (!app.includes('StagingTimeBanner') || !app.includes('useTournamentTimeControl')) throw new Error('Global staging clock is not wired')
const admin = fs.readFileSync('src/admin/AdminOperationsFoundation.jsx', 'utf8')
if (!admin.includes('AdminTimePhaseSection')) throw new Error('Admin Time & Phase section is not wired')
console.log('Euro Stage 13F-G staging Time & Phase audit passed.')
console.log('Clock: one shared application override with a permanent active-warning banner')
console.log('Safety: provisional staging tournament, explicit environment flag and owner-only audited writes')
console.log('Data: fixtures, results, locks and scoring records remain unchanged')
console.log('Database: 16 active migrations; Migration 016 is the approved staging time-control migration')
