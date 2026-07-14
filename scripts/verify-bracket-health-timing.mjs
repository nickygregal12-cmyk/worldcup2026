/**
 * Bracket Health reveal-timing verification.
 *
 * Drives the REAL app against the local Supabase stack, stepping the P6C fake clock through
 * the four states the brief demands, and screenshotting each in both themes at both viewports.
 *
 * Two things this has to solve that the stock harness cannot:
 *
 * 1. visual-shot.mjs hardcodes VITE_ENABLE_TIME_TRAVEL:'false' so it always shoots the real
 *    (pre-lock) clock. We need the simulated clock, so we boot our own dev server with time
 *    travel ON — the very thing that script deliberately denies, for its own good reasons.
 *
 * 2. No seeded persona owns a bracket (scenario:verify reports bracket_predictions: 0), and
 *    Bracket Health needs bracketComplete > 0. So we build a genuine GUEST draft through the
 *    app's own modules and resolver — never hand-rolled JSON — and inject it into localStorage.
 *    Picks are resolved iteratively so no pick is ever stale.
 */
import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { loadEuroApp } from '../src/runtime/loadEuroApp.js'
import { createGuestPredictionState } from '../src/guest/guestPredictionState.js'
import { buildGuestStorageKey } from '../src/guest/guestPredictionConfig.js'
import { buildGuestReviewStorageKey } from '../src/journey/predictionJourneyModel.js'
// The copy is imported, never retyped — the marker-hygiene ratchet forbids a script from
// hardcoding a sentence that also lives in src.
import {
  BRACKET_HEALTH_BEST_THIRD_PENDING,
  BRACKET_HEALTH_PENDING_COPY,
  BRACKET_HEALTH_PROJECTED_LABEL,
} from '../src/bracketHealth/bracketHealthCopy.js'
import { resolveEuro28Tournament, RESOLVER_CONTEXT } from '../src/resolver/index.js'
import { THEME_STORAGE_KEY } from '../src/app/theme.js'

const REPO = process.cwd()
const PORT = 5176
const ORIGIN = `http://127.0.0.1:${PORT}`
const OUT = process.argv[2] || '/tmp/bh-shots'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

// The states the brief names, plus the one that actually exercises the design: groups reach
// the threshold on different days (A on the 14th, B and C on the 15th, F not until the 17th),
// so a genuinely MIXED partial state exists and has to be shown, not assumed away.
const STATES = [
  { key: 'a-pre-tournament', clock: '2028-06-09T12:00:00Z', expect: 'no tab at all' },
  { key: 'b-below-threshold', clock: '2028-06-13T22:00:00Z', expect: 'no tab; "opens once" line (0/6 ready)' },
  { key: 'c-partial-mixed', clock: '2028-06-15T22:00:00Z', expect: 'tab; A,B,C projected, D,E,F placeholders, best-thirds withheld (3/6)' },
  { key: 'd-all-groups-ready', clock: '2028-06-17T22:00:00Z', expect: 'tab; all slots projected incl. best-thirds (6/6), groups still incomplete' },
  { key: 'e-groups-complete', clock: '2028-06-21T22:00:00Z', expect: 'tab; real fixtures, no projection, matches resolver' },
]

const VIEWPORTS = [
  { name: 'phone-390', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'desktop-1440', width: 1440, height: 900, isMobile: false, hasTouch: false },
]

function setClock(iso) {
  execFileSync('npm', ['run', 'scenario:set-time', '--', iso], {
    cwd: REPO, stdio: 'pipe', env: process.env, timeout: 240000,
  })
}

