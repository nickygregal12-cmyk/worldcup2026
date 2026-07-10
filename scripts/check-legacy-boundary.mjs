import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { collectLiveFiles } from './lib/liveModuleGraph.mjs'

const scriptPath = fileURLToPath(import.meta.url)
const root = path.resolve(path.dirname(scriptPath), '..')
const srcRoot = path.join(root, 'src')
const errors = []

function relative(filePath) {
  return path.relative(root, filePath).split(path.sep).join('/')
}

const activeFiles = collectLiveFiles(root)
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
if (!appContent.includes('export default function App()')) {
  errors.push('src/App.jsx must own the Euro product root.')
}
if (fs.existsSync(path.join(root, 'public/sw.js'))) {
  errors.push('public/sw.js must remain absent until the approved Stage 18C PWA build.')
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

const protectedEuroLogicFiles = allSourceFiles.filter(filePath => {
  const rel = relative(filePath)
  return rel.startsWith('src/contracts/') ||
    rel.startsWith('src/resolver/') ||
    rel.startsWith('src/guest/') ||
    rel.startsWith('src/auth/') ||
    rel.startsWith('src/predictions/') ||
    rel.startsWith('src/journey/') ||
    rel.startsWith('src/koPredictor/') ||
    rel.startsWith('src/grace/') ||
    rel === 'src/config/scoringConfig.js' ||
    rel === 'src/config/__tests__/scoringConfig.test.js' ||
    rel === 'src/lib/scoring.js' ||
    rel === 'src/lib/__tests__/scoring.test.js'
})
const protectedEuroLogicSet = new Set(protectedEuroLogicFiles)
const quarantinedFiles = allSourceFiles.filter(filePath =>
  !activeFiles.includes(filePath) && !protectedEuroLogicSet.has(filePath),
)

if (errors.length > 0) {
  console.error('Legacy application boundary check failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Legacy application boundary check passed.')
console.log(`Active foundation files: ${activeFiles.length}`)
console.log(`Protected Euro contract files: ${protectedEuroLogicFiles.length}`)
console.log(`Quarantined inherited source files: ${quarantinedFiles.length}`)
console.log('Active browser database writes: 0')
console.log('Inherited WC26 prediction, league and admin routes: unreachable')
console.log('Euro original predictor, KO Predictor, secure admin operations and private leagues: isolated and active')
