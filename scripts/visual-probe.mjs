/**
 * Visual PROBE — the things a screenshot cannot tell you.
 *
 * visual-shot.mjs takes pictures. Pictures are how the Groups word-break was found, and they are
 * also how all four of the defects this script exists for got PAST a green suite and a green
 * screenshot run, onto a real iPhone, and into the owner's hands. A picture is a poor instrument:
 *
 *  1. HORIZONTAL OVERFLOW is invisible in one. `fullPage: true` grows the capture to the content
 *     box, so a page 1120px wide inside a 390px viewport is photographed at 1120px and looks
 *     serene. On the handset it is a page you have to pan sideways to read.
 *  2. STICKY cannot be photographed from the top of the page. A fullPage capture paints the
 *     document at scroll 0 — the existing harness says so about the bottom nav — so an element
 *     that would pin under the header on scroll is captured exactly where a non-sticky one would
 *     be. The picture is identical whether the fix works or not.
 *  3. CONTRAST is not something you can see reliably and never something you can measure by eye.
 *     scripts/check-token-contrast-usage.mjs is explicit that it cannot bind a JSX-composed
 *     descendant (a TeamLabel) to the ancestor that paints it (a navy champion card), and it
 *     names "the runtime browser contrast walk (Playwright layer)" as the completing guard for
 *     that class of bug. This is that guard. It did not exist; the bug it predicts did.
 *  4. TOUCH is not emulated by default. Headless Chromium reports `pointer: fine` at any width,
 *     so a `@media (pointer: coarse)` rule simply does not exist for a default context, and a
 *     390px screenshot will happily show you the mouse-sized target. The phone context here sets
 *     hasTouch/isMobile, so the honest media query is the one that applies.
 *
 * So this measures, in the real browser, against the real dev server, and fails loudly:
 *
 *   node scripts/visual-probe.mjs                 # the bracket
 *   node scripts/visual-probe.mjs '#/groups'      # any route
 *
 * Proof-of-concept, like the harness it sits beside: deliberately NOT wired into `npm run check`.
 * Whether it becomes a gate is a separate decision, and a real one — the contrast walk in
 * particular will have opinions about surfaces nobody has looked at yet.
 *
 * The dev-server and theme trickery is inherited wholesale from visual-shot.mjs; see the comments
 * there for why the Supabase URL is rewritten and why Vite is pinned to 127.0.0.1.
 */
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'
import { THEME_STORAGE_KEY } from '../src/app/theme.js'
import { resolveVisualTimeTravel } from './lib/visualTimeTravel.mjs'

const PORT = 5174 // not 5173: so a probe and a shot run can coexist
const ORIGIN = `http://127.0.0.1:${PORT}`
const OUT_DIR = path.join(process.cwd(), '.visual-shots')

const MIN_CONTRAST = 4.5
const MIN_CONTRAST_LARGE = 3.0
const MIN_TOUCH_TARGET = 44 // px — the floor a finger needs; the DP 48px law is stricter still

