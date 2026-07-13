/**
 * The share image under the states the real board cannot be forced into on demand.
 *
 * visual-share.mjs drives the product path and is the honest end-to-end proof — but the champion
 * it produces depends on a lucky dip, so it cannot be made to yield the cases that actually
 * threaten the layout:
 *
 *   long-names — every slot filled with the longest UEFA names there are (Republic of Ireland,
 *                Northern Ireland, Netherlands, Czech Republic, Bosnia and Herzegovina), and the
 *                longest of them crowned. This is the width test the brief asks for.
 *   joker      — a joker played on a champion's group match, so the JokerMark is actually painted.
 *                Bracket jokers do not exist (§4), so the score band is the only place it can appear.
 *   top-scorer — the reserved Top Scorer tile, lit. Proves Stage 17A drops in without a redesign.
 *
 * It imports the SAME painter the product uses, through the dev server, and paints a synthetic
 * model into it. No product code knows this file exists.
 *
 *   node scripts/visual-share-cases.mjs
 */
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'

const PORT = 5176
const ORIGIN = `http://127.0.0.1:${PORT}`
const OUT_DIR = path.join(process.cwd(), '.visual-shots')

function startDevServer() {
  const child = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
    { cwd: process.cwd(), detached: true, env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'] },
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

const { stop, ready } = startDevServer()
let failed = false

try {
  await ready
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 600, height: 800 } })
  page.on('pageerror', error => { console.error(`page error: ${error.message}`); failed = true })
  await page.goto(ORIGIN, { waitUntil: 'networkidle' })

  const cases = await page.evaluate(async () => {
    const { EURO28_KNOCKOUT_MATCHES } = await import('/src/resolver/euro28ResolverConfig.js')
    const { renderBracketShareImage } = await import('/src/journey/shareImageRenderer.js')
    const { shareTeamName } = await import('/src/journey/shareImageModel.js')

    // The longest names in the UEFA pool, so every lane is tested at its worst.
    const LONG = [
      { label: 'Republic of Ireland', isoCode: 'IRL' },
      { label: 'Northern Ireland', isoCode: 'NIR' },
      { label: 'Netherlands', isoCode: 'NED' },
      { label: 'Czech Republic', isoCode: 'CZE' },
      { label: 'Bosnia and Herzegovina', isoCode: 'BIH' },
      { label: 'North Macedonia', isoCode: 'MKD' },
    ]
    const team = index => {
      const source = LONG[index % LONG.length]
      return { label: source.label, shortLabel: shareTeamName(source.label), isoCode: source.isoCode }
    }

    const sourceCodeFor = slot => {
      if (slot.sourceType === 'match_winner') return `W${slot.matchNumber}`
      if (slot.sourceType === 'group_position') return `${slot.position}${slot.groupCode}`
      return '3ABCD'
    }

    let counter = 0
    const tiesByMatchNumber = {}
    for (const match of EURO28_KNOCKOUT_MATCHES) {
      const slots = [match.home, match.away].map((slot, index) => ({
        team: team(counter++),
        sourceCode: sourceCodeFor(slot),
        unresolved: false,
        advancing: index === 0,
      }))
      tiesByMatchNumber[match.matchNumber] = {
        matchNumber: match.matchNumber, stage: match.stage, slots, decided: true,
      }
    }

    const champion = { label: 'Republic of Ireland', shortLabel: shareTeamName('Republic of Ireland'), isoCode: 'IRL' }
    const groupScores = [
      { matchNumber: 3, groupCode: 'E', home: champion, away: team(1), homeScore: 3, awayScore: 1, jokerApplied: true },
      { matchNumber: 11, groupCode: 'E', home: team(2), away: champion, homeScore: 0, awayScore: 2, jokerApplied: false },
      { matchNumber: 27, groupCode: 'E', home: champion, away: team(3), homeScore: 12, awayScore: 10, jokerApplied: true },
    ]

    const base = {
      complete: true, decided: 15, total: 15, remaining: 0,
      champion, tiesByMatchNumber,
      groupGoals: { total: 128, complete: true },
      topScorer: null,
      groupScores,
    }

    const variants = {
      'long-names': base,
      // The reserved tile, lit — exactly what Stage 17A will hand it.
      'top-scorer': { ...base, topScorer: { label: 'Placeholder Forward' } },
      // The band the owner may drop: proves the layout reclaims the space rather than sagging.
      'no-group-scores': { ...base, groupScores: [] },
    }

    const out = {}
    for (const [name, model] of Object.entries(variants)) {
      const blob = await renderBracketShareImage(model, { origin: 'https://euro28-predictor-dev.netlify.app' })
      const bytes = new Uint8Array(await blob.arrayBuffer())
      // Spreading a megabyte of bytes into fromCharCode overflows the call stack — chunk it.
      let binary = ''
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      }
      out[name] = btoa(binary)
    }
    return out
  })

  for (const [name, base64] of Object.entries(cases)) {
    const target = path.join(OUT_DIR, `share-case-${name}.png`)
    await writeFile(target, Buffer.from(base64, 'base64'))
    console.log(path.relative(process.cwd(), target))
  }
  await browser.close()
} catch (error) {
  console.error(`visual-share-cases failed: ${error.message}`)
  failed = true
} finally {
  stop()
}

process.exit(failed ? 1 : 0)
