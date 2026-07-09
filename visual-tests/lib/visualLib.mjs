// Shared machinery for the visual tier: preview server lifecycle, deterministic
// page capture, pixel diffing and the freshness run-record.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawn, spawnSync } from 'node:child_process'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import {
  ARTIFACT_ROOT,
  FROZEN_INSTANT,
  PREVIEW_PORT,
  PREVIEW_URL,
  RUN_RECORD_PATH,
  WATCHED_GLOBS,
} from '../visual.config.mjs'

export const projectRoot = process.cwd()

export function artifactPath(...parts) {
  return path.join(projectRoot, ARTIFACT_ROOT, ...parts)
}

export function shotName(pageKey, viewportName) {
  return `${pageKey}--${viewportName}.png`
}

// ── Canonical-data preflight ─────────────────────────────────────────────────
// Captures are only meaningful against the canonical local dataset. Fail loud
// with the seed command rather than screenshotting whatever happens to exist.
export async function assertCanonicalLocalData() {
  const { createClient } = await import('@supabase/supabase-js')
  const env = readEnvLocal()
  const url = env.VITE_SUPABASE_URL || ''
  if (!/127\.0\.0\.1|localhost/.test(url)) {
    throw new Error(`visual tier requires .env.local to point at local Supabase, found host: ${url.replace(/^https?:\/\//, '') || '(unset)'}`)
  }
  const client = createClient(url, env.VITE_SUPABASE_ANON_KEY)
  const tournament = await client.from('tournaments').select('id').eq('code', 'euro-2028').single()
  if (tournament.error) throw new Error(`local Supabase is not reachable or unseeded (${tournament.error.message}). Run: npx supabase start && npx supabase migration up --local && npm run visual:seed`)
  const [kickoffs, slots, venues] = await Promise.all([
    client.from('matches').select('id', { count: 'exact', head: true }).eq('tournament_id', tournament.data.id).not('kickoff_at', 'is', null),
    client.from('tournament_teams').select('id', { count: 'exact', head: true }).eq('tournament_id', tournament.data.id).not('team_id', 'is', null),
    client.from('venues').select('slug,metadata'),
  ])
  const hostNations = (venues.data ?? []).filter(venue => venue.metadata?.hostNation).length
  const problems = []
  if (kickoffs.count !== 51) problems.push(`kickoff times ${kickoffs.count}/51`)
  if (slots.count !== 24) problems.push(`assigned slots ${slots.count}/24`)
  if (hostNations !== 9) problems.push(`venue host nations ${hostNations}/9`)
  if (problems.length > 0) {
    throw new Error(`local data is not canonical (${problems.join(', ')}). Run: npm run visual:seed`)
  }
}

function readEnvLocal() {
  const source = fs.readFileSync(path.join(projectRoot, '.env.local'), 'utf8')
  return Object.fromEntries(source.split('\n').filter(line => line.includes('='))
    .map(line => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]))
}

// ── Preview server ───────────────────────────────────────────────────────────
export function buildApp() {
  const result = spawnSync('npx', ['vite', 'build'], { cwd: projectRoot, stdio: 'inherit' })
  if (result.status !== 0) throw new Error('vite build failed')
}

export async function startPreviewServer() {
  const child = spawn('npx', ['vite', 'preview', '--port', String(PREVIEW_PORT), '--strictPort'], {
    cwd: projectRoot,
    stdio: 'ignore',
    detached: false,
  })
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(PREVIEW_URL)
      if (response.ok) return child
    } catch {
      await new Promise(resolve => setTimeout(resolve, 250))
    }
  }
  child.kill('SIGTERM')
  throw new Error(`vite preview did not become ready on ${PREVIEW_URL}`)
}

// ── Deterministic capture ────────────────────────────────────────────────────
const ANIMATION_KILL_CSS = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
    scroll-behavior: auto !important;
  }
`

export async function newDeterministicContext(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    timezoneId: 'Europe/London',
    locale: 'en-GB',
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    colorScheme: 'light',
  })
  return context
}

export async function preparePage(context) {
  const page = await context.newPage()
  // Pin Date.now (and friends) without faking timers: intervals still fire but
  // recompute against the same frozen instant, so countdowns render constant.
  await page.clock.setFixedTime(new Date(FROZEN_INSTANT))
  return page
}

export async function settleForCapture(page, { readyText = null, readySelector = null } = {}) {
  if (readySelector) await page.waitForSelector(readySelector, { timeout: 20000 })
  else if (readyText) await page.getByText(readyText, { exact: false }).first().waitFor({ timeout: 20000 })
  await page.addStyleTag({ content: ANIMATION_KILL_CSS })
  await page.evaluate(() => document.fonts.ready)
  // One settle frame after style injection so the killed animations repaint.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

export async function captureFullPage(page, filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  await page.screenshot({ path: filePath, fullPage: true, animations: 'disabled' })
}

// ── Diffing ──────────────────────────────────────────────────────────────────
export function readPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath))
}

/**
 * Compare two PNGs that may differ in size (full-page heights vary). The diff
 * runs over the overlapping region; any size mismatch is reported alongside
 * the pixel ratio so callers can decide what it means for their tier.
 */
export function diffPngs(leftPath, rightPath, diffOutputPath = null) {
  const left = readPng(leftPath)
  const right = readPng(rightPath)
  const width = Math.min(left.width, right.width)
  const height = Math.min(left.height, right.height)
  const crop = (image) => {
    const out = new PNG({ width, height })
    PNG.bitblt(image, out, 0, 0, width, height, 0, 0)
    return out
  }
  const croppedLeft = crop(left)
  const croppedRight = crop(right)
  const diff = new PNG({ width, height })
  const differing = pixelmatch(croppedLeft.data, croppedRight.data, diff.data, width, height, { threshold: 0.1 })
  if (diffOutputPath) {
    fs.mkdirSync(path.dirname(diffOutputPath), { recursive: true })
    fs.writeFileSync(diffOutputPath, PNG.sync.write(diff))
  }
  return {
    differingPixels: differing,
    comparedPixels: width * height,
    diffRatio: differing / (width * height),
    sizeMismatch: left.width !== right.width || left.height !== right.height,
    leftSize: { width: left.width, height: left.height },
    rightSize: { width: right.width, height: right.height },
  }
}

// ── Freshness run-record ─────────────────────────────────────────────────────
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

/** Content hash over every visual-affecting file the tier watches. */
export function computeWatchedHash() {
  const hash = crypto.createHash('sha256')
  for (const glob of WATCHED_GLOBS) {
    const files = walk(path.join(projectRoot, glob.root))
      .filter(file => glob.test(file))
      .sort()
    for (const file of files) {
      hash.update(path.relative(projectRoot, file))
      hash.update(fs.readFileSync(file))
    }
  }
  return hash.digest('hex')
}

export function readRunRecord() {
  const filePath = path.join(projectRoot, RUN_RECORD_PATH)
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

export function writeRunRecord({ mode, note = null }) {
  const commit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: projectRoot, encoding: 'utf8' }).stdout.trim()
  const record = {
    mode,
    watchedHash: computeWatchedHash(),
    recordedAt: new Date().toISOString(),
    headCommit: commit,
    ...(note ? { note } : {}),
  }
  fs.writeFileSync(path.join(projectRoot, RUN_RECORD_PATH), `${JSON.stringify(record, null, 2)}\n`)
  return record
}
