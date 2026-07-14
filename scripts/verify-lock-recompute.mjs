// Stage LOCK-RECOMPUTE — proof that the lock engages on a page nobody touches.
//
// The bug: resolveTournamentLifecycle read the clock inside a useMemo keyed only on
// `tournament`, so `locked` was decided once, at mount. Twelve simulated days past the
// first kick-off the bracket was still fully editable. In production a player holding the
// page across 9 June 2028 kept an editable board until they happened to reload.
//
// A unit test can prove the hook re-evaluates. It cannot prove the whole chain, and the
// chain is the point, because two of its links are exactly where the bug lived:
//
//   tournament_time_controls row moves          (npm run scenario:set-time)
//     → useTournamentTimeControl polls it       (every 30s)
//     → setClockOverride mutates module state   (invisible to React — link one)
//     → the clock subscription fires            (new)
//     → useTournamentLifecycle re-resolves      (was frozen at mount — link two)
//     → the board renders Locked
//
// So this drives the real app, signed in as a seeded persona with a real bracket, and
// never reloads the page. A sentinel planted on `window` at first paint is asserted at the
// end: if the page had reloaded, the sentinel would be gone and the proof would be worthless.
//
// Run: VISUAL_ENABLE_TIME_TRAVEL=true node scripts/verify-lock-recompute.mjs
// (with the STAGE16A_* / SUPABASE_* local seed env exported — the same env the seeder needs)

import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { THEME_STORAGE_KEY } from '../src/app/theme.js'
import { resolveVisualTimeTravel, visualTimeTravelEnabled, VISUAL_TIME_TRAVEL_ENV } from './lib/visualTimeTravel.mjs'

const REPO = path.dirname(fileURLToPath(new URL('.', import.meta.url)))
const OUT = path.join(REPO, '.review-artifacts', 'lock-recompute')
const PORT = 5178
const ORIGIN = `http://127.0.0.1:${PORT}`
const SUPABASE = 'http://127.0.0.1:54321'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

// exact_score_heavy owns 36 group predictions and all 15 bracket picks, and is NOT one of
// the submitted personas — a submitted board renders "Review mode" and would mask the very
// state under test. Here `readOnly` is driven by `locked` and nothing else.
const PERSONA = 'exact_score_heavy@synthetic.euro28.test'
const PASSWORD = 'synthetic-not-a-real-login'

// The prediction lock is the first kick-off: Wales v Germany, 2028-06-09T19:00:00Z.
const LOCK_AT = '2028-06-09T19:00:00Z'
const BEFORE = '2028-06-09T18:00:00Z'

const setClock = iso => execFileSync('npm', ['run', '--silent', 'scenario:set-time', '--', iso], { cwd: REPO, stdio: 'pipe' })

async function signIn() {
  const response = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: PERSONA, password: PASSWORD }),
  })
  if (!response.ok) throw new Error(`persona sign-in failed (${response.status}): ${await response.text()}`)
  const session = await response.json()
  if (!session.access_token) throw new Error('persona sign-in returned no access token')
  return session
}

/** What the board is telling the player, in its own words. */
async function readBoard(page) {
  return page.evaluate(() => {
    const strong = [...document.querySelectorAll('strong')].map(node => node.textContent.trim())
    const state = strong.find(text => ['Editable', 'Locked', 'Review mode'].includes(text)) ?? null
    const controls = [...document.querySelectorAll('button, input, select')]
    // textContent, not innerText: the responsive layout keeps one workspace strip hidden at
    // any given width, and innerText would silently drop it.
    const text = document.body.textContent
    return {
      state,
      // "Account workspace" proves we are looking at the seeded persona's own board and
      // not a guest draft, which would lock identically and prove nothing about the seed.
      workspace: /Account workspace/.test(text) ? 'account' : /Guest workspace/.test(text) ? 'guest' : null,
      disabledPicks: controls.filter(control => control.disabled).length,
      // Planted at first paint. Survives only if the page was never reloaded.
      heldOpen: Boolean(window.__lockProbeSentinel),
      bracketPicks: text.match(/(\d+)\s*\/\s*15/)?.[1] ?? null,
    }
  })
}

