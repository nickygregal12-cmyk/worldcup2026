// Agent-drift guard — one database client, no hardcoded endpoints.
//
// Failure class: an agent needs data access in a new module, and instead of
// importing the shared client it creates a second one or pastes a project
// URL — silently forking configuration, auth behaviour and environment
// switching (the exact class the "never touch src/lib/supabase.js" git rule
// exists to prevent, made mechanical and extended to every future file).
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { walkFiles } from './lib/frontendArchitectureAudit.mjs'

const root = process.cwd()
const errors = []
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

// The one active client factory, and the quarantined WC26 legacy client kept
// verbatim under the never-touch rule.
const CLIENT_OWNER = 'src/runtime/appClient.js'
const LEGACY_CLIENT = 'src/lib/supabase.js'
// The one module allowed to hold environment endpoint configuration.
const ENVIRONMENT_OWNERS = new Set([CLIENT_OWNER, 'src/runtime/environment.js'])

const files = walkFiles(root, 'src').filter(file =>
  (file.endsWith('.js') || file.endsWith('.jsx')) && !file.includes('/__tests__/') && !/\.test\.jsx?$/.test(file))

for (const file of files) {
  const source = read(file)
  if (source.includes('createClient') && file !== CLIENT_OWNER && file !== LEGACY_CLIENT
      && !file.startsWith('src/pages/') && !file.startsWith('src/components/')) {
    errors.push(`${file} calls or imports createClient — the app has exactly one client, owned by ${CLIENT_OWNER}. Import the shared client instead.`)
  }
  if (/https?:\/\/[\w.-]*supabase\.(co|in)/.test(source) && !ENVIRONMENT_OWNERS.has(file) && file !== LEGACY_CLIENT) {
    errors.push(`${file} hardcodes a Supabase endpoint URL — endpoints live only in ${[...ENVIRONMENT_OWNERS].join(', ')}.`)
  }
  if (/\bouhxawizadnwrhrjppld\b/.test(source)) {
    errors.push(`${file} references the WC26 Supabase project — that project is permanently blocked from this codebase.`)
  }
}

if (errors.length > 0) {
  console.error(`Client-singleton audit failed with ${errors.length} issue(s):\n`)
  for (const message of errors) console.error(`  - ${message}`)
  process.exit(1)
}
console.log(`Client-singleton audit passed. One client owner (${CLIENT_OWNER}); no stray createClient, hardcoded endpoints, or WC26 project references in ${files.length} files.`)
