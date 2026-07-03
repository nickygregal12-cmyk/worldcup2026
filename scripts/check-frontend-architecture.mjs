import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  ACTIVE_UI_ROOTS,
  FRONTEND_COMPONENT_HARD_CAP,
  FRONTEND_STYLESHEET_HARD_CAP,
  GLOBAL_STYLESHEET_CAPS,
  TEMPORARY_COMPONENT_CAPS,
  TEMPORARY_FIXTURE_IMPORTS,
} from './architecture-policy.mjs'
import { countLines, extractImports, walkFiles } from './lib/frontendArchitectureAudit.mjs'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const exists = file => fs.existsSync(path.join(root, file))

const charterPath = 'docs/EURO28-DESIGN-CHARTER.md'
if (!exists(charterPath)) fail(`Missing architecture authority: ${charterPath}`)
else {
  const charter = read(charterPath)
  for (const marker of [
    'Frontend architecture and enforcement — CONFIRMED',
    'CSS Modules are the default and required styling mechanism',
    '400 lines is the hard limit',
    'Dependencies must flow in one direction',
    'WCAG contrast enforcement',
  ]) if (!charter.includes(marker)) fail(`Design Charter is missing architecture rule: ${marker}`)
}

const activeFiles = [...new Set(ACTIVE_UI_ROOTS.flatMap(directory => walkFiles(root, directory)))]
const jsxFiles = activeFiles.filter(file => file.endsWith('.jsx') && !file.includes('/__tests__/'))
for (const file of jsxFiles) {
  const lines = countLines(read(file))
  const temporaryCap = TEMPORARY_COMPONENT_CAPS[file]
  if (temporaryCap !== undefined) {
    if (lines > temporaryCap) fail(`${file} grew to ${lines} lines above its frozen ${temporaryCap}-line cap`)
    if (lines < temporaryCap) fail(`${file} shrank to ${lines} lines; lower its temporary cap from ${temporaryCap} in the same commit`)
  } else if (lines > FRONTEND_COMPONENT_HARD_CAP) {
    fail(`${file} is ${lines} lines; active UI components have a ${FRONTEND_COMPONENT_HARD_CAP}-line hard cap`)
  }
}
for (const file of Object.keys(TEMPORARY_COMPONENT_CAPS)) {
  if (!jsxFiles.includes(file)) fail(`Temporary component cap is stale or points outside active UI: ${file}`)
}

const cssFiles = walkFiles(root, 'src').filter(file => file.endsWith('.css') && file !== 'src/styles/globals.css')
for (const file of cssFiles) {
  const lines = countLines(read(file))
  const globalCap = GLOBAL_STYLESHEET_CAPS[file]
  if (globalCap !== undefined) {
    if (lines > globalCap) fail(`${file} grew to ${lines} lines above its frozen ${globalCap}-line cap`)
    if (lines < globalCap) fail(`${file} shrank to ${lines} lines; lower its global-style cap from ${globalCap} in the same commit`)
  } else if (!file.endsWith('.module.css')) {
    fail(`${file} is unapproved global CSS; new component styling must use .module.css`)
  } else if (lines > FRONTEND_STYLESHEET_HARD_CAP) {
    fail(`${file} is ${lines} lines; scoped stylesheets have a ${FRONTEND_STYLESHEET_HARD_CAP}-line hard cap`)
  }
}
for (const file of Object.keys(GLOBAL_STYLESHEET_CAPS)) {
  if (!cssFiles.includes(file)) fail(`Global stylesheet cap is stale or missing: ${file}`)
}

const legacySegments = ['/pages/', '/components/', '/store/', '/hooks/']
for (const file of activeFiles.filter(candidate => /\.[cm]?[jt]sx?$/.test(candidate))) {
  const source = read(file)
  const imports = extractImports(source)
  for (const specifier of imports) {
    if (legacySegments.some(segment => specifier.includes(segment)) || specifier.includes('styles/globals.css')) {
      fail(`${file} imports quarantined WC26 code: ${specifier}`)
    }
  }
  if (file.startsWith('src/design-system/')) {
    for (const specifier of imports) {
      if (/supabase|\.\.\/(?:app|home|tournament|auth|guest|predictions|journey|koPredictor|grace|results|teamProfile|observability|admin|leagues|foundation)\//.test(specifier)) {
        fail(`${file} breaks dependency direction by importing ${specifier}`)
      }
    }
  }
  if (/(?:Model|Service)\.[cm]?[jt]sx?$/.test(file)) {
    if (imports.some(specifier => specifier.endsWith('.jsx') || specifier.endsWith('.css')) || imports.includes('react')) {
      fail(`${file} is a model/service boundary and must not import React components or CSS`)
    }
  }
}

const observedFixtureImports = []
for (const file of activeFiles.filter(candidate => /\.[cm]?[jt]sx?$/.test(candidate) && !candidate.includes('/__tests__/') && !/visualFixture/i.test(candidate))) {
  for (const specifier of extractImports(read(file))) {
    if (/visualFixture/i.test(specifier)) observedFixtureImports.push({ importer: file, specifier })
  }
}
for (const observed of observedFixtureImports) {
  if (!TEMPORARY_FIXTURE_IMPORTS.some(allowed => allowed.importer === observed.importer && allowed.specifier === observed.specifier)) {
    fail(`${observed.importer} adds an unapproved production fixture import: ${observed.specifier}`)
  }
}
for (const allowed of TEMPORARY_FIXTURE_IMPORTS) {
  if (!observedFixtureImports.some(observed => observed.importer === allowed.importer && observed.specifier === allowed.specifier)) {
    fail(`Fixture import debt was removed; delete its temporary architecture exception: ${allowed.importer} -> ${allowed.specifier}`)
  }
}

if (errors.length) {
  console.error('Euro frontend architecture audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro frontend architecture audit passed.')
console.log(`Components: ${jsxFiles.length} active JSX files checked; ${Object.keys(TEMPORARY_COMPONENT_CAPS).length} exact temporary caps`)
console.log(`Styles: ${cssFiles.length} active stylesheets checked; global compatibility ceilings cannot grow`)
console.log('Dependencies: design-system, model/service, WC26 quarantine and fixture-import boundaries checked')
