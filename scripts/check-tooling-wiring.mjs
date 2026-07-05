// Meta-audit — no dead or unwired tooling.
//
// Root cause this guards against: check scripts that exist in scripts/ but
// are referenced by nothing, so they silently rot (one such script in this
// repo asserted doc versions three revisions out of date and failed when
// run — and nothing noticed, because nothing ran it). Half-wired tooling is
// the same failure class as a half-wired feature, and gets the same rule:
// it either works and is wired, or it is retired with a recorded reason.
//
// Enforced, for every current and future file automatically:
//   1. Every scripts/check-*.mjs and scripts/verify-*.mjs must be referenced
//      by at least one package.json script, or listed in RETIRED_SCRIPTS
//      with a reason.
//   2. Every package.json `audit:*` script must be invoked by the `check`
//      chain (directly or via another chained script), or listed in
//      NON_CHECK_AUDITS with a reason.
//   3. Every package.json script that invokes `node scripts/<file>` must
//      point at a file that exists.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { walkFiles } from './lib/frontendArchitectureAudit.mjs'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)

// Scripts intentionally kept without an npm entry. Each needs a reason.
// Prefer deleting a dead script over listing it here.
const RETIRED_SCRIPTS = Object.freeze([
  { file: 'scripts/check-stage13g-r0-docs.mjs', reason: 'retired historical R0 docs audit; superseded by governance-coherence meta-audit' },
  { file: 'scripts/check-stage13g-test-strategy-roadmap.mjs', reason: 'retired historical test-strategy roadmap audit; superseded by current check chain and governance-coherence meta-audit' },
])

// audit:* scripts intentionally outside the `check` chain. Each needs a reason.
const NON_CHECK_AUDITS = Object.freeze([
  // { name: 'audit:example', reason: 'manual-only: needs staging credentials' },
])

const retiredFiles = new Set(RETIRED_SCRIPTS.map(entry => entry.file))
const nonCheckAudits = new Set(NON_CHECK_AUDITS.map(entry => entry.name))

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const scripts = pkg.scripts ?? {}
const allCommands = Object.values(scripts).join(' \u0000 ')

// 1. Every check-/verify- script file is referenced by some npm script.
const toolFiles = walkFiles(root, 'scripts').filter(file =>
  file.endsWith('.mjs') && !file.includes('/__tests__/') && !file.includes('/lib/')
  && (path.basename(file).startsWith('check-') || path.basename(file).startsWith('verify-')))

for (const file of toolFiles) {
  if (retiredFiles.has(file)) continue
  if (!allCommands.includes(file)) {
    fail(`${file} is not referenced by any package.json script. Wire it, delete it, or record it in RETIRED_SCRIPTS with a reason — unwired tooling rots silently.`)
  }
}

for (const entry of RETIRED_SCRIPTS) {
  if (!fs.existsSync(path.join(root, entry.file))) {
    fail(`RETIRED_SCRIPTS lists ${entry.file}, which no longer exists — remove the stale entry.`)
  }
  if (!entry.reason) fail(`RETIRED_SCRIPTS entry for ${entry.file} has no reason.`)
}

// 2. Every audit:* npm script is reachable from the `check` chain.
const checkChain = scripts.check ?? ''
const reachable = new Set()
const queue = [...checkChain.matchAll(/npm run ([\w:.-]+)/g)].map(match => match[1])
while (queue.length > 0) {
  const name = queue.shift()
  if (reachable.has(name)) continue
  reachable.add(name)
  const command = scripts[name] ?? ''
  for (const match of command.matchAll(/npm run ([\w:.-]+)/g)) queue.push(match[1])
}

for (const name of Object.keys(scripts)) {
  if (!name.startsWith('audit:')) continue
  if (reachable.has(name) || nonCheckAudits.has(name)) continue
  fail(`package.json script "${name}" is not invoked by the check chain. Add it to check, or record it in NON_CHECK_AUDITS with a reason.`)
}

for (const entry of NON_CHECK_AUDITS) {
  if (!scripts[entry.name]) fail(`NON_CHECK_AUDITS lists "${entry.name}", which is not a package.json script — remove the stale entry.`)
  if (!entry.reason) fail(`NON_CHECK_AUDITS entry for "${entry.name}" has no reason.`)
}

// 3. Every npm script that runs a scripts/ file points at a real file.
for (const [name, command] of Object.entries(scripts)) {
  for (const match of command.matchAll(/scripts\/[\w\-./]+\.mjs/g)) {
    if (!fs.existsSync(path.join(root, match[0]))) {
      fail(`package.json script "${name}" references missing file ${match[0]}.`)
    }
  }
}

if (errors.length > 0) {
  console.error(`Tooling-wiring meta-audit failed with ${errors.length} issue(s):\n`)
  for (const message of errors) console.error(`  - ${message}`)
  console.error('\nEvery tool is either wired and running, or retired with a recorded reason — the same rule as features.')
  process.exit(1)
}

console.log(`Tooling-wiring meta-audit passed. ${toolFiles.length} tool scripts all referenced; every audit:* script reachable from check (${reachable.size} chained scripts); no missing files.`)