// Build a complete, internally-consistent guest bracket using the app's own resolver.
async function buildGuestDraft() {
  const client = createClient('http://127.0.0.1:54321', ANON)
  const app = await loadEuroApp(client)
  const reference = app.guestReference
  const state = createGuestPredictionState(reference)

  // Deterministic group scores that give every group real separation, so the projected
  // standings are unambiguous rather than a wall of tie-break fallbacks.
  const groupMatches = reference.groupMatches.map((match, index) => {
    const home = (index % 3) + 1
    const away = index % 2
    state.groupPredictions[String(match.matchNumber)] = {
      matchNumber: match.matchNumber, homeScore: home, awayScore: away,
      jokerApplied: false, updatedAt: new Date(0).toISOString(),
    }
    return { ...match, context: RESOLVER_CONTEXT.GUEST, homeScore: home, awayScore: away }
  })

  // Resolve, pick the home side of every newly-resolved tie, repeat. Each pick unlocks the
  // next round's participants, exactly as a player clicking through the bracket would.
  const decisions = []
  for (let pass = 0; pass < 15; pass += 1) {
    const resolved = resolveEuro28Tournament({
      context: RESOLVER_CONTEXT.GUEST, groups: reference.groups, groupMatches, knockoutDecisions: decisions,
    })
    const next = resolved.knockout.matches.find(
      match => match.participantsResolved && !decisions.some(d => d.matchNumber === match.matchNumber),
    )
    if (!next) break
    decisions.push({
      context: RESOLVER_CONTEXT.GUEST, matchNumber: next.matchNumber,
      advancingTeamId: next.homeTeamId, decisionMethod: 'normal_time', resultRevision: 0,
    })
  }
  for (const decision of decisions) {
    state.bracketPredictions[String(decision.matchNumber)] = {
      matchNumber: decision.matchNumber, advancingTeamId: decision.advancingTeamId,
      updatedAt: new Date(0).toISOString(),
    }
  }
  if (decisions.length !== 15) throw new Error(`Guest bracket incomplete: ${decisions.length}/15 picks`)
  return {
    key: buildGuestStorageKey(reference),
    value: JSON.stringify(state),
    // Put the guest in the SUBMITTED state. That is deliberate, and it is the exact state
    // the owner complained about: reviewMode is what used to make Health appear months
    // early. It also sidesteps `locked`, which does not engage under the simulated clock —
    // resolveTournamentLifecycle reads getNow() inside a useMemo keyed only on `tournament`,
    // so it is computed once against the real clock and never recomputed when the override
    // lands. Reported as an advisory finding; not this session's to fix.
    reviewKey: buildGuestReviewStorageKey(reference),
    reference,
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const draft = await buildGuestDraft()
  console.log(`guest draft: 36 group scores + ${15} bracket picks, key ${draft.key.slice(0, 46)}…`)

  const server = spawn('node', ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
    cwd: REPO,
    env: {
      ...process.env,
      VITE_SUPABASE_URL: `${ORIGIN}/local-supabase`,
      VITE_APP_ENV: 'staging',
      VITE_ENABLE_TIME_TRAVEL: 'true', // the whole point: honour the simulated clock
    },
    stdio: 'ignore',
  })

  const deadline = Date.now() + 60000
  for (;;) {
    try { if ((await fetch(ORIGIN, { signal: AbortSignal.timeout(2000) })).ok) break } catch { /* boot */ }
    if (Date.now() > deadline) throw new Error('dev server did not boot')
    await new Promise(r => setTimeout(r, 400))
  }

  const browser = await chromium.launch()
  const findings = []

  for (const state of STATES) {
    setClock(state.clock)
    console.log(`\n── ${state.key}  (clock ${state.clock})`)

    for (const viewport of VIEWPORTS) {
      for (const theme of ['light', 'dark']) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          isMobile: viewport.isMobile, hasTouch: viewport.hasTouch, deviceScaleFactor: 2,
          colorScheme: theme,
        })
        await context.addInitScript(([k, v, reviewKey, themeKey, themeVal]) => {
          localStorage.setItem(k, v)
          localStorage.setItem(reviewKey, 'review')
          localStorage.setItem(themeKey, themeVal)
        }, [draft.key, draft.value, draft.reviewKey, THEME_STORAGE_KEY, theme])

        const page = await context.newPage()
        await page.goto(`${ORIGIN}/#/bracket`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(2500)

        const probe = await page.evaluate(pending => {
          const tabs = document.querySelector('[role="tablist"][aria-label="Bracket view"]')
          const tabButtons = tabs ? [...tabs.querySelectorAll('[role="tab"]')] : []
          const body = document.body.innerText
          return {
            tabPresent: Boolean(tabs),
            tabLabels: tabButtons.map(b => b.innerText.replace(/\s+/g, ' ').trim()),
            tabHeights: tabButtons.map(b => Math.round(b.getBoundingClientRect().height)),
            pendingLine: body.includes(pending),
          }
        }, BRACKET_HEALTH_PENDING_COPY.heading)

        // Open the Health tab if it is there, so the screenshot shows the thing under test.
        if (probe.tabPresent) {
          await page.locator('[role="tab"]').nth(1).click()
          await page.waitForTimeout(1200)
          Object.assign(probe, await page.evaluate(([projectedLabel, bestThird]) => {
            // innerText renders text-transform:uppercase AS uppercase, so match case-insensitively.
            const text = document.body.innerText.toLowerCase()
            const count = needle => text.split(needle.toLowerCase()).length - 1
            return {
              projectedCards: count(projectedLabel),
              placeholderCards: count('real fixture not known yet'),
              knownReal: count('known real fixture'),
              groupsReady: (document.body.innerText.match(/(\d) of 6 groups have played two rounds/) || [])[1] ?? null,
              bestThirdNote: text.includes(bestThird.toLowerCase()),
              matchCentreLinks: document.querySelectorAll('a[href*="match-centre"]').length,
            }
          }, [BRACKET_HEALTH_PROJECTED_LABEL, BRACKET_HEALTH_BEST_THIRD_PENDING]))
        }

        const file = path.join(OUT, `${state.key}-${viewport.name}-${theme}.png`)
        await page.screenshot({ path: file, fullPage: true })
        if (viewport.name === 'desktop-1440' && theme === 'light') {
          findings.push({ state: state.key, expect: state.expect, ...probe })
        }
        await context.close()
      }
    }
  }

  await browser.close()
  server.kill()
  fs.writeFileSync(path.join(OUT, 'findings.json'), JSON.stringify(findings, null, 2))
  console.log('\n\n════ FINDINGS (desktop light; all 4 viewport/theme combos shot) ════')
  for (const f of findings) {
    console.log(`\n${f.state}  — expected: ${f.expect}`)
    console.log(`   tab present ......... ${f.tabPresent}`)
    if (f.tabPresent) console.log(`   tab labels .......... ${JSON.stringify(f.tabLabels)}  heights=${f.tabHeights}px`)
    console.log(`   "opens once" line ... ${f.pendingLine}`)
    if (f.tabPresent) {
      console.log(`   groups ready ........ ${f.groupsReady ?? '—'}/6`)
      console.log(`   R16 cards: projected=${f.projectedCards}  placeholder=${f.placeholderCards}  real=${f.knownReal}`)
      console.log(`   best-third withheld . ${f.bestThirdNote}`)
      console.log(`   Match Centre links .. ${f.matchCentreLinks}  (must be 0 while projected)`)
    }
  }
}

main().catch(error => { console.error(error); process.exit(1) })
