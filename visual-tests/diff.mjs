// Contract conformance report: prototype vs built page, side by side with a
// pixel-diff overlay, per page per viewport. ADVISORY ONLY — the prototypes are
// binding visual references, not pixel-identical markup, so this never exits
// non-zero on visual difference. It replaces manual side-by-side screenshotting
// in owner review batches.
//
//   node visual-tests/diff.mjs   (expects a prior `npm run visual:capture`)
import fs from 'node:fs'
import path from 'node:path'
import { PAGES, VIEWPORTS } from './visual.config.mjs'
import { artifactPath, diffPngs, shotName } from './lib/visualLib.mjs'

const reportDir = artifactPath('conformance-report')
fs.mkdirSync(reportDir, { recursive: true })

const sections = []
let comparisons = 0

for (const pageConfig of PAGES.filter(page => page.prototype)) {
  const rows = []
  for (const viewport of VIEWPORTS) {
    const builtShot = artifactPath('current', shotName(pageConfig.key, viewport.name))
    const prototypeShot = artifactPath('prototypes', shotName(pageConfig.key, viewport.name))
    if (!fs.existsSync(builtShot) || !fs.existsSync(prototypeShot)) continue

    const diffShot = path.join(reportDir, `diff--${shotName(pageConfig.key, viewport.name)}`)
    const result = diffPngs(prototypeShot, builtShot, diffShot)
    comparisons += 1
    rows.push({ viewport, result, builtShot, prototypeShot, diffShot })
  }
  if (rows.length > 0) sections.push({ pageConfig, rows })
}

if (comparisons === 0) {
  console.error('No captured pairs found. Run `npm run visual:capture` first.')
  process.exit(1)
}

const html = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<title>Euro 2028 visual-contract conformance report</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; margin: 2rem; background: #f5f7fa; color: #10233d; }
  h1 { font-size: 1.4rem; } h2 { margin-top: 3rem; font-size: 1.15rem; }
  p.note { max-width: 60rem; }
  table { border-collapse: collapse; margin-top: 0.75rem; }
  td, th { border: 1px solid #d7dfea; padding: 0.5rem; vertical-align: top; text-align: left; font-size: 0.85rem; }
  img { max-width: 380px; height: auto; display: block; border: 1px solid #d7dfea; }
  .meta { color: #51647e; }
</style>
</head>
<body>
<h1>Visual-contract conformance report</h1>
<p class="note"><strong>Advisory, for owner review.</strong> The reference prototypes are binding
visual contracts, not pixel-identical markup — differences here are review input, never an
automatic failure. Generated ${new Date().toISOString()}.</p>
${sections.map(({ pageConfig, rows }) => `
<h2>${pageConfig.key} — contract: ${pageConfig.prototype}${pageConfig.demo ? '' : ' (pending re-approval)'}</h2>
<table>
<tr><th>Viewport</th><th>Prototype (contract)</th><th>Built page</th><th>Pixel diff (overlap)</th><th>Numbers</th></tr>
${rows.map(({ viewport, result, builtShot, prototypeShot, diffShot }) => `
<tr>
  <td>${viewport.name}</td>
  <td><img src="${path.relative(reportDir, prototypeShot)}" alt="prototype ${pageConfig.key} ${viewport.name}"></td>
  <td><img src="${path.relative(reportDir, builtShot)}" alt="built ${pageConfig.key} ${viewport.name}"></td>
  <td><img src="${path.relative(reportDir, diffShot)}" alt="diff ${pageConfig.key} ${viewport.name}"></td>
  <td class="meta">
    differing: ${(result.diffRatio * 100).toFixed(2)}% of overlap<br>
    prototype: ${result.leftSize.width}×${result.leftSize.height}<br>
    built: ${result.rightSize.width}×${result.rightSize.height}<br>
    ${result.sizeMismatch ? 'heights differ (expected for full-page shots)' : 'same canvas size'}
  </td>
</tr>`).join('')}
</table>`).join('')}
</body>
</html>
`

fs.writeFileSync(path.join(reportDir, 'index.html'), html)
console.log(`Conformance report written: ${path.relative(process.cwd(), path.join(reportDir, 'index.html'))} (${comparisons} comparisons across ${sections.length} pages).`)
console.log('Advisory only — open it in a browser for owner review.')
