import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { ADMIN_SECTIONS, APP_DESTINATIONS, APP_ROUTE, isKnownAppHash, routeFromHash } from '../src/app/appRoutes.js'

const ROOTS = ['src']
const EXTENSIONS = new Set(['.js', '.jsx'])
const ALLOWED_IN_PAGE_FRAGMENTS = new Set(['#main-content'])
const TEMPLATE_ROUTE_PREFIXES = ['#/match-centre?match=', '#bracket-']

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory()) return walk(full)
    const ext = full.slice(full.lastIndexOf('.'))
    return EXTENSIONS.has(ext) ? [full] : []
  })
}

function collectLiteralHashes(source) {
  const hashes = []
  for (const match of source.matchAll(/href=(?:\{|)(?:['"])(#[^'"`{}\\s]+)(?:['"])(?:\}|)/g)) hashes.push(match[1])
  return hashes
}

function collectTemplatePrefixes(source) {
  const prefixes = []
  for (const match of source.matchAll(/href=\{`(#[^`$]+)\$\{/g)) prefixes.push(match[1])
  return prefixes
}

const failures = []
const discovered = []

for (const file of ROOTS.flatMap(root => walk(root))) {
  const source = readFileSync(file, 'utf8')
  const name = relative(process.cwd(), file)
  for (const hash of collectLiteralHashes(source)) discovered.push({ file: name, hash })
  for (const prefix of collectTemplatePrefixes(source)) {
    if (!TEMPLATE_ROUTE_PREFIXES.some(allowed => prefix.startsWith(allowed))) {
      failures.push(`${name}: dynamic internal hash prefix is not registered: ${prefix}`)
    }
  }
}

for (const { file, hash } of discovered) {
  if (ALLOWED_IN_PAGE_FRAGMENTS.has(hash)) continue
  if (hash.startsWith('#/')) {
    if (!isKnownAppHash(hash)) failures.push(`${file}: unresolved app hash ${hash}`)
    continue
  }
  if (hash.startsWith('#admin-')) {
    failures.push(`${file}: legacy Admin fragment ${hash} must use #/admin?section=...`)
  }
}

for (const destination of APP_DESTINATIONS) {
  if (!isKnownAppHash(destination.hash)) failures.push(`APP_DESTINATIONS contains unresolved hash ${destination.hash}`)
}
for (const section of ADMIN_SECTIONS) {
  if (routeFromHash(section.hash) !== APP_ROUTE.ADMIN) failures.push(`Admin section does not resolve to protected Admin route: ${section.hash}`)
}

if (failures.length) {
  console.error('Stage 13G-A route integrity audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Stage 13G-A route integrity audit passed.')
console.log(`Application destinations: ${APP_DESTINATIONS.length}`)
console.log(`Admin section destinations: ${ADMIN_SECTIONS.length}`)
console.log('Legacy #admin-* fragments: 0')
console.log('Dead internal app hashes: 0')
