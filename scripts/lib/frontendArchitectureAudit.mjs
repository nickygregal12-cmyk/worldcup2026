import fs from 'node:fs'
import path from 'node:path'

export function countLines(source) {
  if (source.length === 0) return 0
  return source.replace(/\r\n/g, '\n').split('\n').length - (source.endsWith('\n') ? 1 : 0)
}

export function walkFiles(root, relativeRoot) {
  const absoluteRoot = path.join(root, relativeRoot)
  if (!fs.existsSync(absoluteRoot)) return []
  const output = []
  for (const entry of fs.readdirSync(absoluteRoot, { withFileTypes: true })) {
    const relativePath = path.posix.join(relativeRoot, entry.name)
    if (entry.isDirectory()) output.push(...walkFiles(root, relativePath))
    else output.push(relativePath)
  }
  return output
}

export function extractImports(source) {
  return [...source.matchAll(/(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g)].map(match => match[1])
}

export function parseThemeTokens(source) {
  const light = {}
  const darkOverrides = {}
  const blockPattern = /:root(?:\[data-theme=['"]dark['"]\])?\s*\{([^}]*)\}/g
  let match
  while ((match = blockPattern.exec(source)) !== null) {
    const selector = match[0].slice(0, match[0].indexOf('{')).trim()
    const target = selector.includes('data-theme') ? darkOverrides : light
    for (const declaration of match[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
      target[declaration[1]] = declaration[2].trim()
    }
  }
  return { light, dark: { ...light, ...darkOverrides } }
}

function resolveToken(tokens, name, seen = new Set()) {
  if (seen.has(name)) throw new Error(`Circular token reference: --${name}`)
  const value = tokens[name]
  if (!value) throw new Error(`Missing token: --${name}`)
  const reference = value.match(/^var\(--([\w-]+)\)$/)
  if (!reference) return value
  return resolveToken(tokens, reference[1], new Set([...seen, name]))
}

function hexToRgb(value) {
  const match = value.match(/^#([0-9a-f]{6})$/i)
  if (!match) throw new Error(`Contrast token must resolve to a six-digit hex colour, received ${value}`)
  const hex = match[1]
  return [0, 2, 4].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
}

function relativeLuminance(value) {
  const [red, green, blue] = hexToRgb(value).map(channel => channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4)
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

export function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground)
  const backgroundLuminance = relativeLuminance(background)
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

export function auditContrast({ tokenSource, pairs, exceptions }) {
  const themes = parseThemeTokens(tokenSource)
  const failures = []
  const acceptedExceptions = []

  for (const [themeName, tokens] of Object.entries(themes)) {
    for (const [foregroundName, backgroundName, minimum, purpose] of pairs) {
      let ratio
      try {
        ratio = contrastRatio(
          resolveToken(tokens, foregroundName),
          resolveToken(tokens, backgroundName),
        )
      } catch (error) {
        failures.push(`${themeName} ${purpose}: ${error.message}`)
        continue
      }
      const key = `${themeName}:${foregroundName}:${backgroundName}`
      const exceptionFloor = exceptions[key]
      if (ratio >= minimum) {
        if (exceptionFloor !== undefined) failures.push(`${key} now passes ${minimum}:1; remove its temporary exception`)
        continue
      }
      if (exceptionFloor === undefined) {
        failures.push(`${key} is ${ratio.toFixed(2)}:1; requires ${minimum}:1`)
        continue
      }
      if (ratio + 0.005 < exceptionFloor) {
        failures.push(`${key} regressed to ${ratio.toFixed(2)}:1 below its ratcheted ${exceptionFloor.toFixed(2)}:1 floor`)
        continue
      }
      acceptedExceptions.push({ key, ratio, minimum })
    }
  }

  return { failures, acceptedExceptions }
}
