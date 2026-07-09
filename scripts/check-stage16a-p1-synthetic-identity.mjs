import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import {
  EURO28_STAGING_PROJECT_REF,
  STAGE16A_PERSONA_KEYS,
  STAGE16A_SYNTHETIC_EMAIL_DOMAIN,
  STAGE16A_SYNTHETIC_PERSONAS,
  WC26_PRODUCTION_PROJECT_REF,
  assertEuro28StagingProjectRef,
  buildStage16aSyntheticIdentityPlan,
  validateStage16aSyntheticPersonaCatalogue,
} from './lib/stage16aSyntheticIdentity.mjs'

const failures = []
const fail = message => failures.push(message)

function read(path) {
  if (!existsSync(path)) {
    fail(`${path} is missing`)
    return ''
  }
  return readFileSync(path, 'utf8')
}

function assertIncludes(label, text, marker) {
  if (!text.includes(marker)) fail(`${label} missing marker: ${marker}`)
}

const doc = read('docs/archive/STAGE-16A-P1-SYNTHETIC-IDENTITY-PLUMBING.md')
const scopeDoc = read('docs/archive/STAGE-16A-SCOPE-ALIGNMENT.md')
const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const agentRules = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
const lib = read('scripts/lib/stage16aSyntheticIdentity.mjs')
const tests = read('scripts/__tests__/stage16aSyntheticIdentity.test.js')
const packageJson = JSON.parse(read('package.json') || '{}')

for (const marker of [
  'Stage 16A-P1 — Privacy-safe synthetic identity plumbing',
  'local catalogue, guard and audit package only',
  'does not create Auth users',
  'write to Supabase',
  EURO28_STAGING_PROJECT_REF,
  WC26_PRODUCTION_PROJECT_REF,
  '@synthetic.euro28.test',
  'synthetic_euro28: true',
  'Email domain alone is not enough. Metadata marker alone is not enough.',
  'Original Predictor and KO Predictor stay separate',
  'must not expose email addresses, raw Auth metadata, service-role data or privileged identity records',
  'Active migrations remain 18 and Migration 019 must not exist',
  '16A-P2 — Staging-effective database time',
]) {
  assertIncludes('Stage 16A-P1 doc', doc, marker)
}

for (const key of STAGE16A_PERSONA_KEYS) {
  for (const [label, text] of Object.entries({
    'Stage 16A-P1 doc': doc,
    'Stage 16A scope doc': scopeDoc,
    'Decision Register': register,
    'Agent Rules': agentRules,
    'synthetic identity lib': lib,
    'synthetic identity tests': tests,
  })) {
    assertIncludes(label, text, key)
  }
}

for (const marker of [
  'Stage 16A-P1',
  'Privacy-safe synthetic identity plumbing',
  'exactly nineteen deterministic personas',
  '@synthetic.euro28.test',
  'synthetic_euro28: true',
  'no database writes',
  'no user creation',
  'no Migration 019',
]) {
  for (const [label, text] of Object.entries({
    'Decision Register': register,
    'Functional Completion Ledger': ledger,
    'Agent Rules': agentRules,
  })) {
    assertIncludes(label, text, marker)
  }
}

try {
  const validation = validateStage16aSyntheticPersonaCatalogue()
  if (validation.personaCount !== 19) fail(`Expected 19 personas, found ${validation.personaCount}`)
  if (validation.emailDomain !== STAGE16A_SYNTHETIC_EMAIL_DOMAIN) fail('Synthetic email domain mismatch')
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}

try {
  const plan = buildStage16aSyntheticIdentityPlan({ projectRef: EURO28_STAGING_PROJECT_REF })
  if (plan.createsUsers !== false) fail('P1 identity plan must not create users')
  if (plan.writesDatabase !== false) fail('P1 identity plan must not write the database')
  if (plan.personaCount !== 19) fail('P1 identity plan must expose nineteen personas')
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}

try {
  assertEuro28StagingProjectRef(WC26_PRODUCTION_PROJECT_REF)
  fail('WC26 production project ref was not blocked')
} catch (error) {
  if (!String(error?.message ?? error).includes('WC26 production')) fail('WC26 block did not use the expected fail-closed error')
}

if (STAGE16A_SYNTHETIC_PERSONAS.length !== 19) fail('Synthetic persona export must contain exactly nineteen personas')
if (new Set(STAGE16A_SYNTHETIC_PERSONAS.map(persona => persona.email)).size !== 19) fail('Synthetic persona emails must be unique')

for (const persona of STAGE16A_SYNTHETIC_PERSONAS) {
  if (!persona.email.endsWith(`@${STAGE16A_SYNTHETIC_EMAIL_DOMAIN}`)) fail(`${persona.key} email does not use reserved synthetic domain`)
  if (persona.metadata?.synthetic_euro28 !== true) fail(`${persona.key} missing synthetic metadata marker`)
  if (persona.teardownGuard?.requiresReservedEmailDomain !== true) fail(`${persona.key} missing teardown email-domain guard`)
  if (persona.teardownGuard?.requiresSyntheticMetadataMarker !== true) fail(`${persona.key} missing teardown metadata guard`)
}

for (const forbidden of [
  'createUser',
  'admin.createUser',
  'insert into',
  'delete from',
  '.from(',
  '.rpc(',
]) {
  if (lib.includes(forbidden)) fail(`P1 synthetic identity lib must not contain write/runtime database marker: ${forbidden}`)
}

if (packageJson.scripts?.['audit:stage16a-p1-synthetic-identity'] !== 'node scripts/check-stage16a-p1-synthetic-identity.mjs') {
  fail('package.json missing audit:stage16a-p1-synthetic-identity script')
}

if (!packageJson.scripts?.check?.includes('npm run audit:stage16a-scope-alignment && npm run audit:stage16a-p1-synthetic-identity')) {
  fail('npm run check must run Stage 16A-P1 after Stage 16A scope alignment')
}

for (const marker of [
  'scripts/check-stage16a-p1-synthetic-identity.mjs',
  'scripts/lib/stage16aSyntheticIdentity.mjs',
  'scripts/__tests__/stage16aSyntheticIdentity.test.js',
]) {
  if (!packageJson.scripts?.['lint:foundation']?.includes(marker)) fail(`lint:foundation missing ${marker}`)
}

const migrations = existsSync('supabase/migrations')
  ? readdirSync('supabase/migrations').filter(name => name.endsWith('.sql'))
  : []

if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (failures.length > 0) {
  console.error('Euro Stage 16A-P1 synthetic identity audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Euro Stage 16A-P1 synthetic identity audit passed.')
console.log('Personas: exactly 19 deterministic synthetic identities.')
console.log('Markers: @synthetic.euro28.test plus synthetic_euro28: true.')
console.log('Boundary: Euro staging only; WC26 production fails closed.')
console.log('Scope: no user creation, database writes, UI exposure, scoring, resolver or migration change.')
