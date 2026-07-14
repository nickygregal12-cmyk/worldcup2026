import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { CONTRAST_PAIRS, TEMPORARY_CONTRAST_EXCEPTIONS } from './architecture-policy.mjs'
import { auditContrast } from './lib/frontendArchitectureAudit.mjs'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const exists = file => fs.existsSync(path.join(root, file))
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrations.length < 14) fail(`Stage 13A must retain the original fourteen-migration baseline, found ${migrations.length}`)

const requiredFiles = [
  'docs/EURO28-DESIGN-CHARTER.md',
  'src/design/tokens.css',
  'src/design/typography.css',
  'src/styles/app.css',
  'src/styles/feature-compat.css',
  'src/styles/groups-predictor.css',
  'src/styles/knockout-experiences.css',
  'src/design-system/Icon.jsx',
  'src/app/EuroAppShell.jsx',
  'src/app/appRoutes.js',
  'src/app/navigationLifecycle.js',
  'src/app/__tests__/navigationLifecycle.test.js',
  'docs/archive/STAGE-13A-V6-DESIGN-SYSTEM-NAVIGATION-HOME.md',
  'src/home/HomeDashboard.jsx',
  'src/tournament/TournamentOverview.jsx',
]
for (const file of requiredFiles) if (!exists(file)) fail(`Required Stage 13A v6 file is missing: ${file}`)

if (exists('src/foundation/foundation.css')) fail('The stopgap foundation stylesheet must be retired')
if (exists('src/styles/tokens.css')) fail('There must be one token file only: src/design/tokens.css')

const main = read('src/main.jsx')
for (const forbiddenImport of ['./foundation/foundation.css', './styles/globals.css', './styles/tokens.css']) {
  if (main.includes(forbiddenImport)) fail(`Active entry point imports retired styling: ${forbiddenImport}`)
}
for (const requiredImport of [
  '@fontsource/public-sans/latin-400.css',
  '@fontsource/big-shoulders-display/latin-700.css',
  './design/tokens.css',
  './design/typography.css',
  './styles/feature-compat.css',
  './styles/app.css',
  './styles/groups-predictor.css',
  './styles/knockout-experiences.css',
]) if (!main.includes(requiredImport)) fail(`Active entry point is missing: ${requiredImport}`)

const packageJson = JSON.parse(read('package.json'))
for (const dependency of ['lucide-react', '@fontsource/public-sans', '@fontsource/big-shoulders-display']) {
  if (!packageJson.dependencies?.[dependency]) fail(`Required design dependency is missing: ${dependency}`)
}
if (packageJson.scripts?.['audit:design-tokens'] !== 'node scripts/check-design-tokens.mjs') {
  fail('audit:design-tokens is not wired to the charter audit')
}
if (!packageJson.scripts?.check?.includes('audit:design-tokens')) fail('npm run check does not run audit:design-tokens')

const tokenSource = read('src/design/tokens.css')
const contrastAudit = auditContrast({
  tokenSource,
  pairs: CONTRAST_PAIRS,
  exceptions: TEMPORARY_CONTRAST_EXCEPTIONS,
})
for (const failure of contrastAudit.failures) fail(`WCAG token contrast: ${failure}`)
for (const token of [
  '--font-body', '--font-display', '--surface-page', '--surface-raised', '--text-primary',
  '--brand', '--brand-strong', '--accent', '--state-live', '--state-success', '--state-danger',
  '--joker', '--shadow-1', '--shadow-2', '--shadow-3', '--radius-sm', '--radius-md', '--radius-lg',
  '--predicted-context-surface', '--predicted-context-border', '--predicted-context-text',
  '--real-context-surface', '--real-context-border', '--real-context-text', '--knockout-selected-surface', '--knockout-selected-border',
  '--radius-full', "[data-theme='dark']",
  // Design Programme palette (Stage DP-0) — additive --dp-* set, sky accent, completed 4px scale.
  '--space-5', '--space-16', '--sky', '--sky-bright',
  '--dp-surface-page', '--dp-surface-raised', '--dp-surface-chrome',
  '--dp-text-body', '--dp-text-strong', '--dp-text-muted', '--dp-text-muted-chrome',
  '--dp-text-on-chrome', '--dp-text-on-accent', '--dp-action', '--dp-action-ink',
  '--dp-border-subtle', '--dp-border-strong',
  '--dp-joker-ink', '--dp-live-ink', '--dp-warning-ink', '--dp-info-border',
]) if (!tokenSource.includes(token)) fail(`Semantic token is missing: ${token}`)

