// Stage 13G-UI-HYGIENE (part 1) — user-facing banned-vocabulary audit.
//
// The spec-echo audit (check-user-facing-spec-echo.mjs) catches whole
// sentences pasted verbatim from docs. This catches the other failure mode:
// admin/dev/build-internal vocabulary — "canonical", "resolver",
// "lifecycle", stage ids, vendor names, debug leftovers — surfacing in
// strings an ordinary player can read.
//
// It scans only extracted UI copy (quoted prose containing at least one
// space, plus JSX text nodes) in the user-facing roots defined by the shared
// policy module. Identifiers, imports, single-word keys, CSS classes and
// code structure are never scanned, so a property called `lifecycle` is
// fine while a sentence telling a player about "the next lifecycle update"
// is a finding. Genuine exceptions go in the policy allowlist with a
// reason — never loosen a pattern to make a real finding pass.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { USER_FACING_ROOTS, USER_FACING_FILES, BANNED_VOCABULARY, isAllowed } from './user-facing-copy-hygiene-policy.mjs'
import { walkFiles } from './lib/frontendArchitectureAudit.mjs'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

// A quoted string only counts as copy if it contains a space — single-word
// strings are nearly always keys, class names or enum values, not prose.
// JSX text nodes always count: a two-word badge is still player-visible copy.
// Interpolation contents are code, not copy — strip them so classname
// templates like `${styles.lifecycle}` never false-positive, while genuine
// interpolated copy like `${name} lifecycle` still matches on its prose.
const stripInterpolations = text => text.replace(/\$\{[^}]*\}/g, ' ')

function extractCopyCandidates(source) {
  const candidates = []
  for (const match of source.matchAll(/'([^'\\\n]*(?:\\.[^'\\\n]*)*)'|"([^"\\\n]*(?:\\.[^"\\\n]*)*)"|`([^`\\]*(?:\\.[^`\\]*)*)`/g)) {
    const text = match[1] ?? match[2] ?? match[3]
    const prose = stripInterpolations(text ?? '').trim()
    if (prose && prose.includes(' ')) candidates.push(prose)
  }
  for (const match of source.matchAll(/>([^<>{}\n]{2,})</g)) {
    const text = match[1].trim()
    if (text) candidates.push(text)
  }
  return candidates
}

const files = [
  ...new Set(USER_FACING_ROOTS.flatMap(dir => walkFiles(root, dir))),
  ...USER_FACING_FILES,
].filter(file =>
  (file.endsWith('.jsx') || file.endsWith('.js'))
  && !file.includes('/__tests__/')
  && !file.endsWith('.test.js')
  && !file.endsWith('.test.jsx'))

let scannedStrings = 0
for (const file of files) {
  const source = read(file)
  for (const text of extractCopyCandidates(source)) {
    scannedStrings += 1
    if (isAllowed(file, text)) continue
    for (const rule of BANNED_VOCABULARY) {
      const match = text.match(rule.pattern)
      if (match) {
        fail(`${file}: [${rule.category}] "${match[0]}" in user-facing copy — "${text.slice(0, 90)}${text.length > 90 ? '…' : ''}". ${rule.hint}.`)
        break
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`User-facing copy-hygiene audit failed with ${errors.length} issue(s):\n`)
  for (const message of errors) console.error(`  - ${message}`)
  console.error('\nRewrite each string as copy for the player reading it. If a string is genuinely fine, add it to ALLOWED_STRINGS in user-facing-copy-hygiene-policy.mjs with a reason — never weaken a pattern to pass.')
  process.exit(1)
}

console.log(`User-facing copy-hygiene audit passed. Scanned ${scannedStrings} copy strings across ${files.length} files in ${USER_FACING_ROOTS.length} user-facing roots — no banned vocabulary found.`)
