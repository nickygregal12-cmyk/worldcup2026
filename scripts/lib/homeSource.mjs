import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const HOME_DIR = 'src/home'

/**
 * Home's source, read as layers rather than as single files.
 *
 * The Home audits used to read src/home/HomeDashboard.jsx alone. That was only
 * ever true while the whole page fitted in one file, and the Design Charter's
 * 400-line component cap guarantees it will not: at Stage DP-HOME the page hit
 * 399 lines and had to be decomposed into HomeDashboard.jsx, HomeHero.jsx,
 * HomeMatchCard.jsx and HomeSidebar.jsx, each with a colocated CSS Module.
 *
 * The markers those audits assert are structural — component names, render
 * loops, route hashes, class names — so they belong to Home's view layer, not to
 * one filename. Reading the layer keeps every assertion live across a legal
 * decomposition, instead of quietly passing because the file it grepped no
 * longer holds the code.
 */
function readLayer(accept, root = process.cwd()) {
  const base = path.join(root, HOME_DIR)
  return fs.readdirSync(base)
    .filter(file => accept(file))
    .sort()
    .map(file => fs.readFileSync(path.join(base, file), 'utf8'))
    .join('\n')
}

/** Every component Home renders. */
export const readHomeView = root => readLayer(file => file.endsWith('.jsx'), root)

/** Home's colocated CSS Modules. */
export const readHomeStyles = root => readLayer(file => file.endsWith('.module.css'), root)

/** Home's model, service and presentation helpers. */
export const readHomeLogic = root => readLayer(file => file.endsWith('.js'), root)