async function main() {
  if (!visualTimeTravelEnabled()) {
    throw new Error(`${VISUAL_TIME_TRAVEL_ENV}=true is required: this harness exists to photograph simulated time`)
  }
  fs.mkdirSync(OUT, { recursive: true })

  console.log(`clock → ${BEFORE} (one hour before the first kick-off)`)
  setClock(BEFORE)

  const session = await signIn()
  console.log(`signed in as ${PERSONA}`)

  const server = spawn('node', ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
    cwd: REPO,
    env: {
      ...process.env,
      VITE_SUPABASE_URL: `${ORIGIN}/local-supabase`,
      VITE_APP_ENV: 'staging',
      VITE_ENABLE_TIME_TRAVEL: resolveVisualTimeTravel(),
    },
    stdio: 'ignore',
  })

  const deadline = Date.now() + 60_000
  for (;;) {
    try { if ((await fetch(ORIGIN, { signal: AbortSignal.timeout(2000) })).ok) break } catch { /* booting */ }
    if (Date.now() > deadline) throw new Error('dev server did not boot')
    await new Promise(resolve => setTimeout(resolve, 400))
  }

  const browser = await chromium.launch()
  const failures = []
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1400 }, deviceScaleFactor: 2, colorScheme: 'dark' })
    // supabase-js keys its session on the first hostname label: 127.0.0.1 → sb-127-auth-token.
    await context.addInitScript(([token, themeKey]) => {
      localStorage.setItem('sb-127-auth-token', token)
      localStorage.setItem(themeKey, 'dark')
      window.__lockProbeSentinel = true
    }, [JSON.stringify(session), THEME_STORAGE_KEY])

    const page = await context.newPage()
    await page.goto(`${ORIGIN}/#/bracket`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3500)

    const before = await readBoard(page)
    await page.screenshot({ path: path.join(OUT, '01-before-lock-editable.png'), fullPage: false })
    console.log(`\nbefore  ${BEFORE}  →  ${JSON.stringify(before)}`)
    if (before.state !== 'Editable') failures.push(`pre-lock board should be Editable, was ${before.state}`)
    if (before.workspace !== 'account') failures.push(`expected the seeded persona's account board, got ${before.workspace}`)
    if (before.bracketPicks !== '15') failures.push(`the seeded persona's 15 bracket picks did not render (got ${before.bracketPicks})`)

    // The page is now left strictly alone. Only the world moves.
    console.log(`\nclock → ${LOCK_AT} (the first kick-off) — the page is NOT touched`)
    setClock(LOCK_AT)

    // useTournamentTimeControl polls every 30s; allow it a margin and watch the DOM flip.
    const flipDeadline = Date.now() + 50_000
    let after = before
    for (;;) {
      await page.waitForTimeout(1000)
      after = await readBoard(page)
      if (after.state === 'Locked') break
      if (Date.now() > flipDeadline) break
    }
    const waited = Math.round((Date.now() - (flipDeadline - 50_000)) / 1000)

    await page.screenshot({ path: path.join(OUT, '02-after-lock-locked.png'), fullPage: false })
    console.log(`after   ${LOCK_AT}  →  ${JSON.stringify(after)}   (flipped after ~${waited}s of polling)`)

    if (after.state !== 'Locked') failures.push(`the lock never engaged on the open page (state ${after.state})`)
    if (after.disabledPicks === 0) failures.push('the locked board still offers editable picks (disabledPicks: 0)')
    if (!after.heldOpen) failures.push('the page reloaded — the no-reload claim is unproven')
  } finally {
    await browser.close()
    server.kill()
  }

  console.log('')
  if (failures.length) {
    for (const failure of failures) console.error(`FAIL  ${failure}`)
    process.exitCode = 1
    return
  }
  console.log('PASS  the lock engaged at the first kick-off on a page that was never reloaded,')
  console.log('      and the seeded persona\'s bracket locked with it.')
  console.log(`      screenshots: ${path.relative(REPO, OUT)}/`)
}

await main()
