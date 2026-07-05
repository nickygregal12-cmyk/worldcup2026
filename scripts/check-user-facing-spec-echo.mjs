// Stage 13G-UI-HYGIENE (part 2) — user-facing "spec echo" audit.
//
// The copy-hygiene audit (check-user-facing-copy-hygiene.mjs) catches banned
// vocabulary. This catches a different, sneakier problem: whole sentences
// written for an internal spec/decision doc, then frozen verbatim into user
// -facing copy — usually because an audit script started checking for that
// literal sentence's presence, which locks the wording in place forever.
//
// Real example found in this repo: docs/STAGE-13G-C-CLOSEOUT-HANDOVER.md
// calls a sentence "the required competition-boundary sentence" and gives
// its exact text. That exact text is hardcoded as a UI copy string in
// src/leagues/Leagues.jsx, AND hardcoded as a literal marker in two
// different audit scripts (check-stage13g-c6-compact-league-shell.mjs,
// check-stage13d-integration.mjs). Nobody can improve the wording without
// touching three files, so nobody does, and it reads exactly like what it
// is: an internal rule, not a sentence written for a player.
//
// This script flags any user-facing sentence that appears verbatim (after
// whitespace normalisation) inside a docs/*.md file. A short, punchy piece
// of real product copy coinciding by accident with spec prose is extremely
// unlikely once a sensible minimum length is enforced — a genuine match
// nearly always means copy-paste, not coincidence.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { USER_FACING_ROOTS } from './user-facing-copy-hygiene-policy.mjs'
import { walkFiles } from './lib/frontendArchitectureAudit.mjs'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const MIN_MATCH_LENGTH = 40 // characters — short strings coincide too easily to be meaningful signal

const normalise = text => text.replace(/\s+/g, ' ').trim()

// Sentences/bullets from every doc — this is the "known spec prose" set.
function extractDocSentences() {
  const sentences = new Set()
  const docFiles = walkFiles(root, 'docs').filter(file => file.endsWith('.md'))
  for (const file of docFiles) {
    const source = read(file)
    for (const line of source.split('\n')) {
      const bullet = line.replace(/^\s*[-*]\s*/, '').trim()
      if (bullet.length >= MIN_MATCH_LENGTH) sentences.add(normalise(bullet))
      for (const sentence of line.split(/(?<=[.!?])\s+/)) {
        const trimmed = sentence.trim()
        if (trimmed.length >= MIN_MATCH_LENGTH) sentences.add(normalise(trimmed))
      }
    }
  }
  return sentences
}

function extractUserFacingSentences(source) {
  const candidates = []
  const push = text => {
    if (text.length >= MIN_MATCH_LENGTH) candidates.push(text)
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      const trimmed = sentence.trim()
      if (trimmed.length >= MIN_MATCH_LENGTH) candidates.push(trimmed)
    }
  }
  for (const match of source.matchAll(/'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"|`([^`\\]*(?:\\.[^`\\]*)*)`/g)) {
    const text = match[1] ?? match[2] ?? match[3]
    if (text) push(text)
  }
  for (const match of source.matchAll(/>([^<>{}\n]{2,})</g)) {
    push(match[1].trim())
  }
  return candidates
}

const docSentences = extractDocSentences()

const files = [...new Set(USER_FACING_ROOTS.flatMap(dir => walkFiles(root, dir)))]
  .filter(file => (file.endsWith('.jsx') || file.endsWith('.js')) && !file.includes('/__tests__/') && !file.endsWith('.test.js') && !file.endsWith('.test.jsx'))

for (const file of files) {
  const source = read(file)
  for (const text of extractUserFacingSentences(source)) {
    const normalised = normalise(text)
    if (docSentences.has(normalised)) {
      fail(`${file}: user-facing copy is word-for-word identical to spec/doc prose — "${normalised.slice(0, 90)}${normalised.length > 90 ? '…' : ''}". Rewrite as copy written for a player, and if an audit checks for this literal string, point it at a shared named constant instead of duplicating the sentence.`)
    }
  }
}

if (errors.length > 0) {
  console.error(`User-facing spec-echo audit failed with ${errors.length} issue(s):\n`)
  for (const message of errors) console.error(`  - ${message}`)
  console.error('\nA sentence that matches internal spec prose word-for-word is a strong signal it was pasted in rather than written as product copy.')
  process.exit(1)
}

console.log(`User-facing spec-echo audit passed. Scanned ${files.length} files against ${docSentences.size} known doc sentences — no verbatim spec-copy found in user-facing UI.`)
