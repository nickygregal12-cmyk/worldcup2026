/**
 * Generates the real share image, through the real button, and writes the PNG to disk so it can
 * be looked at.
 *
 * Not a screenshot of the page — it drives the actual product path: lucky-dip the 36 group scores,
 * pick all 15 ties, click Share. Headless Chromium has no `navigator.share`, so the component
 * falls through to its download branch and Playwright catches the download. Whatever lands in
 * .visual-shots/ is byte-for-byte what a player's phone would produce.
 *
 * Like the other two harness scripts, this is a tool, not a gate — it is not wired into
 * `npm run check`.
 *
 *   node scripts/visual-share.mjs
 *
 * The same two environment traps as visual-shot.mjs apply and are handled the same way: point the
 * browser at the dev server's same-origin Supabase proxy, and deny time travel, or the local
 * stack's 2028-06-14 clock puts the board past the prediction lock and nothing can be picked at all.
 */
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'
import { THEME_STORAGE_KEY } from '../src/app/theme.js'

const PORT = 5175 // 5173 is visual-shot, 5174 is visual-probe
const ORIGIN = `http://127.0.0.1:${PORT}`
const OUT_DIR = path.join(process.cwd(), '.visual-shots')

function startDevServer() {
  const child = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
    {
      cwd: process.cwd(),
      detached: true,
      env: {
        ...process.env,
        VITE_SUPABASE_URL: `${ORIGIN}/local-supabase`,
        VITE_ENABLE_TIME_TRAVEL: 'false',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  let exited = null
  child.on('exit', code => { exited = code })

  const ready = (async () => {
    const deadline = Date.now() + 60_000
    while (Date.now() < deadline) {
      if (exited !== null) throw new Error(`dev server exited early (code ${exited})`)
      try {
        const response = await fetch(ORIGIN, { signal: AbortSignal.timeout(2000) })
        if (response.ok) return
      } catch { /* not up yet */ }
      await new Promise(resolve => setTimeout(resolve, 400))
    }
    throw new Error('dev server did not answer within 60s')
  })()

  const stop = () => {
    try { process.kill(-child.pid, 'SIGTERM') } catch { child.kill('SIGTERM') }
  }
  return { stop, ready }
}

async function populateBracket(page) {
  await page.goto(`${ORIGIN}/#/groups`, { waitUntil: 'networkidle', timeout: 45_000 })
  await page.waitForSelector('.app-shell[data-route]', { timeout: 20_000 }).catch(() => {})
  const dipped = await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('button'))
      .find(candidate => candidate.textContent?.trim() === 'Fill empty scores')
    if (!button) return false
    button.click()
    return true
  })
  if (!dipped) throw new Error('no lucky dip control found on Groups — cannot reach a complete bracket')
  await page.waitForTimeout(1500)

  await page.goto(`${ORIGIN}/#/bracket`, { waitUntil: 'networkidle', timeout: 45_000 })
  await page.waitForSelector('.app-shell[data-route]', { timeout: 20_000 }).catch(() => {})

  for (let pass = 0; pass < 24; pass += 1) {
    const clicked = await page.evaluate(() => {
      const ties = Array.from(document.querySelectorAll('article[data-match-number]'))
      const next = ties.find(tie =>
        !tie.querySelector('.bracket-team-choice__action[aria-pressed="true"]')
        && tie.querySelector('.bracket-team-choice__action:not([disabled])'))
      if (!next) return false
      next.querySelector('.bracket-team-choice__action:not([disabled])').click()
      return true
    })
    if (!clicked) break
    await page.waitForTimeout(140)
  }

  return page.evaluate(
    () => document.querySelectorAll('.bracket-team-choice__action[aria-pressed="true"]').length,
  )
}

const { stop, ready } = startDevServer()
let failed = false

try {
  await ready
  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch()
  // The app theme is irrelevant to the image — it is painted in fixed dark broadcast colours by
  // design — but the page around the button IS themed, so the card is shot in both.
  for (const theme of ['dark', 'light']) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      colorScheme: theme,
      deviceScaleFactor: 2,
      acceptDownloads: true,
    })
    await context.addInitScript(([key, value]) => {
      window.localStorage.setItem(key, value)
    }, [THEME_STORAGE_KEY, theme])

    const page = await context.newPage()
    const problems = []
    page.on('console', message => { if (message.type() === 'error') problems.push(message.text()) })
    page.on('pageerror', error => problems.push(error.message))

    const picks = await populateBracket(page)
    if (picks !== 15) throw new Error(`bracket is ${picks}/15 — the share button will be disabled`)

    const share = page.getByRole('button', { name: 'Share my bracket' })
    await share.scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(OUT_DIR, `share-button-${theme}.png`) })

    const download = page.waitForEvent('download', { timeout: 30_000 })
    await share.click()
    const file = await download
    const target = path.join(OUT_DIR, `share-image-${theme}.png`)
    await file.saveAs(target)

    console.log(`${path.relative(process.cwd(), target)}  (suggested name: ${file.suggestedFilename()})`)
    for (const problem of problems.slice(0, 5)) {
      console.log(`    console error: ${problem}`)
      failed = true
    }
    await context.close()
  }
  await browser.close()
} catch (error) {
  console.error(`visual-share failed: ${error.message}`)
  failed = true
} finally {
  stop()
}

process.exit(failed ? 1 : 0)
