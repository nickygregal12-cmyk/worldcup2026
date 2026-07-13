/**
 * Magnify a region of a generated PNG so it can actually be inspected.
 *
 * The container has no PIL and no ImageMagick, but it does have a browser: render the image at
 * 1:1 inside a page, then screenshot a clip of it at a device scale factor. A throwaway tool for
 * looking closely at share-image output — not part of any gate.
 *
 *   node scripts/visual-crop.mjs <png> <x> <y> <w> <h> [scale]
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'

const [file, x, y, w, h, scale = '2'] = process.argv.slice(2)
if (!file) throw new Error('usage: visual-crop.mjs <png> <x> <y> <w> <h> [scale]')

const source = path.resolve(file)
const clip = { x: Number(x), y: Number(y), width: Number(w), height: Number(h) }

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: clip.width, height: clip.height },
  deviceScaleFactor: Number(scale),
})
// A data URI, not file:// — setContent runs on about:blank, which is not allowed to read local files.
const data = `data:image/png;base64,${readFileSync(source).toString('base64')}`
await page.setContent(
  `<body style="margin:0"><img src="${data}"
     style="position:absolute;left:${-clip.x}px;top:${-clip.y}px;image-rendering:pixelated"></body>`,
)
await page.waitForFunction(() => document.querySelector('img')?.complete === true)

const out = source.replace(/\.png$/, `-crop-${clip.x}-${clip.y}.png`)
await page.screenshot({ path: out })
await browser.close()
console.log(path.relative(process.cwd(), out))
