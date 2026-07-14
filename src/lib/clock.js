import { ENVIRONMENT } from '../config/environment.js'

let overrideMs = null

/**
 * The override is module state, so a change is invisible to React. Anything that
 * derives from `getNow()` (the prediction lock above all) must be told when the
 * clock moves, or it renders against a time that no longer exists.
 */
const listeners = new Set()

function notify() {
  for (const listener of [...listeners]) listener()
}

/** Subscribe to clock-override changes. Returns an unsubscribe function. */
export function subscribeToClock(listener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function parseDate(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Invalid date value: ${value}`)
  }
  return date
}

function canOverrideClock() {
  return import.meta.env.MODE === 'test' || ENVIRONMENT.enableTimeTravel
}

/** Return a defensive Date copy so callers cannot mutate the shared clock. */
export function getNow() {
  return overrideMs == null ? new Date() : new Date(overrideMs)
}

/**
 * Set a fixed application time for staging/test scenarios.
 * Production builds reject overrides unless VITE_ENABLE_TIME_TRAVEL=true.
 */
export function setClockOverride(value) {
  if (!canOverrideClock()) {
    throw new Error('Clock overrides are disabled in this environment')
  }
  const next = parseDate(value).getTime()
  const changed = next !== overrideMs
  overrideMs = next
  if (changed) notify()
  return getNow()
}

export function clearClockOverride() {
  const changed = overrideMs != null
  overrideMs = null
  if (changed) notify()
}

export function getClockOverride() {
  return overrideMs == null ? null : new Date(overrideMs)
}

export function isAtOrAfter(value) {
  return getNow().getTime() >= parseDate(value).getTime()
}

export function isBefore(value) {
  return getNow().getTime() < parseDate(value).getTime()
}
