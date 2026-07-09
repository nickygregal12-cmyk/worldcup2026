import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const exists = file => fs.existsSync(path.join(root, file))
const fail = message => errors.push(message)
const mustExist = file => { if (!exists(file)) fail(`Missing required handover/reference file: ${file}`) }
const mustContain = (file, marker) => {
  const source = read(file)
  if (!source.includes(marker)) fail(`${file} is missing marker: ${marker}`)
}

for (const file of [
  'docs/STAGE-13G-HANDOVER-20260705.md',
  'docs/NEXT-CHAT-PROMPT-STAGE-13G-CONTINUATION.md',
  'docs/STAGE-13G-HANDOVER-ZIP-GUIDE.md',
  'docs/STAGE-13G-MATCH-CENTRE-REFERENCE-ADOPTION.md',
  'docs/STAGE-13G-PLAYER-DESTINATIONS-REFERENCE-ADOPTION.md',
  'docs/STAGE-13G-UI-COPY-HYGIENE-REFERENCE.md',
  'docs/reference-prototypes/euro28-stage13g-expanded-agent-prompt.md',
  'docs/reference-prototypes/euro28-guest-transfer-modal-prototype.html',
  'docs/reference-prototypes/euro28-head-to-head-page-prototype.html',
  'docs/reference-prototypes/euro28-points-breakdown-page-prototype.html',
  // The spec-echo audit's canonical home is scripts/; the byte-identical copy the
  // install pack once placed in reference-prototypes/ was removed as duplicate debt.
  'scripts/check-user-facing-spec-echo.mjs',
]) mustExist(file)

mustContain('docs/STAGE-13G-HANDOVER-20260705.md', '64f2f3e Restyle Stage 13G admin control room')
mustContain('docs/STAGE-13G-HANDOVER-20260705.md', 'only `check-user-facing-spec-echo.mjs` is available')
mustContain('docs/NEXT-CHAT-PROMPT-STAGE-13G-CONTINUATION.md', 'Stage 13G-MATCH-CENTRE-REF')
mustContain('docs/STAGE-13G-HANDOVER-ZIP-GUIDE.md', 'zip -r "$ZIP" euro28predictor')
mustContain('docs/STAGE-13G-MATCH-CENTRE-REFERENCE-ADOPTION.md', 'Group-stage fixtures (`matchNumber <= 36`) render Original Predictor only')
mustContain('docs/STAGE-13G-PLAYER-DESTINATIONS-REFERENCE-ADOPTION.md', 'Do not rebuild scoring, resolver or comparison engines')
mustContain('docs/STAGE-13G-UI-COPY-HYGIENE-REFERENCE.md', 'must not be wired into `npm run check` alone')
mustContain('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md', 'Stage 13G handover and next-reference alignment')
mustContain('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md', '734ad9b')
mustContain('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md', '64f2f3e')
mustContain('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md', 'Stage 13G handover and next-reference alignment — 2026-07-05')
mustContain('docs/EURO28-AGENT-RULES-AND-ROADMAP.md', 'Stage 13G handover checkpoint — after Admin restyle')
mustContain('docs/EURO28-DESIGN-CHARTER.md', 'Copy is written for the player reading it')

const pkg = JSON.parse(read('package.json'))
if (pkg.scripts['audit:stage13g-handover-alignment'] !== 'node scripts/check-stage13g-handover-alignment.mjs') {
  fail('package.json is missing audit:stage13g-handover-alignment')
}
if (!pkg.scripts.check.includes('npm run audit:stage13g-handover-alignment')) {
  fail('package.json check script does not run audit:stage13g-handover-alignment')
}

if (errors.length > 0) {
  console.error(`Stage 13G handover alignment audit failed with ${errors.length} issue(s):`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('Stage 13G handover alignment audit passed.')
console.log('References: expanded prompt, guest-transfer modal, H2H, points breakdown and spec-echo script are recorded.')
console.log('Docs: Match Centre, Player destinations, UI-copy hygiene and next-chat handover are aligned.')
console.log('Scope: docs/reference/handover only; no UI, resolver, scoring, Supabase write or migration change.')
