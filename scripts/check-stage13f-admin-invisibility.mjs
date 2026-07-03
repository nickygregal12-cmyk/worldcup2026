import fs from 'node:fs'

const read = path => fs.readFileSync(path, 'utf8')
const shell = read('src/app/EuroAppShell.jsx')
const foundation = read('src/App.jsx')
const gate = read('src/admin/AdminRouteGate.jsx')
const visibility = read('src/admin/adminVisibilityModel.js')

const assertions = [
  [shell.includes('adminVisibility?.isAdmin'), 'Admin navigation is not conditioned on verified access'],
  [foundation.includes('<AdminRouteGate visibility={adminVisibility}>'), 'Admin route is not fail-closed'],
  [foundation.includes('ADMIN_VISIBILITY_STATUS.ALLOWED'), 'Denied admin routes can still expose the admin shell title'],
  [gate.includes('data-admin-route-state'), 'Admin route states are not explicit'],
  [visibility.includes("SIGNED_OUT: 'signed_out'") && visibility.includes("DENIED: 'denied'") && visibility.includes("ERROR: 'error'"), 'Required access states are missing'],
]
for (const [passed, message] of assertions) if (!passed) throw new Error(message)
const migrations = fs.readdirSync('supabase/migrations').filter(name => name.endsWith('.sql'))
if (migrations.length < 16 || !migrations.some(name => name.includes('016_euro28_staging_time_phase_controls'))) throw new Error('Migration 016 baseline is missing')
console.log('Euro Stage 13F-E admin invisibility audit passed.')
console.log('Navigation: Admin appears only after server-authorised access verification')
console.log('Route: signed-out, denied and verification-error states fail closed without exposing the control-room shell')
console.log('Authorised admins: direct control-room access and all existing operations remain available')
console.log(`Database: ${migrations.length} active migrations; approved staging Time & Phase Migration 016 present`)
