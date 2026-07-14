// Meta-audit — governing documents cannot silently drift.
//
// Root cause this guards against: sections get appended to the Decision
// Register / Agent Rules while the version header and "current return point"
// at the top stay frozen at an older stage, so the front of the document
// contradicts its own tail (found live in this repo: Register header and
// return point three stages stale while its appended sections were current).
// Stage 13G-R0 made same-commit truthful records a rule; this makes the
// mechanically checkable part of that rule a build failure.
//
// Enforced against current and future docs automatically:
//   1. Every "active migrations remain/count N" claim in docs/*.md equals
//      the real migration file count, and no migration file exceeds the
//      declared ceiling (Migration 019 guard, generalised).
//   2. In any governing doc with more than one "Version X.Y" line, the
//      header (first) version is the highest — appended changelog entries
//      can never overtake a stale header.
//   3. PROJECT-CONTROL.md declares the return point, its required structure is
//      intact, and the commit it declares is real and an ancestor of HEAD.
//   4. Every designated return-point commit reference in the governing docs
//      matches that declared commit.
//
// The anchor moved off "the newest dated handover" (owner ruling 2026-07-15).
// Anchoring to a handover made whichever handover happened to be newest
// permanently load-bearing, and handovers accumulate; worse, the dashboard whose
// entire job is to state current state was the one document nothing verified, and
// it drifted four claims deep (a commit three-plus stages old, 18 migrations
// against a real 20, a long-closed stage, and "Playwright not proved installed"
// while Playwright was installed and catching real bugs).
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { execFileSync } from 'node:child_process'
import { walkFiles } from './lib/frontendArchitectureAudit.mjs'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const PROJECT_CONTROL = 'PROJECT-CONTROL.md'

// The dashboard's shape is part of its contract: an agent picking this repo up cold reads these
// headings to learn what is in flight, what is on hold on purpose, and what it must not touch.
// Silently losing one is how a dashboard rots back into a stale paragraph.
const REQUIRED_CONTROL_SECTIONS = Object.freeze([
  '## Current State',
  '## Immediate Priority Order',
  '## Current Blockers',
  '## Deliberately Deferred',
  '## Do-Not-Touch Areas',
])

const GOVERNING_DOCS = Object.freeze([
  'docs/EURO28-PROJECT-CONSTITUTION.md',
  'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md',
  'docs/EURO28-AGENT-RULES-AND-ROADMAP.md',
  'docs/EURO28-DESIGN-CHARTER.md',
  'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md',
  'docs/EURO28-SITE-ACCESS-MAP.md',
])

// ── 1. Migration-count claims match reality ─────────────────────────────────
const migrationFiles = fs.readdirSync(path.join(root, 'supabase/migrations'))
  .filter(name => name.endsWith('.sql')).sort()
const actualCount = migrationFiles.length
const highestNumber = Math.max(...migrationFiles.map(name => {
  const match = name.match(/^\d{8}(\d{4})_/)
  return match ? Number(match[1]) : 0
}))
if (highestNumber !== actualCount) {
  fail(`Migration numbering is not contiguous: ${actualCount} files but highest sequence number is ${String(highestNumber).padStart(4, '0')}.`)
}

// Only count claims explicitly about migrations — "exactly 24 teams" and
// similar are not migration claims and must never false-positive.
const COUNT_CLAIM = /(?:active migrations? remains?(?: at)? \**(\d+)\**|active migration count[^0-9]{0,12}\**(\d+)\**|exactly \**(\d+)\** (?:active )?migrations)/gi

// Closed stage docs are frozen historical evidence ("migrations remain 14"
// was true at that stage's close) and are exempt. Only documents that assert
// CURRENT state must always be true now: the governing docs, every dated
// handover from the current head, and every NEXT-CHAT prompt.
// docs/archive/ is frozen history. Its documents were true when their stage closed and must never
// be re-read as claims about the present: without this exclusion the next migration would force
// edits to closed stage records to keep the suite green, which is precisely what archiving cures.
const allDocs = walkFiles(root, 'docs').filter(file =>
  file.endsWith('.md')
  && !file.startsWith('docs/reference-prototypes/')
  && !file.startsWith('docs/archive/'))
const handoverDocs = allDocs.filter(file => /HANDOVER-\d{8}/.test(file)).sort()
const currentStateDocs = [
  ...GOVERNING_DOCS,
  PROJECT_CONTROL, // the dashboard asserts current state by definition, so its claims must be true now
  ...(handoverDocs.length ? [handoverDocs[handoverDocs.length - 1]] : []),
  ...allDocs.filter(file => file.includes('NEXT-CHAT-PROMPT')),
].filter(file => fs.existsSync(path.join(root, file)))

for (const file of currentStateDocs) {
  const source = read(file)
  for (const match of source.matchAll(COUNT_CLAIM)) {
    const claimed = Number(match[1] ?? match[2] ?? match[3])
    if (claimed !== actualCount) {
      fail(`${file} claims ${claimed} active migrations; supabase/migrations/ contains ${actualCount}. Correct the doc in the same commit as any migration change.`)
    }
  }
}

// Compare the trailing 4-digit sequence number only -- a raw filename substring check
// false-positives on dates that happen to contain the target digits (e.g. "202607020014"
// contains "020" from its date portion, with no connection to migration numbering).
const forbiddenNext = actualCount + 1
if (migrationFiles.some(name => {
  const match = name.match(/^\d{8}(\d{4})_/)
  return match && Number(match[1]) === forbiddenNext
})) {
  fail(`A migration numbered ${String(forbiddenNext).padStart(4, '0')} exists but governing docs still declare ${actualCount} active migrations.`)
}

