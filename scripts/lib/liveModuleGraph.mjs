// The single definition of "live product code".
//
// Live means: reachable from src/main.jsx by following relative imports.
// Nothing else. Not a hand-maintained root list, not a lint glob.
//
// Root cause this exists to remove: two audits disagreed about which files
// are live. check-legacy-boundary computed reachability from the real entry
// point; check-stage13g-interaction-enforcement policed a hardcoded
// ACTIVE_UI_ROOTS array. The array had drifted — src/welcome, src/timePhase,
// src/resolver and src/App.jsx are all reachable from main.jsx and were all
// invisible to the interaction guard. A raw <select> in any of them would
// never have been seen. Two answers to "is this file live?" is one answer too
// many; both callers now import this walker.
import fs from 'node:fs'
import path from 'node:path'

const EXTENSIONS = ['.js', '.jsx', '.mjs', '.css']
const IMPORT_PATTERN = /(?:import\s+(?:[^'"]+?\s+from\s+)?|import\()\s*['"]([^'"]+)['"]/g

function resolveLocalImport(importer, specifier) {
  if (!specifier.startsWith('.')) return null
  const base = path.resolve(path.dirname(importer), specifier)
  const candidates = path.extname(base)
    ? [base]
    : [
        ...EXTENSIONS.map(extension => `${base}${extension}`),
        ...EXTENSIONS.map(extension => path.join(base, `index${extension}`)),
      ]
  return candidates.find(candidate => fs.existsSync(candidate)) || null
}

// Absolute paths of every file reachable from the entry point, sorted.
export function collectLiveFiles(root) {
  const srcRoot = path.join(root, 'src')
  const entry = path.join(srcRoot, 'main.jsx')
  const live = new Set()
  const queue = [entry]

  while (queue.length > 0) {
    const filePath = queue.shift()
    if (!filePath || live.has(filePath)) continue
    live.add(filePath)
    if (!/\.(?:js|jsx|mjs)$/.test(filePath)) continue

    const content = fs.readFileSync(filePath, 'utf8')
    IMPORT_PATTERN.lastIndex = 0
    for (const match of content.matchAll(IMPORT_PATTERN)) {
      const resolved = resolveLocalImport(filePath, match[1])
      if (resolved && resolved.startsWith(srcRoot)) queue.push(resolved)
    }
  }

  return [...live].sort()
}

// Repo-relative, forward-slashed, source files only (no CSS).
export function collectLiveSourceFiles(root) {
  return collectLiveFiles(root)
    .filter(filePath => /\.(?:js|jsx|mjs)$/.test(filePath))
    .map(filePath => path.relative(root, filePath).split(path.sep).join('/'))
}
