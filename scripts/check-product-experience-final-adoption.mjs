import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []

function read(file) {
  const fullPath = path.join(root, file)
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing required file: ${file}`)
    return ''
  }
  return fs.readFileSync(fullPath, 'utf8')
}

function requireMarkers(file, markers) {
  const source = read(file)
  for (const marker of markers) {
    if (!source.includes(marker)) failures.push(`${file} is missing: ${marker}`)
  }
}

const finalContract = 'docs/reference-prototypes/euro28-product-experience-final.md'

requireMarkers(finalContract, [
  'sole binding visual and product-experience contract',
  'Emoji icons and emoji flags are forbidden',
  'shared six-team third-place qualification table',
  'Table and Activity are mutually exclusive views',
  'Full Player Profile is a destination hub',
  'Tournament must earn its More-menu position',
  'Remove the existing venue two-sources-of-truth',
  'mock people',
  'No migration, scoring change, resolver amendment or Auth change',
])

requireMarkers('docs/reference-prototypes/euro28-product-experience-v3.md', [
  'SUPERSEDED 17 July 2026',
  'euro28-product-experience-final.md',
  'Do not implement new work against v3',
])

for (const file of [
  'CLAUDE.md',
  'AGENT-CONTROL/09-STAGE-ORDER.md',
  'AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md',
  'docs/EURO28-DESIGN-CHARTER.md',
  'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md',
  'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md',
  'docs/EURO28-AGENT-RULES-AND-ROADMAP.md',
  'docs/APPROVED-VISUAL-CONTRACT-INVENTORY.md',
  'docs/PRODUCT-COMPLETENESS-ROADMAP.md',
  'PROJECT-CONTROL.md',
]) {
  requireMarkers(file, ['euro28-product-experience-final.md'])
}

requireMarkers('docs/EURO28-DESIGN-CHARTER.md', [
  'Version 1.18',
  'PRODUCT-EXPERIENCE-FINAL-ADOPTION',
])

requireMarkers('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md', [
  'Stage PRODUCT-EXPERIENCE-FINAL-ADOPTION',
  'old master tracker is reconciled',
  'A visual rebuild cannot silently close',
])

requireMarkers('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md', [
  'Version 1.61',
  'governance/audit-only supersession',
  'No runtime UI',
])

requireMarkers('docs/PRODUCT-COMPLETENESS-ROADMAP.md', [
  'Final Product Experience route adoption register',
  'shared third-place table',
  'Account stays in the final account grouping',
])

requireMarkers('PROJECT-CONTROL.md', [
  'No runtime UI change is included in this adoption batch',
  'Prediction-write reliability remains a separate high-care stage',
])

const packageSource = read('package.json')
let packageJson = {}
try {
  packageJson = JSON.parse(packageSource)
} catch (error) {
  failures.push(`package.json is invalid JSON: ${error.message}`)
}

if (packageJson.scripts?.['audit:product-experience-final-adoption'] !== 'node scripts/check-product-experience-final-adoption.mjs') {
  failures.push('package.json must wire audit:product-experience-final-adoption')
}

if (!packageJson.scripts?.check?.includes('npm run audit:product-experience-final-adoption')) {
  failures.push('npm run check must include audit:product-experience-final-adoption')
}

if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/check-product-experience-final-adoption.mjs')) {
  failures.push('lint:foundation must include the final-adoption audit')
}

if (failures.length > 0) {
  console.error(`Final Product Experience adoption audit failed with ${failures.length} issue(s):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Final Product Experience adoption audit passed.')
console.log('Authority: one final visual/product-experience contract; v3 and older prototypes are provenance.')
console.log('Safety: old tracker programmes remain recorded; runtime/scoring/database behaviour is outside this adoption.')