const VIEWPORTS = [
  // A real iPhone 14/15: 390 logical px, and a FINGER. `isMobile` also honours the viewport meta
  // tag the way a handset does, which a plain 390px desktop context does not.
  { name: 'phone', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  { name: 'desktop', width: 1440, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 2 },
]
const THEMES = ['light', 'dark']

const routes = process.argv.slice(2)
if (routes.length === 0) routes.push('#/bracket')

const slug = route => (route.replace(/^#\/?/, '').replace(/[^a-z0-9]+/gi, '-') || 'home').toLowerCase()

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
        /*
         * Turn the simulated clock OFF for this run, and this is not a detail — it is most of the
         * reason these four defects reached a real handset.
         *
         * The local stack's tournament_time_controls row is enabled at 2028-06-14, which is five
         * days AFTER the prediction lock. Time travel is on in .env.local, so the app honours it,
         * so every local visit to the bracket lands on a board that is LOCKED: nothing can be
         * picked, so there is no champion on the card and no slot is ever "Selected to advance".
         * That is precisely the state in which the champion-card contrast failure and the chart's
         * name/label collision do not exist. The page looked fine because we were looking at a
         * page the owner never sees.
         *
         * `canApplyStagingTime` needs appEnv=staging AND enableTimeTravel — deny the second and
         * the app clears the override and uses the real clock, which is comfortably pre-lock. The
         * .env.local file is not touched, exactly as with the Supabase URL above.
         *
         * That denial is still the default. It is no longer hardcoded: a run that genuinely wants
         * a tournament-phase page asks for it with VISUAL_ENABLE_TIME_TRAVEL=true, so the opt-in is
         * explicit and no run drifts into simulated time by accident.
         */
        VITE_ENABLE_TIME_TRAVEL: resolveVisualTimeTravel(),
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

/*
 * Everything below runs INSIDE the page. It is one big function because page.evaluate ships a
 * single closure across the bridge and cannot see this module's scope.
 */
const PROBE = () => {
  const luminance = ([r, g, b]) => {
    const channel = value => {
      const c = value / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  }
  const contrast = (fore, back) => {
    const [a, b] = [luminance(fore), luminance(back)].sort((x, y) => y - x)
    return (a + 0.05) / (b + 0.05)
  }
  /* Chromium hands back `color(srgb 0.93 0.96 0.95)` for anything that went through color-mix(),
     and this page is full of color-mix. Those channels are 0–1, not 0–255: read them as bytes and
     a pale mint background reports as near-black, which is a contrast failure the page does not
     have. A measuring instrument that cries wolf gets ignored, so it converts rather than guesses. */
  const parse = value => {
    const parts = (value.match(/[\d.]+/g) ?? []).map(Number)
    if (parts.length < 3) return null
    const srgb = value.startsWith('color(')
    const rgb = parts.slice(0, 3).map(channel => (srgb ? Math.round(channel * 255) : channel))
    return { rgb, alpha: parts.length > 3 ? parts[3] : 1 }
  }
  const over = (fore, back, alpha) => fore.map((c, i) => Math.round(c * alpha + back[i] * (1 - alpha)))

  /* The colour actually behind an element: walk up compositing every translucent layer, and stop
     at the first thing that is opaque. A gradient or an image is not something we can read a
     single colour from, so it is reported as unknown rather than guessed at. */
  const backgroundBehind = element => {
    let layers = []
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node)
      if (style.backgroundImage && style.backgroundImage !== 'none') return { unknown: true }
      const colour = parse(style.backgroundColor)
      if (!colour || colour.alpha === 0) continue
      if (colour.alpha === 1) {
        let result = colour.rgb
        for (const layer of layers.reverse()) result = over(layer.rgb, result, layer.alpha)
        return { rgb: result }
      }
      layers.push(colour)
    }
    return { rgb: [255, 255, 255] }
  }

  const hasOwnText = element => Array.from(element.childNodes)
    .some(node => node.nodeType === 3 && node.textContent.trim().length > 0)

  const findings = { contrast: [], touch: [] }

  for (const element of document.querySelectorAll('main *')) {
    if (!hasOwnText(element)) continue
    const style = getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') continue
    const box = element.getBoundingClientRect()
    if (box.width < 2 || box.height < 2) continue
    // Screen-reader-only text is not painted; and a disabled control is exempt from WCAG 1.4.3,
    // which is the only reason the 0.55-opacity locked slots are not flagged here.
    if (style.clip === 'rect(0px, 0px, 0px, 0px)') continue
    if (element.closest('[disabled], [aria-disabled="true"]')) continue

    const fore = parse(style.color)
    const back = backgroundBehind(element)
    if (!fore || back.unknown) continue

    const size = parseFloat(style.fontSize)
    const weight = Number(style.fontWeight) || 400
    const large = size >= 24 || (size >= 18.66 && weight >= 700)
    const floor = large ? 3.0 : 4.5

    const painted = fore.alpha === 1 ? fore.rgb : over(fore.rgb, back.rgb, fore.alpha)
    const ratio = contrast(painted, back.rgb)
    if (ratio < floor) {
      findings.contrast.push({
        text: element.textContent.trim().slice(0, 42),
        selector: element.tagName.toLowerCase() + (element.className && typeof element.className === 'string' ? `.${element.className.trim().split(/\s+/).join('.')}` : ''),
        ratio: Math.round(ratio * 100) / 100,
        floor,
        colour: `rgb(${painted.join(',')})`,
        background: `rgb(${back.rgb.join(',')})`,
      })
    }
  }

  /* Touch targets, but only where a finger is actually the input device. */
  if (matchMedia('(pointer: coarse)').matches) {
    for (const control of document.querySelectorAll('main button, main a[href], main [role="button"]')) {
      const box = control.getBoundingClientRect()
      if (box.width < 2 || box.height < 2) continue
      if (box.height < 44) {
        findings.touch.push({
          text: (control.textContent || control.getAttribute('aria-label') || '').trim().slice(0, 42),
          height: Math.round(box.height * 10) / 10,
        })
      }
    }
  }

  const root = document.documentElement
  return {
    ...findings,
    coarsePointer: matchMedia('(pointer: coarse)').matches,
    documentOverflowsX: root.scrollWidth > root.clientWidth + 1,
    documentScrollWidth: root.scrollWidth,
    documentClientWidth: root.clientWidth,
  }
}

/* Does the round rail actually pin under the header once you scroll into the board? */
const STICKY_PROBE = () => {
  const rail = document.querySelector('nav[aria-label="Choose a round"]')
  if (!rail) return { present: false }
  const strip = rail.parentElement
  const style = getComputedStyle(strip)
  const box = strip.getBoundingClientRect()
  const header = document.querySelector('.app-header')
  const headerBottom = header ? header.getBoundingClientRect().bottom : 0
  return {
    present: true,
    position: style.position,
    // The whole question, in one number: after scrolling well past where the strip started, is it
    // still on screen? A non-sticky strip is long gone (a large negative top).
    top: Math.round(box.top),
    headerBottom: Math.round(headerBottom),
    visible: box.top >= -1 && box.bottom <= window.innerHeight,
    pinnedUnderHeader: Math.abs(box.top - headerBottom) <= 2,
    scrollY: Math.round(window.scrollY),
  }
}

const WALL_PROBE = () => {
  const section = document.querySelector('[data-contract="original-bracket-g"]')
  const frame = document.querySelector('[data-wall-chart="seven-lanes"]')
  const root = document.documentElement
  const slots = Array.from(document.querySelectorAll('.bracket-team-choice__action'))
  const heights = slots.map(slot => slot.getBoundingClientRect().height)
  // Is any team name clipped inside its own box? This is the "Sco…" failure, measured. Name the
  // team: "1 of 32 clipped" sends you hunting, "Netherlands" tells you it is a long word in a
  // narrow lane and that the lucky dip only sometimes deals you one.
  const names = Array.from(document.querySelectorAll('[data-team-label-copy] strong'))
  const clipped = names
    .filter(name => name.scrollWidth > name.clientWidth + 1)
    .map(name => `${name.textContent.trim()} (${name.scrollWidth}px of name in a ${name.clientWidth}px box)`)

  /*
   * And is any name BROKEN MID-WORD? A different failure from clipping, and invisible to the check
   * above — a hard-broken word still fits its box, it just fits it as "Switzerlan / d". Groups
   * shipped exactly that, and a narrow lane plus `overflow-wrap` will do it again the moment
   * `hyphens: auto` has no dictionary to work with, which in headless Chromium it never does.
   *
   * A word that was broken across lines paints as two client rects instead of one, so lay a Range
   * over each word and count them. This is the only thing here that sees the defect the human eye
   * caught first, and it is why it exists.
   */
  const brokenWords = []
  for (const name of names) {
    const node = name.firstChild
    if (!node || node.nodeType !== 3) continue
    const text = node.textContent
    for (const match of text.matchAll(/\S+/g)) {
      const range = document.createRange()
      range.setStart(node, match.index)
      range.setEnd(node, match.index + match[0].length)
      if (range.getClientRects().length > 1) brokenWords.push(`${text.trim()} — "${match[0]}" is split across lines`)
    }
  }
  return {
    wallMode: section?.getAttribute('data-wall-mode') ?? null,
    frameScrollsX: frame ? frame.scrollWidth > frame.clientWidth + 1 : false,
    frameScrollWidth: frame?.scrollWidth ?? 0,
    frameClientWidth: frame?.clientWidth ?? 0,
    documentOverflowsX: root.scrollWidth > root.clientWidth + 1,
    minSlotHeight: heights.length ? Math.round(Math.min(...heights) * 10) / 10 : null,
    slotCount: slots.length,
    clippedNames: clipped,
    brokenWords,
    nameCount: names.length,
  }
}

let failed = false
const problems = []
const note = message => { console.log(message) }
const bad = message => { problems.push(message); failed = true; console.log(`  FAIL  ${message}`) }

/*
 * Drive the product into the state the defects actually live in.
 *
 * An empty bracket hides two of the four. The champion card shows its empty-state prompt until you
 * have a champion — white on navy, which is fine — and the contrast failure is the TEAM NAME that
 * replaces it. And no tie is `.slotSelected` until it is picked, so the chart card never paints the
 * selected-state label beside a name, which is the collision in the photograph. A probe against a
 * fresh guest measures a page nobody has ever complained about.
 *
 * So: lucky-dip the 36 group scores (the bracket is content-locked until they exist), then pick a
 * winner in every tie the resolver has unblocked, round by round — each pick resolves the next.
 */
async function populateBracket(page) {
  await page.goto(`${ORIGIN}/#/groups`, { waitUntil: 'networkidle', timeout: 45_000 })
  await page.waitForSelector('.app-shell[data-route]', { timeout: 20_000 }).catch(() => {})
  // Through the DOM, not Playwright's actionability: the lucky dip lives inside a collapsed
  // disclosure, and opening the panel is not what is being tested here — having 36 scores is.
  const dipped = await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('button'))
      .find(candidate => candidate.textContent?.trim() === 'Fill empty scores')
    if (!button) return false
    button.click()
    return true
  })
  if (!dipped) return { picks: 0, champion: null, note: 'no lucky dip control found on Groups' }
  await page.waitForTimeout(1200)

  await page.goto(`${ORIGIN}/#/bracket`, { waitUntil: 'networkidle', timeout: 45_000 })
  await page.waitForSelector('.app-shell[data-route]', { timeout: 20_000 }).catch(() => {})

  // Lanes outside the open round are display:none, but they are in the DOM and a real click on
  // them runs the real handler — so the whole bracket fills without touching the rail.
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

  return page.evaluate(() => {
    const card = document.querySelector('[data-contract="original-bracket-g"] aside')
    const picks = document.querySelectorAll('.bracket-team-choice__action[aria-pressed="true"]').length
    return { picks, champion: card?.textContent?.trim().slice(0, 80) ?? null }
  })
}

