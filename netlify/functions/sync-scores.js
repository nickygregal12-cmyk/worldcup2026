/* global process */
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from './_adminAuth.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const SYNC_NAME = 'football-data-world-cup'
const MIN_PROVIDER_GAP_SECONDS = 75
const LOCK_SECONDS = 90
const MAX_DETAIL_REQUESTS = 1

const jsonResponse = (statusCode, payload) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(payload),
})

const readRateLimitHeaders = (response) => ({
  requestsAvailable: response.headers.get('x-requestsavailable') ?? response.headers.get('x-requests-available'),
  counterResetSeconds: response.headers.get('x-requestcounter-reset') ?? response.headers.get('x-request-counter-reset'),
})

async function acquireSyncLock() {
  const { data, error } = await supabase.rpc('acquire_api_sync_lock', {
    p_name: SYNC_NAME,
    p_min_gap_seconds: MIN_PROVIDER_GAP_SECONDS,
    p_lock_seconds: LOCK_SECONDS,
  })
  if (error) throw new Error(`acquire_api_sync_lock: ${error.message}`)
  return data || { acquired: false, reason: 'unknown' }
}

async function releaseSyncLock({ status, rate = {}, blockSeconds = 0, providerCalls = 0 }) {
  const { error } = await supabase.rpc('release_api_sync_lock', {
    p_name: SYNC_NAME,
    p_status: status,
    p_requests_available: rate.requestsAvailable == null ? null : Number(rate.requestsAvailable),
    p_counter_reset_seconds: rate.counterResetSeconds == null ? null : Number(rate.counterResetSeconds),
    p_block_seconds: blockSeconds,
    p_provider_calls: providerCalls,
  })
  if (error) console.error('release_api_sync_lock failed', error.message)
}

async function hasRelevantLocalMatch() {
  const now = new Date()
  const from = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()
  const to = new Date(now.getTime() + 90 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('matches')
    .select('id,status,kickoff_time,first_goal_band,use_manual_override,stage,outcome_type,home_score_pens,away_score_pens')
    .gte('kickoff_time', from)
    .lte('kickoff_time', to)
    .in('status', ['scheduled', 'live', 'paused', 'completed'])

  if (error) throw new Error(`Relevant-match check: ${error.message}`)
  return (data || []).some(match => {
    if (match.use_manual_override) return false
    if (match.status === 'live' || match.status === 'paused') return true
    const kickoff = new Date(match.kickoff_time).getTime()
    if (match.status === 'scheduled') return kickoff <= now.getTime() + 90 * 60 * 1000
    if (match.status === 'completed') {
      const isKo = KO_STAGES.has(match.stage)
      const missingPens = match.outcome_type === 'penalties' && (match.home_score_pens == null || match.away_score_pens == null)
      return !match.first_goal_band || (isKo && missingPens)
    }
    return false
  })
}

// Idempotently recalculate league_points for every offline player who has a
// prediction on this match. Recomputes each player's TOTAL from all their
// predictions against completed matches — never additive, so safe to re-run.
async function scoreOfflinePlayers(supabase, matchId) {
  // Which offline players are affected by this match?
  const { data: affected } = await supabase
    .from('offline_predictions')
    .select('offline_player_id')
    .eq('match_id', matchId)
  if (!affected?.length) return

  const playerIds = [...new Set(affected.map(a => a.offline_player_id))]

  // All completed matches with scores, for recompute
  const { data: completedMatches } = await supabase
    .from('matches')
    .select('id, home_score, away_score, status')
    .eq('status', 'completed')
  const resultMap = {}
  ;(completedMatches || []).forEach(m => {
    if (m.home_score != null && m.away_score != null) {
      resultMap[m.id] = { h: m.home_score, a: m.away_score }
    }
  })

  for (const playerId of playerIds) {
    const { data: preds } = await supabase
      .from('offline_predictions')
      .select('match_id, home_score, away_score, is_confident')
      .eq('offline_player_id', playerId)

    let total = 0
    for (const p of preds || []) {
      const result = resultMap[p.match_id]
      if (!result || p.home_score == null || p.away_score == null) continue
      const actResult = result.h > result.a ? 'H' : result.h < result.a ? 'A' : 'D'
      const predResult = p.home_score > p.away_score ? 'H' : p.home_score < p.away_score ? 'A' : 'D'
      if (predResult !== actResult) continue
      const exact = p.home_score === result.h && p.away_score === result.a
      let pts = exact ? 5 : 3
      if (p.is_confident) pts *= 2
      total += pts
    }
    await supabase.from('offline_players').update({ league_points: total }).eq('id', playerId)
  }
}

// football-data.org name → our DB name
const API_TO_DB = {
  'Czech Republic': 'Czechia',
  'Turkey': 'Türkiye',
  'Bosnia and Herzegovina': 'Bosnia-Herzegovina',
  'USA': 'United States',
  'United States of America': 'United States',
  "Côte d'Ivoire": 'Ivory Coast',
  'Curaçao': 'Curacao',
  'Curacao': 'Curacao',
  'Cape Verde Islands': 'Cape Verde',
  'Cape Verde': 'Cape Verde',
  'Korea Republic': 'South Korea',
  'Republic of Korea': 'South Korea',
  'South Korea': 'South Korea',
  'DR Congo': 'DR Congo',
  'Congo DR': 'DR Congo',
  'Democratic Republic of Congo': 'DR Congo',
  'Congo, DR': 'DR Congo',
  'North Macedonia': 'North Macedonia',
  'Macedonia': 'North Macedonia',
  'Ivory Coast': 'Ivory Coast',
  'Iran': 'Iran',
  'IR Iran': 'Iran',
  'Saudi Arabia': 'Saudi Arabia',
  'KSA': 'Saudi Arabia',
  'Bosnia Herzegovina': 'Bosnia-Herzegovina',
  'Bosnia & Herzegovina': 'Bosnia-Herzegovina',
  'New Zealand': 'New Zealand',
  'Aotearoa New Zealand': 'New Zealand',
}

const normalise = (name) => API_TO_DB[name] || name

const stripAccents = (str) => str
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '') // remove combining diacritical marks
  .toLowerCase()
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9 ]/g, '')
  .trim()


