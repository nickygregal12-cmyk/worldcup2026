// STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-1 audit — first public signup implementation guard.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { PUBLIC_SIGNUP_DISPLAY_NAME_MODERATION_MESSAGE, validatePublicSignupDisplayName } from '../src/auth/authValidation.js'
import { buildPublicSignupReadiness } from '../src/auth/publicSignupReadiness.js'

const root = process.cwd()
const errors = []
const exists = file => fs.existsSync(path.join(root, file))
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const requireText = (file, marker, reason) => {
  if (!exists(file)) {
    errors.push(`${file} is missing — ${reason}.`)
    return
  }
  if (!read(file).includes(marker)) errors.push(`${file} must record "${marker}" — ${reason}.`)
}

const files = [
  'src/auth/authValidation.js',
  'src/auth/euroAuthService.js',
  'src/auth/AccountAccess.jsx',
  'src/auth/publicSignupReadiness.js',
  'src/auth/__tests__/authValidation.test.js',
  'src/auth/__tests__/euroAuthService.test.js',
  'src/auth/__tests__/publicSignupReadiness.test.js',
  'docs/STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-1.md',
  'docs/PUBLIC-SIGNUP-IMPLEMENTATION-CONTRACT.md',
  'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md',
  'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md',
  'docs/EURO28-AGENT-RULES-AND-ROADMAP.md',
  'docs/PRODUCT-COMPLETENESS-ROADMAP.md',
  'docs/STREAMLINED-BATCH-ORDER.md',
  'package.json',
]
for (const file of files) if (!exists(file)) errors.push(`${file} is missing.`)

const readiness = buildPublicSignupReadiness()
if (readiness.isOpenForPublic !== false) errors.push('Public registration must remain closed in STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-1.')
if (readiness.implementation?.publicRegistrationOpened !== false) errors.push('Implementation status must explicitly keep publicRegistrationOpened false.')
if (readiness.ownerDecisions?.moderation?.clientPreAuthGuardImplemented !== true) errors.push('Moderation owner decision must record clientPreAuthGuardImplemented true.')
if (validatePublicSignupDisplayName('Friendly Player').valid !== true) errors.push('Friendly public display name should remain valid.')
if (validatePublicSignupDisplayName('Stop the boats').valid !== false) errors.push('Recorded owner-decision moderation example must be blocked before Auth sign-up.')

const sourceMarkers = [
  'validatePublicSignupDisplayName',
  'PUBLIC_SIGNUP_BLOCKED_DISPLAY_NAME_PATTERNS',
]
for (const marker of sourceMarkers) requireText('src/auth/authValidation.js', marker, 'public signup moderation guard must be implemented')
if (PUBLIC_SIGNUP_DISPLAY_NAME_MODERATION_MESSAGE.length < 20) errors.push('Public signup moderation message constant must remain meaningful.')
requireText('src/auth/euroAuthService.js', 'validatePublicSignupDisplayName(displayName)', 'sign-up and profile-name paths must use moderated names')
requireText('src/auth/euroAuthService.js', 'checkDisplayNameAvailability(client, validatedName)', 'availability RPC must remain before Auth sign-up')
requireText('src/auth/AccountAccess.jsx', 'validatePublicSignupDisplayName(displayName)', 'registration form must validate with the public signup moderation guard before calling service')
requireText('src/auth/__tests__/euroAuthService.test.js', 'rejects moderated names before Auth sign-up', 'service tests must prove no Auth call for moderated names')
requireText('src/auth/__tests__/authValidation.test.js', 'moderates public signup display names before account creation', 'validation tests must prove moderation')

const stageMarkers = [
  'client-side pre-Auth display-name moderation',
  'existing display-name availability RPC check remains before Auth sign-up',
  'email confirmation success copy',
  'support/contact-admin and privacy gate copy remains visible in the Rules Hub',
  'public registration remains closed until external Auth/config checks are confirmed',
  'No Supabase Auth dashboard/config change is made by this patch',
  'No Supabase schema, RPC, RLS, service-role or browser write change',
  'No Migration 019',
]
for (const file of ['docs/STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-1.md', 'docs/PUBLIC-SIGNUP-IMPLEMENTATION-CONTRACT.md']) {
  for (const marker of stageMarkers) requireText(file, marker, 'stage contract must preserve implementation boundary')
}
for (const file of ['docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md', 'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md', 'docs/EURO28-AGENT-RULES-AND-ROADMAP.md', 'docs/PRODUCT-COMPLETENESS-ROADMAP.md', 'docs/STREAMLINED-BATCH-ORDER.md']) {
  requireText(file, 'STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-1', 'live docs must record the implementation stage')
  requireText(file, 'client-side pre-Auth display-name moderation', 'live docs must record moderation implementation')
  requireText(file, 'public registration remains closed', 'live docs must avoid opening signup prematurely')
  requireText(file, 'Migration 019', 'live docs must preserve migration boundary')
}

const pkg = JSON.parse(read('package.json'))
if (pkg.scripts?.['audit:public-signup-implementation'] !== 'node scripts/check-stage-public-signup-implementation.mjs') {
  errors.push('audit:public-signup-implementation is not wired correctly.')
}
if (!pkg.scripts?.check?.includes('npm run audit:public-signup-implementation')) {
  errors.push('npm run check does not include audit:public-signup-implementation.')
}
if (!pkg.scripts?.['lint:foundation']?.includes('scripts/check-stage-public-signup-implementation.mjs')) {
  errors.push('lint:foundation does not include scripts/check-stage-public-signup-implementation.mjs.')
}

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrations.length !== 18) errors.push(`Expected 18 active migrations, found ${migrations.length}.`)
if (migrations.some(name => name.includes('019'))) errors.push('Migration 019 exists but this stage must not create it.')

if (errors.length > 0) {
  console.error(`STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-1 audit failed with ${errors.length} issue(s):\n`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('Stage STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-1 audit passed.')
console.log('Signup: client-side pre-Auth display-name moderation is implemented and availability RPC remains before Auth sign-up.')
console.log('Safety: public registration remains closed; no Supabase Auth dashboard/config, schema, RPC, RLS, service-role, scoring, resolver, fake-result, league-write or migration change.')
console.log('Database: active migrations remain 18; no Migration 019.')
