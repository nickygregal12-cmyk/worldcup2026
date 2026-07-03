import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const exists = file => fs.existsSync(path.join(root, file))

const packageJson = JSON.parse(read('package.json'))
const main = read('src/main.jsx')
const netlify = read('netlify.toml')
const health = read('netlify/functions/health.js')
const heartbeat = read('netlify/functions/scheduled-heartbeat.js')
const uploader = read('scripts/upload-sentry-sourcemaps.mjs')
const vite = read('vite.config.js')
const errorFixture = read('src/observability/Stage14ErrorFixture.jsx')
const errorBoundary = read('src/observability/AppErrorBoundary.jsx')
const errorFlag = read('src/observability/stage14ErrorFlag.js')
const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(file => file.endsWith('.sql')).sort()

assert(migrations.length >= 16, `Stage 14 must retain Migration 016 and later approved migrations; found ${migrations.length}.`)
assert(migrations.some(file => file.includes('202607030016_euro28_staging_time_phase_controls')), 'Approved staging Time & Phase Migration 016 is missing.')
assert(packageJson.dependencies?.zod, 'Zod must be an explicit production dependency.')
assert(packageJson.scripts?.['audit:observability']?.includes('check-observability-resilience'), 'The observability audit script is not registered.')
assert(packageJson.scripts?.build?.includes('upload-sentry-sourcemaps'), 'The build does not run the guarded source-map uploader.')
assert(main.includes('initObservability()') && main.includes('<AppErrorBoundary>') && main.includes('<Stage14ErrorFixture />'), 'The application root is missing observability initialisation or its error boundary.')
assert(!errorFixture.includes('history.replaceState'), 'The Stage 14 error fixture must not clear its flag during render.')
assert(errorFlag.includes('clearStage14ErrorFlag') && errorFlag.includes('history.replaceState'), 'The Stage 14 error flag utility is incomplete.')
assert(errorBoundary.includes('clearStage14ErrorFlag()') && errorBoundary.includes('handleReload'), 'Recovery actions must clear the Stage 14 error fixture before retrying or reloading.')
assert(exists('src/observability/RuntimeHealthPanel.jsx') && exists('src/observability/healthService.js') && read('src/observability/RuntimeHealthPanel.jsx').includes('Send Sentry test event'), 'The runtime health presentation boundary is missing.')
const observabilityPresentation = [read('src/observability/AppErrorBoundary.jsx'), read('src/observability/RuntimeHealthPanel.jsx')].join('\n')
assert(observabilityPresentation.includes('Button') && !observabilityPresentation.includes('foundation-button'), 'Stage 14 recovery and health actions must use the shared Euro button system.')
assert(health.includes("zod") && health.includes(".from") === false && health.includes('/rest/v1/tournaments'), 'The health function must use a validated read-only tournament request.')
assert(heartbeat.includes('healthSchema.safeParse') && heartbeat.includes('/.netlify/functions/health'), 'The scheduled heartbeat must validate the health endpoint response.')
assert(netlify.includes('[functions."scheduled-heartbeat"]') && netlify.includes('schedule = "0 * * * *"'), 'The hourly scheduled heartbeat is not configured.')
assert(vite.includes("sourcemap: sentryUploadEnabled ? 'hidden' : false"), 'Source maps must be generated only for configured Sentry release uploads.')
assert(uploader.includes('SENTRY_AUTH_TOKEN') && uploader.includes('SENTRY_RELEASE') && uploader.includes('await rm(mapPath)'), 'The guarded source-map release upload is incomplete.')

const validatedServices = [
  'src/runtime/loadEuroApp.js',
  'src/auth/euroAuthService.js',
  'src/predictions/predictionSaveService.js',
  'src/koPredictor/koPredictorService.js',
  'src/grace/predictionGraceService.js',
  'src/results/resultService.js',
  'src/leagues/leagueService.js',
  'src/teamProfile/teamProfileService.js',
  'src/admin/adminOperationsService.js',
]
for (const file of validatedServices) assert(read(file).includes('parseExternal'), `${file} is missing its Stage 14 validation boundary.`)

const allText = [health, heartbeat, read('netlify/functions/_observability.js'), read('src/observability/observability.js')].join('\n')
assert(!/ouhxawizadnwrhrjppld/.test(allText), 'The WC26 Supabase project appears in active Stage 14 code.')
assert(!/(service_role|SUPABASE_SERVICE_KEY)/.test(health), 'The public health check must not use a service-role credential.')

console.log('Euro Stage 14 observability and resilience audit passed.')
console.log('Errors: root and Netlify function failures use optional Sentry-compatible reporting without committed secrets.')
console.log('Health: validated read-only endpoint plus hourly scheduled heartbeat.')
console.log('Validation: active Euro browser, RPC and function boundaries use Zod-backed parsing.')
console.log(`Database: ${migrations.length} active migrations including approved staging Time & Phase Migration 016.`)
