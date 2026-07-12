/**
 * Visual verification harness — screenshots of the real app, from this container.
 *
 * Proof-of-concept only. It is deliberately NOT wired into `npm run check`: making it a
 * required gate is a separate decision, once we know it holds up.
 *
 * What it does: boots the real Vite dev server, drives the real routes in headless
 * Chromium, and writes a PNG per (viewport × theme) into a gitignored folder. Nothing it
 * produces is committed.
 *
 *   node scripts/visual-shot.mjs                    # the Groups page
 *   node scripts/visual-shot.mjs '#/bracket' '#/'   # any number of routes
 *
 * Two things it has to get right, and both are environment-specific:
 *
 * 1. Supabase. .env.local points VITE_SUPABASE_URL at the *public Codespaces* host,
 *    because a browser on the owner's laptop cannot see 127.0.0.1 in this container.
 *    Chromium here has the opposite problem: it IS in the container, and the public host
 *    may be private or slow. The dev server already proxies the local stack at
 *    /local-supabase on its own origin (vite.config.js), so we point the browser at that
 *    same-origin path and the round trip never leaves the container.
 *
 * 2. Theme. The app resolves its theme from localStorage ('euro28:theme'), falling back
 *    to the OS preference. Setting the key in an init script — before any app code runs —
 *    is what actually decides it; emulating prefers-color-scheme as well means we are not
 *    relying on which of the two wins.
 */
import { spawn } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'
import { THEME_STORAGE_KEY } from '../src/app/theme.js'

const PORT = 5173
const ORIGIN = `http://127.0.0.1:${PORT}`
const OUT_DIR = path.join(process.cwd(), '.visual-shots')

// Phone width is the owner's 390px. Desktop is a common laptop viewport, wide enough that
// the responsive breakpoints (40rem / 56.25rem) are all on the far side of it.
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
]
const THEMES = ['light', 'dark']

const routes = process.argv.slice(2)
if (routes.length === 0) routes.push('#/groups')

const slug = route => (route.replace(/^#\/?/, '').replace(/[^a-z0-9]+/gi, '-') || 'home').toLowerCase()

/**
 * Boot the dev server and wait until it genuinely answers.
 *
 * --host 127.0.0.1 is not a nicety. Vite's default host is `localhost`, which on this
 * image resolves to ::1 first, so it binds IPv6 only and Chromium's request to
 * 127.0.0.1 is refused — a connection error that looks exactly like "the server never
 * started". Bind the interface we are actually going to ask for.
 *
 * Readiness is a poll of the port, not a grep of stdout: the banner is printed before the
 * socket is necessarily accepting, and a log format is a thing that changes.
 *
 * detached + a negative-PID kill because we would otherwise leak the server. Killing the
 * npm/npx wrapper leaves the real Vite process holding the port, and the NEXT run then
 * dies on --strictPort. That is exactly what happened the first time this ran.
 */
function startDevServer() {
  const child = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
    {
      cwd: process.cwd(),
      detached: true,
      env: {
        ...process.env,
        // Same-origin, in-container. Overrides the public Codespaces host in .env.local
        // for this run only; the file is untouched.
        VITE_SUPABASE_URL: `${ORIGIN}/local-supabase`,
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
      } catch {
        // not up yet
      }
      await new Promise(resolve => setTimeout(resolve, 400))
    }
    throw new Error('dev server did not answer within 60s')
  })()

  const stop = () => {
    try {
      process.kill(-child.pid, 'SIGTERM')
    } catch {
      child.kill('SIGTERM')
    }
  }

  return { stop, ready }
}

async function shoot(browser, route, viewport, theme) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    colorScheme: theme,
    deviceScaleFactor: 2,
  })

  // Before a line of app code runs, or the app boots light and repaints under us.
  await context.addInitScript(([key, value]) => {
    window.localStorage.setItem(key, value)
  }, [THEME_STORAGE_KEY, theme])

  const page = await context.newPage()
  const problems = []
  page.on('console', message => { if (message.type() === 'error') problems.push(message.text()) })
  page.on('pageerror', error => problems.push(error.message))

  await page.goto(`${ORIGIN}/${route}`, { waitUntil: 'networkidle', timeout: 45_000 })
  // The shell paints before its data lands. Wait for the app to say it has a route rather
  // than sleeping for a guessed interval and screenshotting a spinner.
  await page.waitForSelector('.app-shell[data-route]', { timeout: 20_000 }).catch(() => {})
  await page.waitForLoadState('networkidle').catch(() => {})

  const file = path.join(OUT_DIR, `${slug(route)}-${viewport.name}-${viewport.width}-${theme}.png`)
  await page.screenshot({ path: file, fullPage: true })

  const resolvedTheme = await page.evaluate(() => document.documentElement.dataset.theme ?? 'light')
  await context.close()

  return { file, resolvedTheme, problems }
}

const { stop, ready } = startDevServer()
let failed = false

try {
  await ready
  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch()
  for (const route of routes) {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        const { file, resolvedTheme, problems } = await shoot(browser, route, viewport, theme)
        const themeOk = resolvedTheme === theme ? 'ok' : `MISMATCH (page is ${resolvedTheme})`
        console.log(`${path.relative(process.cwd(), file)}  theme=${themeOk}`)
        // Report them; do not swallow them. A page that renders while throwing is not a
        // page that works, and a screenshot alone will not tell you that.
        for (const problem of problems.slice(0, 3)) console.log(`    console error: ${problem}`)
        if (resolvedTheme !== theme) failed = true
      }
    }
  }
  await browser.close()
} catch (error) {
  console.error(`visual-shot failed: ${error.message}`)
  failed = true
} finally {
  stop()
}

process.exit(failed ? 1 : 0)