const activeStyleFiles = ['src/design/typography.css', 'src/styles/app.css', 'src/styles/feature-compat.css', 'src/styles/groups-predictor.css', 'src/styles/knockout-experiences.css']
const rawColour = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/i
const namedColourDeclaration = /:\s*(?:white|black|red|blue|green|gold|gray|grey|orange|purple)(?:\s|;|!)/i
for (const file of activeStyleFiles) {
  const source = read(file)
  source.split('\n').forEach((line, index) => {
    if (rawColour.test(line)) fail(`${file}:${index + 1} contains a raw colour outside tokens.css`)
    if (namedColourDeclaration.test(line)) fail(`${file}:${index + 1} contains a named colour outside tokens.css`)
    if (file !== 'src/design/typography.css' && /font-family\s*:/.test(line)) fail(`${file}:${index + 1} declares a font family outside the approved typography file`)
  })
}

const activeStyles = [tokenSource, ...activeStyleFiles.map(read)].join('\n')
const definitions = new Set([...activeStyles.matchAll(/--([\w-]+)\s*:/g)].map(match => match[1]))
const usages = new Set([...activeStyles.matchAll(/var\(--([\w-]+)/g)].map(match => match[1]))
for (const name of usages) if (!definitions.has(name)) fail(`CSS variable is used but not defined: --${name}`)

for (const retiredValue of ['#003087', '#00206b', '#005eb8', 'DM Sans', 'DM Mono', 'Space Grotesk']) {
  if (activeStyles.toLowerCase().includes(retiredValue.toLowerCase())) fail(`Active design uses retired WC26 styling: ${retiredValue}`)
}

const iconSource = read('src/design-system/Icon.jsx')
if (!iconSource.includes("from 'lucide-react'")) fail('Ordinary interface icons must come from Lucide')
if (iconSource.includes('<svg') || iconSource.includes('<path')) fail('The ordinary icon wrapper must not maintain hand-written SVG paths')

const shell = read('src/app/EuroAppShell.jsx')
for (const marker of [
  'primaryDestination', 'bracketDestination', 'navigationDestinations.phaseMoreDestinations',
  '<MobileNav', 'data-navigation-phase', 'aria-expanded={moreOpen}', '<Dialog',
]) if (!shell.includes(marker)) fail(`App shell is missing charter navigation behaviour: ${marker}`)
if (shell.includes('knockoutOpen') || shell.includes('knockoutNavigationDestination')) {
  fail('The superseded phase-aware Bracket/KO navigation remains in the app shell')
}

const routes = read('src/app/appRoutes.js')
for (const marker of [
  'BRACKET', "label: 'Groups'", "label: 'Bracket'", "label: 'KO Predictor'",
  "icon: 'predict'", "icon: 'bracket'", "icon: 'trophy'", '/group-stage-review',
]) if (!routes.includes(marker)) fail(`Route model is missing: ${marker}`)

const navigationLifecycle = read('src/app/navigationLifecycle.js')
const koReadiness = read('src/app/koReadiness.js')
for (const marker of [
  'NAVIGATION_PHASE', 'KO_EARLY_ACCESS', 'KO_PRIMARY', "import { buildKoReadiness } from './koReadiness.js'",
  'koReadiness ?? buildKoReadiness', 'showKoInMore', 'showGroupReviewInMore',
  "label: 'Group stage review'", 'resolverHealthy', 'buildNavigationDestinations',
]) if (!navigationLifecycle.includes(marker)) fail(`Navigation lifecycle is missing: ${marker}`)
for (const marker of [
  'ROUND_OF_16_MATCH_NUMBERS', 'groupMatches.length === 36',
  "match.status === 'completed'", "match.resultStatus === 'confirmed'",
  'ROUND_OF_16_MATCH_NUMBERS.length', 'primaryReady', 'showInMore',
]) if (!koReadiness.includes(marker)) fail(`Shared KO-readiness model is missing: ${marker}`)
if (/new Date\s*\(|Date\.now\s*\(/.test(`${navigationLifecycle}\n${koReadiness}`)) {
  fail('Navigation lifecycle and KO readiness must not use a component-level calendar trigger')
}

const navigationTests = read('src/app/__tests__/navigationLifecycle.test.js')
for (const marker of [
  'before a complete pairing exists', 'first complete Round of 16 pairing',
  'all eight pairings are resolved', 'final group result', 'fully ready transition',
  'resolver is unhealthy', 'unresolved TBC fixtures', "label: 'Group stage review'",
]) if (!navigationTests.includes(marker)) fail(`Navigation acceptance coverage is missing: ${marker}`)

const foundationLoader = read('src/runtime/loadEuroApp.js')
if (!foundationLoader.includes('result_status')) fail('Foundation loading must include authoritative result status for the navigation trigger')

const appCss = read('src/styles/app.css')
for (const marker of [
  '@media (max-width: 56.25rem)', '@media (max-width: 40rem)',
  'font-variant-numeric: tabular-nums', 'prefers-reduced-motion',
]) if (!appCss.includes(marker)) fail(`Charter CSS behaviour is missing: ${marker}`)

// DP-SHELL: the mobile bottom nav moved out of app.css into its own CSS Module, so the
// raised-Home-circle marker moved with it. This is a REPOINT and a tightening, not a
// relaxation — `.app-nav-link--home` only ever proved a class name existed in app.css,
// and in fact nothing painted it: there was no raised circle in the product at all. The
// module is now held to the behaviour itself (the circle, and the §5 auto-hide transform
// that must live on the NAV so the bar and the circle translate as one unit).
const mobileNavCss = read('src/app/MobileNav.module.css')
for (const marker of [
  '.circle',                                        // the raised Home circle exists
  'margin-top: -1.125rem',                          // ...raised in flow, not positioned out of the nav
  "[data-nav-hidden='true']",                       // §5 auto-hide
  'transform: translateY(',                         // ...by translating
  'prefers-reduced-motion',
]) if (!mobileNavCss.includes(marker)) fail(`Charter mobile-nav behaviour is missing: ${marker}`)
if (/\.circle[^}]*position:\s*(fixed|absolute)/.test(mobileNavCss)) {
  fail('The raised Home circle must stay in the nav\'s flow — positioning it out of the nav breaks §5 "translates as one unit"')
}

const mobileNav = read('src/app/MobileNav.jsx')
for (const marker of ['useNavAutoHide', 'data-nav-hidden']) {
  if (!mobileNav.includes(marker)) fail(`App shell mobile nav is missing charter behaviour: ${marker}`)
}

const scoringSources = {
  // Home reads scoring through its model since the v2 rebuild, so check view + model together.
  'src/home/HomeDashboard.jsx': `${read('src/home/HomeDashboard.jsx')}\n${read('src/home/homeDashboardModel.js')}`,
  'src/tournament/TournamentOverview.jsx': `${read('src/tournament/TournamentOverview.jsx')}\n${read('src/tournament/tournamentPageModel.js')}`,
}
for (const [file, source] of Object.entries(scoringSources)) {
  if (!source.includes('EURO_SCORING_CONFIG')) fail(`${file} does not use central scoring configuration`)
  for (const duplicate of ['30 pts', '10 pts', '5 jokers']) {
    if (read(file).includes(duplicate)) fail(`${file} hard-codes a configurable rule: ${duplicate}`)
  }
}

function pngDimensions(file) {
  const buffer = fs.readFileSync(path.join(root, file))
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') return null
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

const baselineSizes = [
  ['home-mobile-light-380x844.png', 380, 844],
  ['home-mobile-dark-380x844.png', 380, 844],
  ['home-tablet-light-768x1024.png', 768, 1024],
  ['home-tablet-dark-768x1024.png', 768, 1024],
  ['home-desktop-light-1200x1000.png', 1200, 1000],
  ['home-desktop-dark-1200x1000.png', 1200, 1000],
]
for (const [name, width, height] of baselineSizes) {
  const file = `docs/design-baselines/stage13a/${name}`
  if (!exists(file)) {
    fail(`Design baseline is missing: ${file}`)
    continue
  }
  const dimensions = pngDimensions(file)
  if (!dimensions || dimensions.width !== width || dimensions.height !== height) {
    fail(`${file} must be ${width}×${height}`)
  }
}

const charter = read('docs/EURO28-DESIGN-CHARTER.md')
for (const decision of [
  'Blue direction — CONFIRMED',
  'Euro 2028 Predictor',
  'Groups | Bracket | Home | Leagues | More',
  'KO | Bracket | Home | Leagues | More',
  'Group stage review',
  'Lucide',
  'src/design/tokens.css',
  'src/design/typography.css',
]) if (!charter.includes(decision)) fail(`Design Charter is missing the confirmed decision: ${decision}`)

if (errors.length) {
  console.error('Euro Stage 13A v6 design-token audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro Stage 13A v6 design-token audit passed.')
console.log('Identity: independent blue palette controlled from one semantic token file')
console.log('Typography: self-hosted Big Shoulders Display and Public Sans')
console.log('Icons: Lucide for ordinary interface actions')
console.log('Navigation: Groups/KO · permanent Bracket · raised Home · Leagues · More')
console.log('Themes: light and dark share the same semantic component rules')
console.log(`Contrast: ${CONTRAST_PAIRS.length * 2} light/dark token pairs checked; ${contrastAudit.acceptedExceptions.length} ratcheted Stage 14B exceptions remain`)
console.log(`Database: original 14-migration baseline preserved; ${migrations.length} active migrations detected`)
