/**
 * Game Phase Manager
 * Central source of truth for what phase the app is in.
 * Admin can override any phase via app_settings in Supabase.
 * Falls back to date-based logic if no override set.
 */

import { supabase } from './supabase.js'
import { DATES } from './tournamentDates.js'

export { DATES } from './tournamentDates.js'

// Cache settings in memory to avoid repeated DB calls
let cachedSettings = null
let cacheTime = 0
const CACHE_TTL = 30_000 // 30 seconds

export async function getAppSettings() {
  const now = Date.now()
  if (cachedSettings && now - cacheTime < CACHE_TTL) return cachedSettings

  const { data } = await supabase.from('app_settings').select('key, value')
  const settings = {}
  data?.forEach(s => { settings[s.key] = s.value })
  cachedSettings = settings
  cacheTime = now
  return settings
}

export function clearSettingsCache() {
  cachedSettings = null
  cacheTime = 0
}

/**
 * Get the current game phase based on settings overrides + date fallback
 * Returns an object with boolean flags for each phase
 */
export async function getGamePhase() {
  const settings = await getAppSettings()
  const now = new Date()

  // Admin overrides take priority
  const phaseOverride = settings.game_phase_override // e.g. 'pre_tournament', 'group_stage', 'knockout_banner', 'ko_predictor', 'post_tournament'

  const tournamentStarted = phaseOverride
    ? ['group_stage','knockout_banner','ko_predictor','post_tournament'].includes(phaseOverride)
    : now >= DATES.TOURNAMENT_START

  const groupStageDone = phaseOverride
    ? ['ko_predictor','post_tournament'].includes(phaseOverride)
    : now >= DATES.GROUP_STAGE_END

  const showKnockoutBanner = phaseOverride
    ? ['knockout_banner','ko_predictor','post_tournament'].includes(phaseOverride)
    : now >= DATES.KNOCKOUT_BANNER

  const koLive = phaseOverride === 'ko_predictor'
    ? true
    : phaseOverride === 'pre_tournament' || phaseOverride === 'group_stage' || phaseOverride === 'knockout_banner'
    ? false
    : now >= DATES.KO_PREDICTOR_OPEN

  const tournamentOver = phaseOverride === 'post_tournament'
    ? true
    : now >= DATES.TOURNAMENT_END

  // Feature flags from settings
  const maintenanceMode     = settings.maintenance_mode === 'true'
  const registrationOpen    = settings.registration_open !== 'false'
  const koPredictorEnabled  = settings.ko_predictor_enabled == null ? koLive : settings.ko_predictor_enabled === 'true'
  const koPredictionsOpen   = settings.ko_predictions_open == null ? koLive : settings.ko_predictions_open === 'true'
  const koBannerVisible     = settings.ko_banner_visible !== 'false'
  const koAutofillEnabled   = settings.ko_autofill_enabled !== 'false'

  return {
    tournamentStarted,
    groupStageDone,
    showKnockoutBanner: showKnockoutBanner && koBannerVisible,
    koLive: koLive && koPredictorEnabled,
    koPredictionsOpen,
    koAutofillEnabled,
    tournamentOver,
    maintenanceMode,
    registrationOpen,
    phaseOverride,
    // Current phase label for display
    currentPhase: tournamentOver ? 'post_tournament'
      : koLive ? 'ko_predictor'
      : showKnockoutBanner ? 'knockout_banner'
      : tournamentStarted ? 'group_stage'
      : 'pre_tournament',
  }
}

export const PHASE_LABELS = {
  pre_tournament:   { label: 'Pre-Tournament', desc: 'Before 11 Jun · predictions open, no scores', colour: '#6366f1' },
  group_stage:      { label: 'Group Stage', desc: '11 Jun – 27 Jun · matches live, scores coming in', colour: 'var(--accent-green)' },
  knockout_banner:  { label: 'KO Banner Live', desc: '20 Jun+ · teaser banner showing on home', colour: '#f59e0b' },
  ko_predictor:     { label: 'KO Predictor Live', desc: '27 Jun+ · second game open', colour: '#e65100' },
  post_tournament:  { label: 'Post Tournament', desc: 'After 19 Jul · final results locked', colour: 'var(--text-muted)' },
}