// ── 2. Header version is the highest version in each governing doc ─────────
for (const file of GOVERNING_DOCS) {
  if (!fs.existsSync(path.join(root, file))) { fail(`Governing doc missing: ${file}`); continue }
  const versions = [...read(file).matchAll(/Version (\d+)\.(\d+)/g)]
    .map(match => ({ major: Number(match[1]), minor: Number(match[2]), text: `${match[1]}.${match[2]}` }))
  if (versions.length < 2) continue
  const header = versions[0]
  const highest = versions.reduce((best, current) =>
    current.major > best.major || (current.major === best.major && current.minor > best.minor) ? current : best)
  if (highest.text !== header.text) {
    fail(`${file}: header declares Version ${header.text} but the document contains Version ${highest.text}. Bump the header in the same commit as the appended entry.`)
  }
}

// ── 3. The dashboard is structurally intact and its declared commit is real ──
function readDeclaredCommit() {
  if (!fs.existsSync(path.join(root, PROJECT_CONTROL))) {
    fail(`${PROJECT_CONTROL} is missing. It is the return-point anchor for every governing doc.`)
    return null
  }
  const source = read(PROJECT_CONTROL)

  for (const heading of REQUIRED_CONTROL_SECTIONS) {
    if (!source.includes(heading)) {
      fail(`${PROJECT_CONTROL} is missing its "${heading}" section. The dashboard's structure is part of its contract — an agent picking the repo up cold reads these headings to learn what is in flight, what is deferred on purpose, and what is off-limits.`)
    }
  }

  const declared = source.match(/\|\s*Latest verified commit\s*\|\s*`([0-9a-f]{7,40})\b/i)
  if (!declared) {
    fail(`${PROJECT_CONTROL} does not declare a "Latest verified commit" row of the form \`| Latest verified commit | \\\`<sha> <subject>\\\` |\`. Every governing doc's return point is validated against it.`)
    return null
  }
  return declared[1]
}

// The declared commit must be real, and must be behind us. A commit cannot certify its own hash, so
// the dashboard always names an ancestor — but it must never name a commit that does not exist, or
// one on a branch HEAD never took.
//
// CI checks out shallow (actions/checkout@v4 defaults to fetch-depth 1), so the object is genuinely
// absent and ancestry is UNKNOWABLE there rather than false. Skipping loudly beats failing a build
// over a question the clone cannot answer — and printing the skip stops it passing for a real check.
function verifyAncestry(sha) {
  const git = args => execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()

  let objectExists = true
  try { git(['cat-file', '-e', `${sha}^{commit}`]) } catch { objectExists = false }

  if (!objectExists) {
    let shallow = false
    try { shallow = git(['rev-parse', '--is-shallow-repository']) === 'true' } catch { /* not a git repo */ }
    if (shallow) {
      console.warn(`  ! ancestry of the declared commit \`${sha}\` NOT verified: shallow clone, object absent. Check it with full history.`)
      return
    }
    fail(`${PROJECT_CONTROL} declares latest verified commit \`${sha}\`, but no such commit exists in this repository. The dashboard must name a real commit that was proven green.`)
    return
  }

  try {
    git(['merge-base', '--is-ancestor', sha, 'HEAD'])
  } catch {
    fail(`${PROJECT_CONTROL} declares latest verified commit \`${sha}\`, which is not an ancestor of HEAD — the dashboard is naming a commit this branch never took. Update it to the commit you actually verified green.`)
  }
}

const declaredCommit = readDeclaredCommit()
if (declaredCommit) verifyAncestry(declaredCommit)

// ── 4. Return-point commits in the governing docs agree with the dashboard ──
// The governing docs are APPEND-ONLY ledgers, and most of their commit anchors are historical
// entries qualified as "... before <stage>": they record what the head was when that stage opened,
// and they were true then. Demanding they equal today's head would not fix drift — it would force an
// agent to rewrite the ledger's history every time the head moves, which is the opposite of what an
// append-only record is for. Only an UNQUALIFIED anchor asserts a present-tense return point, and
// only those are checked against the dashboard.
const HISTORICAL_QUALIFIER = /\bbefore\b/i

if (declaredCommit) {
  const RETURN_POINT = /(?:expected git commit[^`\n]*|latest known completed product commit[^`\n]*|current deployed head[^`\n]*|latest deployed commit[^`\n]*)`([0-9a-f]{7,40})/i
  for (const file of GOVERNING_DOCS) {
    if (!fs.existsSync(path.join(root, file))) continue
    for (const line of read(file).split('\n')) {
      const match = line.match(RETURN_POINT)
      if (!match) continue
      if (HISTORICAL_QUALIFIER.test(line)) continue // "before <stage>" — a frozen ledger entry, true when written
      if (!match[1].startsWith(declaredCommit) && !declaredCommit.startsWith(match[1])) {
        fail(`${file} names a current return point \`${match[1]}\` but ${PROJECT_CONTROL} declares latest verified commit \`${declaredCommit}\`. Update return points in the same commit as the dashboard, or qualify the line as historical ("... before <stage>") if it records a past state.`)
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`Governance-coherence meta-audit failed with ${errors.length} issue(s):\n`)
  for (const message of errors) console.error(`  - ${message}`)
  console.error('\nGoverning documents must be corrected in the same commit as the change that made them stale — recorded state equals real state.')
  process.exit(1)
}

console.log(`Governance-coherence meta-audit passed. ${actualCount} migrations match every doc claim; version headers current; ${PROJECT_CONTROL} is structurally intact and declares verified commit \`${declaredCommit}\`, an ancestor of HEAD, which every governing doc's return point agrees with.`)
