// Documentation-structure audit — the documentation constitution, enforced.
//
// Root cause this guards against: the corpus reached 168 top-level markdown documents, of which an
// agent needed about forty. Closed stage specs, handover prompts and completed briefs sat in docs/
// looking exactly like current guidance, and nothing could tell an agent which was which. Archiving
// them fixes the corpus once; this audit is what stops it growing back.
//
// Enforced:
//   1. Every docs/*.md is either declared living in the authority map, or archived. No third state.
//   2. Every docs/archive/*.md opens with the ARCHIVED banner — an archive entry that does not say
//      it is archived is worse than no archive at all.
//   3. Root markdown is limited to the four permitted files.
//   4. REPORT-* files live in reports/ and nowhere else.
//
// The living set is PARSED FROM THE MAP, not duplicated here: a hardcoded second copy would drift
// from the map it claims to enforce, and the first thing to go stale would be the staleness guard.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const MAP = 'AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md'
const ARCHIVE_DIR = 'docs/archive'
const BANNER_OPENER = '> **ARCHIVED — historical record of completed work.**'

// Root markdown is a closed set. CLAUDE.md is the standing law and AGENTS.md the entry point;
// PROJECT-CONTROL.md is the live dashboard; README.md is for humans arriving cold.
const ALLOWED_ROOT_MARKDOWN = Object.freeze(['CLAUDE.md', 'AGENTS.md', 'PROJECT-CONTROL.md', 'README.md'])

// The eight league-named stage records that were once deferred behind the Leagues boundary are
// archived as of the DP-LEAGUES re-cut (2026-07-15): the audits that asserted them were re-pointed at
// the re-cut source in the same change, so the exception they needed is gone. No named exception
// remains — every docs/*.md is either declared living or archived.

if (!fs.existsSync(path.join(root, MAP))) {
  console.error(`Documentation-structure audit failed: the authority map ${MAP} is missing.`)
  process.exit(1)
}

// ── The living set, as the map itself declares it ───────────────────────────
// Any `docs/<name>.md` in a backticked cell of the map is a declared living document.
const mapSource = read(MAP)
const declaredLiving = new Set(
  [...mapSource.matchAll(/`docs\/([A-Za-z0-9._-]+\.md)`/g)].map(match => match[1]),
)

if (declaredLiving.size === 0) {
  fail(`${MAP} declares no living documents — the map is the index and cannot be empty.`)
}

// ── 1. Every top-level docs/*.md is declared living, or it should be archived ──
const topLevelDocs = fs.readdirSync(path.join(root, 'docs'))
  .filter(name => name.endsWith('.md'))
  .sort()

for (const name of topLevelDocs) {
  if (declaredLiving.has(name)) continue
  fail(
    `docs/${name} is not in the living set declared by ${MAP}. Either add a row for it in the same `
    + `commit (a new document needs a job no existing document has), or archive it: `
    + `git mv docs/${name} ${ARCHIVE_DIR}/${name}, add the ARCHIVED banner, and repoint any audit that reads it.`,
  )
}

// A document declared living in the map must actually exist, or the map is lying.
for (const name of declaredLiving) {
  const onDisk = topLevelDocs.includes(name)
  if (!onDisk && !fs.existsSync(path.join(root, 'docs', name))) {
    fail(`${MAP} declares docs/${name} as living, but no such file exists. Remove the row or restore the file.`)
  }
}

// ── 2. Every archived document says it is archived ──────────────────────────
if (fs.existsSync(path.join(root, ARCHIVE_DIR))) {
  const archived = fs.readdirSync(path.join(root, ARCHIVE_DIR)).filter(name => name.endsWith('.md'))
  if (archived.length === 0) fail(`${ARCHIVE_DIR}/ exists but is empty.`)
  for (const name of archived) {
    const source = read(`${ARCHIVE_DIR}/${name}`)
    if (!source.startsWith(BANNER_OPENER)) {
      fail(
        `${ARCHIVE_DIR}/${name} does not open with the ARCHIVED banner. An archived document that does `
        + `not announce itself as archived reads exactly like current guidance. Add the banner from ${MAP}.`,
      )
    }
    if (declaredLiving.has(name)) {
      fail(`${name} is both archived and declared living in ${MAP}. It cannot be both — remove its row from the map.`)
    }
  }
}

// ── 3. Root markdown is a closed set ────────────────────────────────────────
const rootMarkdown = fs.readdirSync(root).filter(name => name.endsWith('.md'))
for (const name of rootMarkdown) {
  if (ALLOWED_ROOT_MARKDOWN.includes(name)) continue
  fail(
    `${name} is stray root-level markdown. The root permits only ${ALLOWED_ROOT_MARKDOWN.join(', ')}. `
    + `Move it into docs/ with a row in ${MAP}, or archive it: git mv ${name} ${ARCHIVE_DIR}/${name}.`,
  )
}

// ── 4. Session reports live in reports/, and nowhere else ───────────────────
// reports/ is gitignored, so this catches a REPORT- file written to the wrong place — the failure
// mode being that it gets committed as though it were a durable document.
const REPORT_SEARCH_ROOTS = ['.', 'docs', ARCHIVE_DIR, 'AGENT-CONTROL', 'scripts', 'src']
for (const dir of REPORT_SEARCH_ROOTS) {
  const full = path.join(root, dir)
  if (!fs.existsSync(full)) continue
  for (const name of fs.readdirSync(full)) {
    if (!/^REPORT-/i.test(name)) continue
    fail(
      `${path.posix.join(dir === '.' ? '' : dir, name)} is a session report outside reports/. `
      + `Reports live in reports/ named REPORT-<topic>-<date>.md, and reports/ is gitignored — `
      + `a report anywhere else gets committed as though it were durable guidance.`,
    )
  }
}

if (errors.length > 0) {
  console.error(`Documentation-structure audit failed with ${errors.length} issue(s):\n`)
  for (const message of errors) console.error(`  - ${message}`)
  console.error(`\nThe living set is declared in ${MAP}. It is the only index that describes what is true now.`)
  process.exit(1)
}

const archivedCount = fs.existsSync(path.join(root, ARCHIVE_DIR))
  ? fs.readdirSync(path.join(root, ARCHIVE_DIR)).filter(name => name.endsWith('.md')).length
  : 0
console.log(
  `Documentation-structure audit passed. ${declaredLiving.size} living documents declared in the authority map; `
  + `${archivedCount} archived and bannered; no named exceptions; root markdown clean.`,
)
