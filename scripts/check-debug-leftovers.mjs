// Agent-drift guard — no debug leftovers in active source.
//
// Failure class: agents scaffold with console.log, debugger statements,
// alert() and TODO markers, then forget them. Individually trivial; in
// aggregate they leak internals to the browser console, freeze half-finished
// intentions in place, and normalise "temporary" code. Active source is
// currently clean — this locks it at zero so leftover number one fails the
// build. console.warn/error stay allowed for real error paths.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { walkFiles } from './lib/frontendArchitectureAudit.mjs'

const root = process.cwd()
const errors = []
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const EXEMPT_PREFIXES = ['src/pages/', 'src/components/', 'src/testFixtures/', 'src/lib/', 'src/store/', 'src/hooks/']
const RULES = Object.freeze([
  { pattern: /\bconsole\.(log|debug|info|table|trace)\s*\(/, label: 'console output', fix: 'remove it, or use console.warn/error on a real error path' },
  { pattern: /\bdebugger\b/, label: 'debugger statement', fix: 'remove it' },
  { pattern: /\balert\s*\(/, label: 'alert() call', fix: 'use the product notice/toast pattern' },
  { pattern: /\/\/\s*(TODO|FIXME|HACK|XXX)\b|\/\*\s*(TODO|FIXME|HACK|XXX)\b/i, label: 'unfinished-work marker', fix: 'finish it, or record the work as a ledger/roadmap item and delete the comment' },
])

const files = walkFiles(root, 'src').filter(file =>
  (file.endsWith('.js') || file.endsWith('.jsx'))
  && !file.includes('/__tests__/') && !/\.test\.jsx?$/.test(file)
  && !EXEMPT_PREFIXES.some(prefix => file.startsWith(prefix)))

for (const file of files) {
  const lines = read(file).split('\n')
  lines.forEach((line, index) => {
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        errors.push(`${file}:${index + 1} — ${rule.label}: ${line.trim().slice(0, 80)} … ${rule.fix}.`)
      }
    }
  })
}

if (errors.length > 0) {
  console.error(`Debug-leftovers audit failed with ${errors.length} issue(s):\n`)
  for (const message of errors) console.error(`  - ${message}`)
  process.exit(1)
}
console.log(`Debug-leftovers audit passed. ${files.length} active source files clean: no console noise, debugger, alert() or unfinished-work markers.`)