async function probe(browser, route, viewport, theme) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    deviceScaleFactor: viewport.deviceScaleFactor,
    colorScheme: theme,
  })
  await context.addInitScript(([key, value]) => {
    window.localStorage.setItem(key, value)
  }, [THEME_STORAGE_KEY, theme])

  const page = await context.newPage()
  const label = `${slug(route)} · ${viewport.name} ${viewport.width}px · ${theme}`
  note(`\n── ${label} ──`)

  if (slug(route) === 'bracket') {
    const filled = await populateBracket(page)
    if (filled.picks < 15) bad(`only ${filled.picks} of 15 ties could be picked — the bracket is not in the state the defects live in`)
    else note(`  set up: all 15 ties picked · champion card reads "${filled.champion}"`)
  } else {
    await page.goto(`${ORIGIN}/${route}`, { waitUntil: 'networkidle', timeout: 45_000 })
    await page.waitForSelector('.app-shell[data-route]', { timeout: 20_000 }).catch(() => {})
  }
  await page.waitForLoadState('networkidle').catch(() => {})

  // ---- as the page first lands (list reading on a phone, chart on the desktop) ----
  const initial = await page.evaluate(PROBE)
  note(`  pointer: ${initial.coarsePointer ? 'coarse (touch emulated)' : 'fine'}`)

  if (initial.documentOverflowsX) {
    bad(`page scrolls sideways: document is ${initial.documentScrollWidth}px in a ${initial.documentClientWidth}px viewport`)
  } else {
    note(`  ok    no horizontal page scroll (${initial.documentScrollWidth}px in ${initial.documentClientWidth}px)`)
  }

  for (const finding of initial.contrast) {
    bad(`contrast ${finding.ratio}:1 (needs ${finding.floor}) — "${finding.text}" ${finding.colour} on ${finding.background}`)
  }
  if (initial.contrast.length === 0) note('  ok    every painted text element clears its WCAG floor')

  for (const finding of initial.touch) {
    bad(`touch target ${finding.height}px (needs ${MIN_TOUCH_TARGET}) — "${finding.text}"`)
  }
  if (initial.coarsePointer && initial.touch.length === 0) note(`  ok    every control clears ${MIN_TOUCH_TARGET}px for a finger`)

  // ---- the round rail: reachable from inside the board? ----
  await page.evaluate(() => window.scrollTo(0, 1400))
  await page.waitForTimeout(250)
  const sticky = await page.evaluate(STICKY_PROBE)
  if (sticky.present) {
    if (sticky.position !== 'sticky') bad(`round rail is position:${sticky.position} — it cannot pin`)
    else if (!sticky.visible) bad(`round rail scrolled out of view (top ${sticky.top}px at scrollY ${sticky.scrollY})`)
    else if (!sticky.pinnedUnderHeader) bad(`round rail is on screen but not pinned under the header (top ${sticky.top}, header bottom ${sticky.headerBottom})`)
    else note(`  ok    round rail pinned at ${sticky.top}px, under a header ending at ${sticky.headerBottom}px, at scrollY ${sticky.scrollY}`)
    await page.screenshot({ path: path.join(OUT_DIR, `probe-${slug(route)}-${viewport.name}-${theme}-scrolled.png`) })
  }
  await page.evaluate(() => window.scrollTo(0, 0))

  // ---- the chart: on the phone, behind the toggle; on the desktop, already the view ----
  const toggle = page.locator('button', { hasText: 'View as wall chart' })
  if (await toggle.count() > 0 && await toggle.first().isVisible()) {
    await toggle.first().click()
    await page.waitForTimeout(350)
  }
  const wall = await page.evaluate(WALL_PROBE)
  if (wall.wallMode === 'on') {
    note(`  chart: data-wall-mode="on", ${wall.slotCount} slots`)
    if (wall.documentOverflowsX) bad(`the CHART made the PAGE scroll sideways (document ${wall.frameScrollWidth}px) — the frame is not containing it`)
    else note('  ok    chart scrolls inside its frame; the page does not move')
    if (!wall.frameScrollsX && viewport.width < 900) bad('chart does not scroll inside its frame on a phone — the lanes are being squeezed instead')
    else if (wall.frameScrollsX) note(`  ok    frame scrolls: ${wall.frameScrollWidth}px of lanes in a ${wall.frameClientWidth}px frame`)
    if (wall.clippedNames.length > 0) {
      for (const clipped of wall.clippedNames) bad(`team name clipped in the chart lane: ${clipped}`)
    } else note(`  ok    none of the ${wall.nameCount} team names are clipped`)
    if (wall.brokenWords.length > 0) {
      for (const broken of wall.brokenWords) bad(`team name broken mid-word in the chart lane: ${broken}`)
    } else note(`  ok    no team name is broken mid-word`)
    if (initial.coarsePointer && wall.minSlotHeight !== null && wall.minSlotHeight < MIN_TOUCH_TARGET) {
      bad(`smallest chart pick target is ${wall.minSlotHeight}px, under the ${MIN_TOUCH_TARGET}px finger floor`)
    } else if (wall.minSlotHeight !== null) {
      note(`  ok    smallest chart pick target ${wall.minSlotHeight}px`)
    }
    const chartContrast = await page.evaluate(PROBE)
    for (const finding of chartContrast.contrast) {
      bad(`chart contrast ${finding.ratio}:1 (needs ${finding.floor}) — "${finding.text}" ${finding.colour} on ${finding.background}`)
    }
    if (chartContrast.contrast.length === 0) note('  ok    chart text clears its WCAG floor too')
    await page.screenshot({ path: path.join(OUT_DIR, `probe-${slug(route)}-${viewport.name}-${theme}-chart.png`), fullPage: true })
  } else if (viewport.width < 900) {
    bad('the wall toggle did not put the board into chart mode')
  }

  await context.close()
}

const { stop, ready } = startDevServer()

try {
  await ready
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()
  for (const route of routes) {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        await probe(browser, route, viewport, theme)
      }
    }
  }
  await browser.close()
} catch (error) {
  console.error(`visual-probe failed: ${error.message}`)
  failed = true
} finally {
  stop()
}

console.log(`\n${'─'.repeat(60)}`)
if (problems.length) {
  console.log(`${problems.length} problem(s):`)
  for (const problem of problems) console.log(`  · ${problem}`)
} else if (failed) {
  console.log('visual-probe: the run itself failed — see the error above. Nothing was measured.')
} else {
  console.log('visual-probe: clean.')
}
process.exit(failed ? 1 : 0)
