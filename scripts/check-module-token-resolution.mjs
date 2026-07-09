// Module token-resolution audit — every var(--token) referenced in a live CSS Module
// must resolve: against src/design/tokens.css, typography.css, a global stylesheet
// shipped by main.jsx, or a custom property defined in the module itself. A reference
// with an explicit var() fallback is allowed. Guards against invented token families
// (e.g. --color-text-strong) and scale gaps (e.g. --space-5) silently invalidating
// declarations in production.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { walkFiles } from './lib/frontendArchitectureAudit.mjs'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const errors = []

const definitionSources = [
  'src/design/tokens.css', 'src/design/typography.css', 'src/styles/app.css',
  'src/styles/feature-compat.css', 'src/styles/match-card.css',
  'src/styles/groups-predictor.css', 'src/styles/knockout-experiences.css',
]
const defined = new Set()
for (const file of definitionSources) {
  for (const match of read(file).matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)) defined.add(match[1])
}

const moduleFiles = walkFiles(root, 'src').filter(file => file.endsWith('.module.css'))
for (const file of moduleFiles) {
  const source = read(file)
  const localDefined = new Set([...source.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)].map(match => match[1]))
  for (const match of source.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)\s*([,)])/g)) {
    const [, token, delimiter] = match
    if (delimiter === ',') continue // an explicit fallback keeps the declaration valid
    if (!defined.has(token) && !localDefined.has(token)) {
      errors.push(`${file} references undefined design token ${token} with no fallback`)
    }
  }
}

if (errors.length > 0) {
  console.error(`Module token-resolution audit failed with ${errors.length} issue(s):`)
  for (const message of errors) console.error(`  - ${message}`)
  console.error('\nUse a token defined in src/design/tokens.css (or add one deliberately) — an unresolved var() silently invalidates its declaration.')
  process.exit(1)
}

console.log(`Module token-resolution audit passed. Every var(--token) across ${moduleFiles.length} CSS Modules resolves against ${defined.size} defined tokens.`)
