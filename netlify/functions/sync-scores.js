/* global process */
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from './_adminAuth.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

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

const getFootballDataKey = () =>
  process.env.FOOTBALL_DATA_KEY ||
  process.env.FOOTBALL_API_KEY ||
  process.env.API_FOOTBALL_KEY ||
  process.env.VITE_FOOTBALL_DATA_KEY ||
  ''

async function providerError(response) {
  const body = await response.text().catch(() => '')
  let detail = body
  try {
    const parsed = JSON.parse(body)
    detail = parsed.message || parsed.error || body
  } catch (_) {}
  return `football-data.org returned ${response.status}${detail ? `: ${String(detail).slice(0, 240)}` : ''}`
}

export const handler = async (event) => {
  const auth = await requireAdmin(event)
  if (!auth.ok) return auth.response

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const { data: settings } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'live_api_enabled')
    .single()

  if (settings?.value !== 'true') {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Live score API is disabled in Admin → Settings.',
        disabled: true,
        skipped: true,
      }),
    }
  }

  try {
    const footballDataKey = getFootballDataKey()
    if (!footballDataKey) {
      throw new Error(
        'No football-data.org key is configured. Add FOOTBALL_DATA_KEY to the Netlify Production environment and redeploy.'
      )
    }

    const response = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
      { headers: { 'X-Auth-Token': footballDataKey, 'X-Api-Version': 'v4.1' } }
    )

    if (!response.ok) throw new Error(await providerError(response))

    const data = await response.json()
    const matches = data.matches || []
    let updated = 0
    let pointsCalculated = 0
    let fixturesPopulated = 0
    let standingsSynced = false
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

    const now = new Date()
    for (const match of matches) {
      const kickoffPassed = match.utcDate && new Date(match.utcDate) <= now
      const treatAsLive = match.status === 'SCHEDULED' && kickoffPassed
      if (!['FINISHED', 'IN_PLAY', 'PAUSED'].includes(match.status) && !treatAsLive) continue

      const apiHomeScore = firstDefined(
        match.score?.fullTime?.home,
        match.score?.halfTime?.home,
        match.score?.currentScore?.home
      )
      const apiAwayScore = firstDefined(
        match.score?.fullTime?.away,
        match.score?.halfTime?.away,
        match.score?.currentScore?.away
      )
      const hasApiScore = apiHomeScore !== undefined && apiAwayScore !== undefined
      const newStatus = match.status === 'FINISHED'
        ? 'completed'
        : (match.status === 'IN_PLAY' || match.status === 'PAUSED' || treatAsLive) ? 'live' : 'scheduled'

      if (newStatus === 'completed' && !hasApiScore) {
        errors.push(`M${match.id}: provider marked FINISHED without a complete score`)
        continue
      }

      let { data: ourMatch, error: lookupError } = await supabase
        .from('matches')
        .select('id, match_number, external_match_id, status, home_score, away_score, winner_team_id, outcome_type, use_manual_override, stage, home_team_id, away_team_id, home_team:home_team_id(name), away_team:away_team_id(name)')
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
          .select('id, match_number, external_match_id, status, home_score, away_score, winner_team_id, outcome_type, use_manual_override, stage, home_team_id, away_team_id, home_team:home_team_id(name), away_team:away_team_id(name), kickoff_time')
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

      const orientedHomeScore = hasApiScore ? (orientation.reversed ? apiAwayScore : apiHomeScore) : undefined
      const orientedAwayScore = hasApiScore ? (orientation.reversed ? apiHomeScore : apiAwayScore) : undefined

      if (ourMatch.use_manual_override) {
        if (newStatus === 'completed' && hasApiScore &&
            ourMatch.home_score === orientedHomeScore && ourMatch.away_score === orientedAwayScore) {
          const { error: overrideError } = await supabase
            .from('matches')
            .update({ use_manual_override: false })
            .eq('id', ourMatch.id)
          if (overrideError) errors.push(`Clear manual override M${ourMatch.match_number}: ${overrideError.message}`)
        }
        continue
      }

      let effectiveHomeScore = hasApiScore ? orientedHomeScore : ourMatch.home_score
      let effectiveAwayScore = hasApiScore ? orientedAwayScore : ourMatch.away_score
      if (newStatus === 'live' && hasApiScore && orientedHomeScore === 0 && orientedAwayScore === 0 &&
          ((ourMatch.home_score || 0) > 0 || (ourMatch.away_score || 0) > 0)) {
        effectiveHomeScore = ourMatch.home_score
        effectiveAwayScore = ourMatch.away_score
      }

      const isKnockout = KO_STAGES.has(ourMatch.stage)
      let winnerTeamId = ourMatch.winner_team_id || null
      let outcomeType = ourMatch.outcome_type || '90mins'

      if (newStatus === 'completed' && isKnockout) {
        const winner = match.score?.winner
        const duration = match.score?.duration
        outcomeType = duration === 'EXTRA_TIME' ? 'et'
          : duration === 'PENALTY_SHOOTOUT' ? 'penalties' : '90mins'

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

      const scoreChanged = ourMatch.home_score !== effectiveHomeScore || ourMatch.away_score !== effectiveAwayScore
      const statusChanged = ourMatch.status !== newStatus
      const koResultChanged = isKnockout && newStatus === 'completed' &&
        (ourMatch.winner_team_id !== winnerTeamId || ourMatch.outcome_type !== outcomeType)
      const needsUpdate = scoreChanged || statusChanged || koResultChanged || ourMatch.external_match_id !== match.id.toString()
      if (!needsUpdate) continue

      if (newStatus === 'live' && ourMatch.status === 'scheduled') {
        try { await runRpc('snapshot_user_ranks') } catch (error) { errors.push(error.message) }
      }

      const updateFields = {
        home_score: effectiveHomeScore ?? null,
        away_score: effectiveAwayScore ?? null,
        status: newStatus,
        external_match_id: match.id.toString(),
        api_synced_at: new Date().toISOString(),
        live_minute: newStatus === 'live' ? (match.minute ?? null) : null,
        injury_time: newStatus === 'live' ? (match.injuryTime ?? null) : null,
      }
      if (isKnockout && newStatus === 'completed') {
        updateFields.winner_team_id = winnerTeamId
        updateFields.outcome_type = outcomeType
      }

      const { error: updateError } = await supabase.from('matches').update(updateFields).eq('id', ourMatch.id)
      if (updateError) {
        errors.push(`Update M${ourMatch.match_number}: ${updateError.message}`)
        continue
      }
      updated++

      const shouldRescore = newStatus === 'completed' && (statusChanged || scoreChanged || koResultChanged)
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

    // Sync top scorers
    try {
      const scorersRes = await fetch(
        'https://api.football-data.org/v4/competitions/WC/scorers?season=2026&limit=10',
        { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_KEY } }
      )
      if (scorersRes.ok) {
        const scorersData = await scorersRes.json()
        const scorers = scorersData.scorers || []
        // Delete existing and re-insert fresh
        await supabase.from('tournament_scorers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (scorers.length > 0) {
          await supabase.from('tournament_scorers').insert(
            scorers.map(s => ({
              player_name: s.player?.name || '',
              player_id: s.player?.id || null,
              team_name: normalise(s.team?.name || ''),
              goals: s.goals || 0,
              assists: s.assists || 0,
              penalties: s.penalties || 0,
              updated_at: new Date().toISOString(),
            }))
          )
        }
      }
    } catch(e) { errors.push(`Scorers sync failed: ${e.message}`) }

    // Update last sync time — use UPDATE not upsert to avoid INSERT policy issues
    await supabase.from('app_settings')
      .update({ value: new Date().toISOString() })
      .eq('key', 'last_sync_at')

    // Auto-trigger standings sync if any group matches were updated
    if (updated > 0) {
      try {
        const siteUrl = process.env.URL || 'https://wc26predictor1.netlify.app'
        const authHeader = event.headers?.authorization || event.headers?.Authorization
        const standingsHeaders = { 'Content-Type': 'application/json' }
        if (authHeader) standingsHeaders.Authorization = authHeader
        if (process.env.ADMIN_FUNCTION_SECRET) {
          standingsHeaders['x-admin-secret'] = process.env.ADMIN_FUNCTION_SECRET
        }

        const standingsResponse = await fetch(`${siteUrl}/.netlify/functions/sync-standings`, {
          method: 'POST',
          headers: standingsHeaders,
        })
        if (!standingsResponse.ok) {
          const detail = await standingsResponse.text().catch(() => '')
          throw new Error(`HTTP ${standingsResponse.status}${detail ? `: ${detail.slice(0, 180)}` : ''}`)
        }
        standingsSynced = true
      } catch(e) { errors.push(`Standings auto-sync failed: ${e.message}`) }
    }

    // New knockout participants can change bracket-progression points even when
    // no group standings were updated in this run.
    if (fixturesPopulated > 0 && !standingsSynced) {
      try {
        await runRpc('recalculate_all_points_safe')
      } catch (e) {
        errors.push(`Bracket points refresh failed: ${e.message}`)
      }
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'Sync complete', updated, pointsCalculated, fixturesPopulated, standingsSynced, errors }) }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}