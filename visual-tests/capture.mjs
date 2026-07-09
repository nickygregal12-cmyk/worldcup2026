// Deterministic capture: screenshots every configured page of the BUILT app and
// every binding prototype at all three contract viewports.
//
//   node visual-tests/capture.mjs [--skip-build] [--pages home,groups] [--out current]
//
// Output: visual-artifacts/<out>/<page>--<viewport>.png       (built app)
//         visual-artifacts/prototypes/<page>--<viewport>.png  (reference HTML)
import path from 'node:path'
import process from 'node:process'
import { chromium } from '@playwright/test'
import { PAGES, PREVIEW_URL, VIEWPORTS } from './visual.config.mjs'
import {
  artifactPath,
  assertCanonicalLocalData,
  buildApp,
  captureFullPage,
  newDeterministicContext,
  preparePage,
  projectRoot,
  settleForCapture,
  shotName,
  startPreviewServer,
} from './lib/visualLib.mjs'

const args = process.argv.slice(2)
const skipBuild = args.includes('--skip-build')
const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'current'
const pageFilter = args.includes('--pages') ? args[args.indexOf('--pages') + 1].split(',') : null
const pages = PAGES.filter(page => (pageFilter ? pageFilter.includes(page.key) : page.demo))

await assertCanonicalLocalData()
if (!skipBuild) buildApp()

const server = await startPreviewServer()
const browser = await chromium.launch()
let captured = 0

try {
  for (const viewport of VIEWPORTS) {
    const context = await newDeterministicContext(browser, viewport)

    for (const pageConfig of pages) {
      // Fresh page per route: hash-routed SPA state must not leak between shots.
      const page = await preparePage(context)
      await page.goto(`${PREVIEW_URL}/${pageConfig.route}`, { waitUntil: 'networkidle' })
      await settleForCapture(page, pageConfig)
      await captureFullPage(page, artifactPath(outDir, shotName(pageConfig.key, viewport.name)))
      await page.close()
      captured += 1

      if (pageConfig.prototype) {
        const prototypePage = await preparePage(context)
        const prototypeUrl = `file://${path.join(projectRoot, 'docs/reference-prototypes', pageConfig.prototype)}`
        await prototypePage.goto(prototypeUrl, { waitUntil: 'load' })
        await settleForCapture(prototypePage, {})
        await captureFullPage(prototypePage, artifactPath('prototypes', shotName(pageConfig.key, viewport.name)))
        await prototypePage.close()
        captured += 1
      }
    }
    await context.close()
  }
} finally {
  await browser.close()
  server.kill('SIGTERM')
}

console.log(`Visual capture complete: ${captured} screenshots (${pages.length} pages × ${VIEWPORTS.length} viewports, built + prototype).`)
console.log(`Built-app shots: ${path.join('visual-artifacts', outDir)}; prototype shots: visual-artifacts/prototypes.`)
