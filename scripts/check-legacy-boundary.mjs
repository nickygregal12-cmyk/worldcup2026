import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const root = path.resolve(path.dirname(scriptPath), '..')
const srcRoot = path.join(root, 'src')
const entry = path.join(srcRoot, 'main.jsx')
const extensions = ['.js', '.jsx', '.mjs', '.css']
const importPattern = /(?:import\s+(?:[^'\"]+?\s+from\s+)?|import\()\s*['\"]([^'\"]+)['\"]/g
const errors = []

function relative(filePath) {
  return path.relative(root, filePath).split(path.sep).join('/')
}

function resolveLocalImport(importer, specifier) {
  if (!specifier.startsWith('.')) return null
  const base = path.resolve(path.dirname(importer), specifier)
  const candidates = path.extname(base)
    ? [base]
    : [
        ...extensions.map(extension => `${base}${extension}`),
        ...extensions.map(extension => path.join(base, `index${extension}`)),
      ]

  return candidates.find(candidate => fs.existsSync(candidate)) || null
}

function collectActiveFiles() {
  const active = new Set()
  const queue = [entry]

  while (queue.length > 0) {
    const filePath = queue.shift()
    if (!filePath || active.has(filePath)) continue
    active.add(filePath)

    if (!/\.(?:js|jsx|mjs)$/.test(filePath)) continue
    const content = fs.readFileSync(filePath, 'utf8')
    importPattern.lastIndex = 0

    for (const match of content.matchAll(importPattern)) {
      const resolved = resolveLocalImport(filePath, match[1])
      if (resolved && resolved.startsWith(srcRoot)) queue.push(resolved)
    }
  }

  return [...active].sort()
}

const activeFiles = collectActiveFiles()
const forbiddenActivePrefixes = [
  'src/pages/',
  'src/components/',
  'src/store/',
  'src/hooks/',
  'src/assets/',
]
const forbiddenActiveFiles = new Set([
  'src/lib/supabase.js',
  'src/lib/tournamentDates.js',
  'src/lib/gamePhase.js',
  'src/lib/scoring.js',
  'src/lib/bracketUtils.js',
])

for (const filePath of activeFiles) {
  const rel = relative(filePath)
  if (forbiddenActivePrefixes.some(prefix => rel.startsWith(prefix))) {
    errors.push(`Active entrypoint reaches quarantined inherited code: ${rel}`)
  }
  if (forbiddenActiveFiles.has(rel)) {
    errors.push(`Active entrypoint reaches an inherited application module: ${rel}`)
  }

  if (/\.(?:js|jsx|mjs)$/.test(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8')
    const databaseWritePattern = /\.(?:insert|update|upsert)\s*\(|\.from\([^)]*\)[\s\S]{0,240}\.delete\s*\(/
    if (databaseWritePattern.test(content)) {
      errors.push(`Active foundation code contains a browser database write: ${rel}`)
    }
  }
}

const publicBrandFiles = [
  'index.html',
  'public/manifest.json',
  'public/offline.html',
  'public/robots.txt',
  'public/sitemap.xml',
]
const forbiddenBrandTerms = [
  'WC26 Predictor',
  'FIFA World Cup 2026',
  'wc26predictor1.netlify.app',
  'Round of 32',
]

for (const rel of publicBrandFiles) {
  const filePath = path.join(root, rel)
  if (!fs.existsSync(filePath)) {
    errors.push(`Required foundation public file is missing: ${rel}`)
    continue
  }
  const content = fs.readFileSync(filePath, 'utf8')
  for (const term of forbiddenBrandTerms) {
    if (content.includes(term)) errors.push(`${rel} still contains inherited public branding: ${term}`)
  }
}

const appContent = fs.readFileSync(path.join(srcRoot, 'App.jsx'), 'utf8')
if (!appContent.includes("./foundation/EuroFoundationApp.jsx")) {
  errors.push('src/App.jsx is not pointing at the isolated Euro foundation application.')
}

const retirementWorker = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8')
if (!retirementWorker.includes('registration.unregister()')) {
  errors.push('public/sw.js must retire the inherited service worker registration.')
}
if (!retirementWorker.includes("startsWith('wc26-')")) {
  errors.push('public/sw.js must remove inherited WC26 cache names.')
}

const allSourceFiles = []
function walk(directory) {
  for (const entryItem of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entryItem.name)
    if (entryItem.isDirectory()) walk(fullPath)
    else if (/\.(?:js|jsx|mjs)$/.test(entryItem.name)) allSourceFiles.push(fullPath)
  }
}
walk(srcRoot)

const quarantinedFiles = allSourceFiles.filter(filePath => !activeFiles.includes(filePath))

if (errors.length > 0) {
  console.error('Legacy application boundary check failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Legacy application boundary check passed.')
console.log(`Active foundation files: ${activeFiles.length}`)
console.log(`Quarantined inherited source files: ${quarantinedFiles.length}`)
console.log('Active browser database writes: 0')
console.log('Inherited prediction, authentication, league and admin routes: unreachable')