const KO_STAGES = new Set(['r32', 'r16', 'qf', 'sf', '3rd', 'final'])

const firstDefined = (...values) => values.find(value => value !== null && value !== undefined)

// football-data v4 normally uses { home, away }, while some older/sample
// payloads use { homeTeam, awayTeam }. Accept both so score sync does not
// silently fail when the provider varies the shape.
const readScorePair = (node) => {
  if (!node) return null
  const home = firstDefined(node.home, node.homeTeam)
  const away = firstDefined(node.away, node.awayTeam)
  return home !== undefined && away !== undefined ? { home, away } : null
}

const orientPair = (pair, reversed) => {
  if (!pair) return null
  return reversed
    ? { home: pair.away, away: pair.home }
    : { home: pair.home, away: pair.away }
}

const firstGoalBandFromApi = (apiMatch, completedScore) => {
  const goals = Array.isArray(apiMatch.goals) ? apiMatch.goals : []
  const matchGoals = goals
    .filter(goal => Number.isFinite(Number(goal?.minute)))
    .sort((a, b) => Number(a.minute) - Number(b.minute))

  if (matchGoals.length > 0) {
    const minute = Number(matchGoals[0].minute)
    if (minute <= 15) return '1-15'
    if (minute <= 30) return '16-30'
    if (minute <= 45) return '31-45'
    if (minute <= 60) return '46-60'
    if (minute <= 75) return '61-75'
    if (minute <= 90) return '76-90'
    return 'et'
  }

  // A completed 0-0 match genuinely had no first goal. Do not infer this for
  // any other score because a folded provider response may simply omit goals.
  if (completedScore?.home === 0 && completedScore?.away === 0) return 'no_goals'
  return null
}

async function runRpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw new Error(`${name}: ${error.message}`)
  return data
}

const inferOrientation = (ourMatch, apiMatch) => {
  const localHome = stripAccents(ourMatch.home_team?.name || '')
  const localAway = stripAccents(ourMatch.away_team?.name || '')
  const apiHome = stripAccents(normalise(apiMatch.homeTeam?.name || ''))
  const apiAway = stripAccents(normalise(apiMatch.awayTeam?.name || ''))
  if (!localHome || !localAway || !apiHome || !apiAway) return { matches: false, reversed: false }
  if (localHome === apiHome && localAway === apiAway) return { matches: true, reversed: false }
  if (localHome === apiAway && localAway === apiHome) return { matches: true, reversed: true }
  return { matches: false, reversed: false }
}

export const handler = async (event) => {
  const auth = await requireAdmin(event)
  if (!auth.ok) return auth.response

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  let requestBody = {}
  try { requestBody = event.body ? JSON.parse(event.body) : {} } catch { requestBody = {} }
  const source = requestBody.source === 'scheduled' ? 'scheduled' : 'manual'

  const { data: settings } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'live_api_enabled')
    .single()

  if (settings?.value !== 'true') {
    return jsonResponse(200, { skipped: true, reason: 'Live API disabled', providerCalls: 0 })
  }

  if (!process.env.FOOTBALL_DATA_KEY) {
    return jsonResponse(500, { error: 'FOOTBALL_DATA_KEY is not configured', providerCalls: 0 })
  }

  if (source === 'scheduled') {
    const relevant = await hasRelevantLocalMatch()
    if (!relevant) {
      return jsonResponse(200, { skipped: true, reason: 'No live, imminent or recently completed match needs syncing', providerCalls: 0 })
    }
  }

  const lock = await acquireSyncLock()
  if (!lock?.acquired) {
    return jsonResponse(200, {
      skipped: true,
      reason: lock?.reason || 'Sync cooldown or another run is active',
      retryAfterSeconds: lock?.retry_after_seconds ?? null,
      providerCalls: 0,
    })
  }

  let providerCalls = 0
  let detailRequests = 0
  let latestRate = {}

  try {
    providerCalls += 1
    const response = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
      { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_KEY } }
    )
    latestRate = readRateLimitHeaders(response)

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500)
      const blockSeconds = response.status === 429
        ? Math.max(Number(latestRate.counterResetSeconds) || 60, 60)
        : response.status === 403 ? 900 : 0
      await releaseSyncLock({ status: `provider_${response.status}`, rate: latestRate, blockSeconds, providerCalls })
      return jsonResponse(200, {
        skipped: true,
        reason: `football-data.org ${response.status}: ${detail || response.statusText}`,
        providerCalls,
        rateLimit: latestRate,
      })
    }

    const data = await response.json()
    const matches = data.matches || []

    // Lightweight local state lets us fetch the detailed match resource only
    // when it adds value. This avoids repeatedly spending provider requests on
    // every old completed fixture while still backfilling a missing first goal.
    const { data: localSyncRows } = await supabase
      .from('matches')
      .select('external_match_id, status, first_goal_band, use_manual_override')
      .not('external_match_id', 'is', null)
    const localSyncState = new Map(
      (localSyncRows || []).map(row => [String(row.external_match_id), row])
    )

    let updated = 0
    let pointsCalculated = 0
    let fixturesPopulated = 0
    const errors = []

    // ── PASS 0: Fill the "easy" R32 slots (group winners/runners-up) the moment
    // their group finishes — straight from real standings. Best-third slots are
    // left for PASS 1 (the API) once FIFA's Annex C allocation is published.
    // Idempotent and fill-only, so it never overwrites a real team with null.
    try {
      await runRpc('populate_r32_known_slots')
    } catch (e) {
      errors.push(e.message)
    }

    // ── PASS 1: Auto-populate knockout fixtures from FIFA's real bracket ──
    // Once groups complete, FIFA applies its Annex C allocation and the API
    // publishes the real R32 (then R16/QF/SF/F) fixtures with actual teams.
    // We match API fixtures to our rows by stage + exact kickoff time (every
    // knockout match has a unique kickoff) and write the team ids in.
    // This removes any need for manual fixture entry or our own Annex C table.
    const API_STAGE_TO_OURS = {
      'LAST_32': 'r32', 'ROUND_OF_32': 'r32', 'PLAYOFF_ROUND': 'r32',
      'LAST_16': 'r16', 'ROUND_OF_16': 'r16',
      'QUARTER_FINALS': 'qf', 'SEMI_FINALS': 'sf',
      'THIRD_PLACE': '3rd', 'FINAL': 'final',
    }
    const koApiFixtures = matches.filter(m =>
      API_STAGE_TO_OURS[m.stage] && m.homeTeam?.name && m.awayTeam?.name
    )
    if (koApiFixtures.length > 0) {
      // Load knockout rows missing teams + the teams lookup, once
      const { data: koRows } = await supabase
        .from('matches')
        .select('id, match_number, stage, kickoff_time, home_team_id, away_team_id')
        .in('stage', ['r32', 'r16', 'qf', 'sf', '3rd', 'final'])
      const { data: allTeams } = await supabase.from('teams').select('id, name')
      const teamByName = {}
      for (const t of allTeams || []) teamByName[stripAccents(normalise(t.name))] = t.id

      // Real group positions (from completed groups) so we can verify a fixture's
      // teams actually belong in a row's slots before writing — the API sometimes
      // hands back provisional/placeholder teams for a not-yet-final slot, and we
      // must not stamp e.g. USA(1D) v BIH(3B) onto M83 (2K v 2L).
      const { data: gsRows } = await supabase
        .from('group_standings')
        .select('team_id, position, played, group:group_id(name)')
        .eq('played', 3)
      const realPos = {}
      for (const r of gsRows || []) realPos[r.team_id] = { group: r.group?.name, position: r.position }

      const R32_SLOTS = {
        73:['2A','2B'],76:['1C','2F'],77:['1I','BT3_CDFGH'],74:['1E','BT3_ABCDF'],
        79:['1A','BT3_CEFHI'],75:['1F','2C'],80:['1L','BT3_EHIJK'],78:['2E','2I'],
        81:['1D','BT3_BEFIJ'],82:['1G','BT3_AEHIJ'],83:['2K','2L'],87:['1K','BT3_DEIJL'],
        84:['1H','2J'],85:['1B','BT3_EFGIJ'],88:['2D','2G'],86:['1J','2H'],
      }
      const fitsSlot = (teamId, slot) => {
        const rp = realPos[teamId]
        if (!rp || !rp.group) return false
        const pos = slot.match(/^([12])([A-L])$/)
        if (pos) return rp.position === parseInt(pos[1]) && rp.group === pos[2]
        const bt3 = slot.match(/^BT3_([A-L]+)$/)
        if (bt3) return rp.position === 3 && bt3[1].includes(rp.group)
        return false
      }

      for (const apiFx of koApiFixtures) {
        const ourStage = API_STAGE_TO_OURS[apiFx.stage]
        const ourRow = (koRows || []).find(r =>
          r.stage === ourStage &&
          new Date(r.kickoff_time).getTime() === new Date(apiFx.utcDate).getTime()
        )
        if (!ourRow) continue
        if (ourRow.home_team_id && ourRow.away_team_id) continue // already set

        const homeId = teamByName[stripAccents(normalise(apiFx.homeTeam.name))]
        const awayId = teamByName[stripAccents(normalise(apiFx.awayTeam.name))]
        if (!homeId || !awayId) {
          errors.push(`KO fixture M${ourRow.match_number}: unknown team ${apiFx.homeTeam.name} / ${apiFx.awayTeam.name}`)
          continue
        }

        // R32 eligibility guard: only write if the teams actually fit this row's
        // slots (per real group standings). Prevents a placeholder/provisional API
        // fixture from stamping the wrong teams into a slot (e.g. USA v BIH → M83).
        let writeHome = homeId, writeAway = awayId
        if (ourStage === 'r32') {
          const slots = R32_SLOTS[ourRow.match_number]
          if (slots) {
            const directOk = fitsSlot(homeId, slots[0]) && fitsSlot(awayId, slots[1])
            const swapOk   = fitsSlot(awayId, slots[0]) && fitsSlot(homeId, slots[1])
            if (!directOk && !swapOk) continue           // teams don't belong here — skip
            if (!directOk && swapOk) { writeHome = awayId; writeAway = homeId } // align to bracket order
          }
        }

        const { error: fxErr } = await supabase.from('matches').update({
          home_team_id: ourRow.home_team_id || writeHome,
          away_team_id: ourRow.away_team_id || writeAway,
          external_match_id: apiFx.id.toString(),
        }).eq('id', ourRow.id)
        if (!fxErr) fixturesPopulated++
      }
    }

    const statusPriority = { IN_PLAY: 0, PAUSED: 0, EXTRA_TIME: 0, PENALTY_SHOOTOUT: 0, FINISHED: 1, AWARDED: 1 }
    const orderedMatches = [...matches].sort((a, b) => (statusPriority[a.status] ?? 9) - (statusPriority[b.status] ?? 9))

    for (const match of orderedMatches) {
      const providerLiveStatuses = new Set(['IN_PLAY', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'])
      const providerFinishedStatuses = new Set(['FINISHED', 'AWARDED'])

      if (!providerLiveStatuses.has(match.status) && !providerFinishedStatuses.has(match.status)) continue

      // The competition-wide endpoint can lag behind and may fold the goals
      // list. Fetch the individual match while live, on first completion, or
      // when a completed match still has no first-goal band locally.
      const localState = localSyncState.get(String(match.id))
      const needsCompletedDetail = providerFinishedStatuses.has(match.status) &&
        localState &&
        !localState.use_manual_override &&
        (localState.status !== 'completed' || !localState.first_goal_band)

      if ((providerLiveStatuses.has(match.status) || needsCompletedDetail) && detailRequests < MAX_DETAIL_REQUESTS) {
        try {
          const available = latestRate.requestsAvailable == null ? null : Number(latestRate.requestsAvailable)
          if (available != null && available <= 2) {
            errors.push(`Live detail M${match.id}: skipped because only ${available} provider requests remain`)
          } else {
            providerCalls += 1
            detailRequests += 1
            const detailResponse = await fetch(
              `https://api.football-data.org/v4/matches/${encodeURIComponent(match.id)}`,
              { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_KEY } }
            )
            latestRate = readRateLimitHeaders(detailResponse)
            if (detailResponse.ok) {
              const detail = await detailResponse.json()
              Object.assign(match, detail)
            } else {
              errors.push(`Live detail M${match.id}: HTTP ${detailResponse.status}`)
            }
          }
        } catch (detailError) {
          errors.push(`Live detail M${match.id}: ${detailError.message}`)
        }
      }

      const apiRegularScore = readScorePair(match.score?.regularTime)
      const apiFullTimeScore = readScorePair(match.score?.fullTime)
      const apiCurrentScore = readScorePair(match.score?.currentScore)
      const apiHalfTimeScore = readScorePair(match.score?.halfTime)
      const apiExtraTimeGoals = readScorePair(match.score?.extraTime)
      const apiPenaltyScore = readScorePair(match.score?.penalties)
      const anyApiScore = apiRegularScore || apiFullTimeScore || apiCurrentScore || apiHalfTimeScore
      const hasApiScore = Boolean(anyApiScore)
      const newStatus = providerFinishedStatuses.has(match.status)
        ? 'completed'
        : providerLiveStatuses.has(match.status)
          ? 'live'
          : 'scheduled'

      if (newStatus === 'completed' && !hasApiScore) {
        errors.push(`M${match.id}: provider marked FINISHED without a complete score`)
        continue
      }

      let { data: ourMatch, error: lookupError } = await supabase
        .from('matches')
        .select('id, match_number, external_match_id, status, home_score, away_score, live_minute, injury_time, winner_team_id, outcome_type, use_manual_override, stage, home_team_id, away_team_id, aet_home_score, aet_away_score, home_score_aet, away_score_aet, home_score_pens, away_score_pens, first_goal_band, home_team:home_team_id(name), away_team:away_team_id(name)')
        .eq('external_match_id', match.id.toString())
        .maybeSingle()

      if (lookupError) {
        errors.push(`External match lookup ${match.id}: ${lookupError.message}`)
        continue
      }

      let orientation = ourMatch ? inferOrientation(ourMatch, match) : { matches: false, reversed: false }

      if (!ourMatch) {
        const matchDate = match.utcDate?.substring(0, 10)
        if (!matchDate) continue
        const { data: candidates, error: candidateError } = await supabase
          .from('matches')
          .select('id, match_number, external_match_id, status, home_score, away_score, live_minute, injury_time, winner_team_id, outcome_type, use_manual_override, stage, home_team_id, away_team_id, aet_home_score, aet_away_score, home_score_aet, away_score_aet, home_score_pens, away_score_pens, first_goal_band, home_team:home_team_id(name), away_team:away_team_id(name), kickoff_time')
          .gte('kickoff_time', `${matchDate}T00:00:00Z`)
          .lte('kickoff_time', `${matchDate}T23:59:59Z`)

        if (candidateError) {
          errors.push(`Candidate lookup ${match.id}: ${candidateError.message}`)
          continue
        }

        const direct = (candidates || []).find(candidate => {
          const result = inferOrientation(candidate, match)
          return result.matches && !result.reversed
        })
        const reversed = !direct ? (candidates || []).find(candidate => {
          const result = inferOrientation(candidate, match)
          return result.matches && result.reversed
        }) : null
        ourMatch = direct || reversed || null
        orientation = ourMatch ? inferOrientation(ourMatch, match) : { matches: false, reversed: false }

        if (ourMatch) {
          const { error: externalIdError } = await supabase
            .from('matches')
            .update({ external_match_id: match.id.toString() })
            .eq('id', ourMatch.id)
          if (externalIdError) errors.push(`Store external ID M${ourMatch.match_number}: ${externalIdError.message}`)
        }
      }

      if (!ourMatch) continue
      if (!orientation.matches) {
        errors.push(`M${ourMatch.match_number}: external match ${match.id} teams do not match local fixture`)
        continue
      }

      const isKnockout = KO_STAGES.has(ourMatch.stage)
      const duration = match.score?.duration || 'REGULAR'

      // For completed knockout matches, regularTime is the authoritative
      // 90-minute score. fullTime can include ET or even the shootout total.
      const rawNinetyScore = isKnockout && newStatus === 'completed'
        ? (apiRegularScore || apiFullTimeScore)
        : (apiFullTimeScore || apiCurrentScore || apiHalfTimeScore)
      const orientedNinetyScore = orientPair(rawNinetyScore, orientation.reversed)
      const orientedRegularScore = orientPair(apiRegularScore, orientation.reversed)
      const orientedFullTimeScore = orientPair(apiFullTimeScore, orientation.reversed)
      const orientedExtraTimeGoals = orientPair(apiExtraTimeGoals, orientation.reversed)
      const orientedPenaltyScore = orientPair(apiPenaltyScore, orientation.reversed)

      // Manual control is explicit. The API must never clear it automatically,
      // even when the visible 90-minute score happens to match.
      if (ourMatch.use_manual_override) continue

      let effectiveHomeScore = orientedNinetyScore?.home ?? ourMatch.home_score
      let effectiveAwayScore = orientedNinetyScore?.away ?? ourMatch.away_score
      if (newStatus === 'live' && hasApiScore && orientedNinetyScore?.home === 0 && orientedNinetyScore?.away === 0 &&
          ((ourMatch.home_score || 0) > 0 || (ourMatch.away_score || 0) > 0)) {
        effectiveHomeScore = ourMatch.home_score
        effectiveAwayScore = ourMatch.away_score
      }

      let winnerTeamId = ourMatch.winner_team_id || null
      let outcomeType = ourMatch.outcome_type || '90mins'

      let aetHomeScore = firstDefined(ourMatch.aet_home_score, ourMatch.home_score_aet)
      let aetAwayScore = firstDefined(ourMatch.aet_away_score, ourMatch.away_score_aet)
      let pensHomeScore = ourMatch.home_score_pens
      let pensAwayScore = ourMatch.away_score_pens

      if (newStatus === 'completed' && isKnockout) {
        const winner = match.score?.winner
        outcomeType = duration === 'EXTRA_TIME' ? 'et'
          : duration === 'PENALTY_SHOOTOUT' ? 'penalties' : '90mins'

        if (outcomeType === 'et' || outcomeType === 'penalties') {
          // extraTime contains only goals scored in ET, so add it to the
          // regularTime score. Fall back to fullTime for an ET-only finish.
          if (orientedRegularScore && orientedExtraTimeGoals) {
            aetHomeScore = orientedRegularScore.home + orientedExtraTimeGoals.home
            aetAwayScore = orientedRegularScore.away + orientedExtraTimeGoals.away
          } else if (outcomeType === 'et' && orientedFullTimeScore) {
            aetHomeScore = orientedFullTimeScore.home
            aetAwayScore = orientedFullTimeScore.away
          } else if (orientedRegularScore) {
            aetHomeScore = orientedRegularScore.home
            aetAwayScore = orientedRegularScore.away
          }
        } else {
          aetHomeScore = null
          aetAwayScore = null
        }

        if (outcomeType === 'penalties' && orientedPenaltyScore) {
          pensHomeScore = orientedPenaltyScore.home
          pensAwayScore = orientedPenaltyScore.away
        } else if (outcomeType !== 'penalties') {
          pensHomeScore = null
          pensAwayScore = null
        }

        if (winner === 'HOME_TEAM') {
          winnerTeamId = orientation.reversed ? ourMatch.away_team_id : ourMatch.home_team_id
        } else if (winner === 'AWAY_TEAM') {
          winnerTeamId = orientation.reversed ? ourMatch.home_team_id : ourMatch.away_team_id
        } else if (effectiveHomeScore > effectiveAwayScore) {
          winnerTeamId = ourMatch.home_team_id
        } else if (effectiveAwayScore > effectiveHomeScore) {
          winnerTeamId = ourMatch.away_team_id
        }
      }

      const completedMatchScore = isKnockout && (outcomeType === 'et' || outcomeType === 'penalties')
        ? (aetHomeScore != null && aetAwayScore != null ? { home: aetHomeScore, away: aetAwayScore } : null)
        : (effectiveHomeScore != null && effectiveAwayScore != null ? { home: effectiveHomeScore, away: effectiveAwayScore } : null)
      const apiFirstGoalBand = firstGoalBandFromApi(match, newStatus === 'completed' ? completedMatchScore : null)
      const firstGoalBand = apiFirstGoalBand || ourMatch.first_goal_band || null

      let koResultComplete = true
      if (newStatus === 'completed' && isKnockout) {
        if (!winnerTeamId) koResultComplete = false
        if (outcomeType === '90mins' && effectiveHomeScore === effectiveAwayScore) koResultComplete = false
        if (outcomeType === 'et' && (effectiveHomeScore !== effectiveAwayScore || aetHomeScore == null || aetAwayScore == null || aetHomeScore === aetAwayScore)) koResultComplete = false
        if (outcomeType === 'penalties' && (
          effectiveHomeScore !== effectiveAwayScore ||
          aetHomeScore == null || aetAwayScore == null || aetHomeScore !== aetAwayScore ||
          pensHomeScore == null || pensAwayScore == null || pensHomeScore === pensAwayScore
        )) koResultComplete = false

        if (!koResultComplete) {
          errors.push(`M${ourMatch.match_number}: incomplete knockout result from provider; left for admin completion`)
        }
      }

      const safeStatus = newStatus === 'completed' && isKnockout && !koResultComplete
        ? ourMatch.status
        : newStatus

      const nextLiveMinute = safeStatus === 'live' ? (match.minute ?? null) : null
      const nextInjuryTime = safeStatus === 'live' ? (match.injuryTime ?? null) : null

      const scoreChanged = ourMatch.home_score !== effectiveHomeScore || ourMatch.away_score !== effectiveAwayScore
      const statusChanged = ourMatch.status !== safeStatus
      const minuteChanged = ourMatch.live_minute !== nextLiveMinute || ourMatch.injury_time !== nextInjuryTime
      const koResultChanged = isKnockout && safeStatus === 'completed' && (
        ourMatch.winner_team_id !== winnerTeamId ||
        ourMatch.outcome_type !== outcomeType ||
        firstDefined(ourMatch.aet_home_score, ourMatch.home_score_aet) !== aetHomeScore ||
        firstDefined(ourMatch.aet_away_score, ourMatch.away_score_aet) !== aetAwayScore ||
        ourMatch.home_score_pens !== pensHomeScore ||
        ourMatch.away_score_pens !== pensAwayScore
      )
      const firstGoalChanged = firstGoalBand !== ourMatch.first_goal_band
      const needsUpdate = scoreChanged || statusChanged || minuteChanged || koResultChanged || firstGoalChanged ||
        ourMatch.external_match_id !== match.id.toString()
      if (!needsUpdate) continue

      if (safeStatus === 'live' && ourMatch.status === 'scheduled') {
        try { await runRpc('snapshot_user_ranks') } catch (error) { errors.push(error.message) }
      }

      const updateFields = {
        home_score: effectiveHomeScore ?? null,
        away_score: effectiveAwayScore ?? null,
        status: safeStatus,
        external_match_id: match.id.toString(),
        api_synced_at: new Date().toISOString(),
        live_minute: nextLiveMinute,
        injury_time: nextInjuryTime,
        first_goal_band: firstGoalBand,
      }
      if (isKnockout && safeStatus === 'completed') {
        updateFields.winner_team_id = winnerTeamId
        updateFields.outcome_type = outcomeType
        updateFields.aet_home_score = aetHomeScore
        updateFields.aet_away_score = aetAwayScore
        updateFields.home_score_aet = aetHomeScore
        updateFields.away_score_aet = aetAwayScore
        updateFields.home_score_pens = pensHomeScore
        updateFields.away_score_pens = pensAwayScore
      }

      const { error: updateError } = await supabase.from('matches').update(updateFields).eq('id', ourMatch.id)
      if (updateError) {
        errors.push(`Update M${ourMatch.match_number}: ${updateError.message}`)
        continue
      }
      updated++

      const shouldRescore = safeStatus === 'completed' && (statusChanged || scoreChanged || koResultChanged || firstGoalChanged)
      if (!shouldRescore) continue

      let scoringSucceeded = true
      try {
        if (isKnockout) {
          await runRpc('calculate_knockout_points', { p_match_id: ourMatch.id })
          await runRpc('calculate_ko_prediction_points', { p_match_id: ourMatch.id })
        } else {
          await runRpc('calculate_prediction_points', { p_match_id: ourMatch.id })
          await runRpc('check_group_bonuses', { p_match_id: ourMatch.id })
        }
      } catch (error) {
        scoringSucceeded = false
        errors.push(`Scoring M${ourMatch.match_number}: ${error.message}`)
      }

      try {
        if (isKnockout) {
          const { data: allUsers, error: usersError } = await supabase.from('profiles').select('id')
          if (usersError) throw usersError
          for (const profile of allUsers || []) {
            await runRpc('recalculate_user_total_points', { p_user_id: profile.id })
          }
        } else {
          const { error: recalcError } = await supabase.rpc('recalculate_match_user_points', { p_match_id: ourMatch.id })
          if (recalcError) {
            const { data: preds, error: predsError } = await supabase
              .from('predictions')
              .select('user_id')
              .eq('match_id', ourMatch.id)
            if (predsError) throw predsError
            for (const pred of preds || []) {
              await runRpc('recalculate_user_total_points', { p_user_id: pred.user_id })
            }
          }
        }
      } catch (error) {
        scoringSucceeded = false
        errors.push(`Total points M${ourMatch.match_number}: ${error.message}`)
      }

      try {
        await scoreOfflinePlayers(supabase, ourMatch.id)
      } catch (error) {
        scoringSucceeded = false
        errors.push(`Offline scoring M${ourMatch.match_number}: ${error.message}`)
      }

      if (scoringSucceeded) pointsCalculated++
    }

    // Scorers and standings are intentionally not called from live score sync.
    // They remain separate admin actions, keeping this poll to one list request
    // plus at most one detailed-match request.
    await supabase.from('app_settings')
      .update({ value: new Date().toISOString() })
      .eq('key', 'last_sync_at')

    // New knockout participants can change bracket-progression points even when
    // no group standings were updated in this run.
    if (fixturesPopulated > 0) {
      try {
        await runRpc('recalculate_all_points_safe')
      } catch (e) {
        errors.push(`Bracket points refresh failed: ${e.message}`)
      }
    }

    await releaseSyncLock({ status: 'success', rate: latestRate, providerCalls })
    return jsonResponse(200, {
      message: 'Sync complete',
      source,
      updated,
      pointsCalculated,
      fixturesPopulated,
      providerCalls,
      detailRequests,
      rateLimit: latestRate,
      errors,
    })
  } catch (error) {
    await releaseSyncLock({ status: 'error', rate: latestRate, blockSeconds: 60, providerCalls })
    console.error('Score sync failed', error)
    return jsonResponse(200, {
      skipped: true,
      reason: error.message,
      providerCalls,
      detailRequests,
      rateLimit: latestRate,
    })
  }
}