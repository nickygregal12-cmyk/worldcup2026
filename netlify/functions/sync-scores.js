import { createClient } from '@supabase/supabase-js'

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

export const handler = async (event, context) => {
  // Auth check — reject requests without valid admin secret
  // pg_cron calls pass this header; direct calls from AdminPanel pass it too
  const secret = (event.headers || {})['x-admin-secret']
  if (!process.env.ADMIN_FUNCTION_SECRET || secret !== process.env.ADMIN_FUNCTION_SECRET) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const { data: settings } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'live_api_enabled')
    .single()

  if (settings?.value !== 'true') {
    return { statusCode: 200, body: JSON.stringify({ message: 'Live API disabled' }) }
  }

  try {
    const response = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
      { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_KEY, 'X-Api-Version': 'v4.1' } }
    )

    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = await response.json()
    const matches = data.matches || []
    let updated = 0
    let pointsCalculated = 0
    let fixturesPopulated = 0
    const errors = []

    // ── PASS 0: Fill the "easy" R32 slots (group winners/runners-up) the moment
    // their group finishes — straight from real standings. Best-third slots are
    // left for PASS 1 (the API) once FIFA's Annex C allocation is published.
    // Idempotent and fill-only, so it never overwrites a real team with null.
    try {
      await supabase.rpc('populate_r32_known_slots')
    } catch (e) {
      errors.push(`populate_r32_known_slots: ${e.message}`)
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
        const { error: fxErr } = await supabase.from('matches').update({
          home_team_id: ourRow.home_team_id || homeId,
          away_team_id: ourRow.away_team_id || awayId,
          external_match_id: apiFx.id.toString(),
        }).eq('id', ourRow.id)
        if (!fxErr) fixturesPopulated++
      }
    }

    const now = new Date()
    for (const match of matches) {
      // Also process SCHEDULED matches where kickoff has passed (API slow to switch to IN_PLAY)
      const kickoffPassed = match.utcDate && new Date(match.utcDate) <= now
      const treatAsLive = match.status === 'SCHEDULED' && kickoffPassed
      if (!['FINISHED', 'IN_PLAY', 'PAUSED'].includes(match.status) && !treatAsLive) continue

      // For live matches, football-data.org puts the running score in score.fullTime
      // (updated in real time on paid tiers). Fall back to halfTime, then currentScore, then 0-0.
      const homeScore = match.score?.fullTime?.home
        ?? match.score?.halfTime?.home
        ?? match.score?.currentScore?.home
        ?? 0
      const awayScore = match.score?.fullTime?.away
        ?? match.score?.halfTime?.away
        ?? match.score?.currentScore?.away
        ?? 0
      // Determine status — treat past-kickoff SCHEDULED as live
      const newStatus = match.status === 'FINISHED' ? 'completed'
        : (match.status === 'IN_PLAY' || match.status === 'PAUSED' || treatAsLive) ? 'live'
        : 'scheduled'

      // Try matching by external_match_id first (most reliable)
      let { data: ourMatch } = await supabase
        .from('matches')
        .select('id, status, home_score, away_score, use_manual_override, stage, home_team_id, away_team_id')
        .eq('external_match_id', match.id.toString())
        .maybeSingle()

      // Fallback: match by normalised team names + date
      if (!ourMatch) {
        const homeDb = normalise(match.homeTeam?.name || '')
        const awayDb = normalise(match.awayTeam?.name || '')
        const matchDate = match.utcDate?.substring(0, 10)

        const { data: candidates } = await supabase
          .from('matches')
          .select('id, status, home_score, away_score, use_manual_override, stage, home_team:home_team_id(name), away_team:away_team_id(name), kickoff_time')
          .gte('kickoff_time', `${matchDate}T00:00:00Z`)
          .lte('kickoff_time', `${matchDate}T23:59:59Z`)

        ourMatch = candidates?.find(c => {
          const h = stripAccents(c.home_team?.name || '')
          const a = stripAccents(c.away_team?.name || '')
          const apiH = stripAccents(homeDb)
          const apiA = stripAccents(awayDb)
          return (h === apiH && a === apiA) || (h === apiA && a === apiH)
        }) || null

        // If found by name, store the external_match_id for future syncs
        if (ourMatch) {
          await supabase.from('matches')
            .update({ external_match_id: match.id.toString() })
            .eq('id', ourMatch.id)
        }
      }

      if (!ourMatch || ourMatch.use_manual_override) {
        // If manually overridden but API now confirms same completed result, clear the override
        if (ourMatch?.use_manual_override && newStatus === 'completed' &&
            ourMatch.home_score === homeScore && ourMatch.away_score === awayScore) {
          await supabase.from('matches').update({ use_manual_override: false }).eq('id', ourMatch.id)
        }
        continue
      }
      // For live matches: if API returns 0-0 but we already have a real score stored
      // (from manual entry or a previous sync), keep the existing score
      // The API only returns real-time scores on higher tiers — don't regress to 0-0
      const effectiveHomeScore = (newStatus === 'live' && homeScore === 0 && awayScore === 0 && ourMatch.home_score != null)
        ? ourMatch.home_score
        : homeScore
      const effectiveAwayScore = (newStatus === 'live' && homeScore === 0 && awayScore === 0 && ourMatch.away_score != null)
        ? ourMatch.away_score
        : awayScore

      if (ourMatch.status === 'completed' && ourMatch.home_score === effectiveHomeScore && ourMatch.away_score === effectiveAwayScore) continue

      // Snapshot ranks when a match first goes live
      // This gives us a baseline to show rank movement during the match
      if (newStatus === 'live' && ourMatch.status === 'scheduled') {
        try { await supabase.rpc('snapshot_user_ranks') } catch (_) {}
      }

      // Derive winner_team_id and outcome_type for knockout scoring
      // football-data.org: score.winner = HOME_TEAM | AWAY_TEAM | DRAW
      // score.duration = REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT
      let winnerTeamId = null
      let outcomeType = '90mins'
      const isKnockoutStage = ['r32','r16','qf','sf','3rd','final'].includes(ourMatch.stage)

      if (match.status === 'FINISHED' && isKnockoutStage) {
        const winner = match.score?.winner
        const duration = match.score?.duration

        // Map duration to our outcome_type
        if (duration === 'EXTRA_TIME') outcomeType = 'et'
        else if (duration === 'PENALTY_SHOOTOUT') outcomeType = 'penalties'
        else outcomeType = '90mins'

        // Resolve winner team ID
        if (winner === 'HOME_TEAM') {
          winnerTeamId = ourMatch.home_team_id
        } else if (winner === 'AWAY_TEAM') {
          winnerTeamId = ourMatch.away_team_id
        }
        // DRAW at 90mins shouldn't happen in knockout — winner will be set after ET/PENS
      }

      const updateFields = {
        home_score: effectiveHomeScore,
        away_score: effectiveAwayScore,
        status: newStatus,
        external_match_id: match.id.toString(),
        api_synced_at: new Date().toISOString(),
      }

      // Live minute + injury time (v4.1 API). Store while live, clear when not.
      if (newStatus === 'live') {
        updateFields.live_minute = match.minute ?? null
        updateFields.injury_time = match.injuryTime ?? null
      } else {
        updateFields.live_minute = null
        updateFields.injury_time = null
      }

      // Only write knockout-specific fields for knockout stages
      if (isKnockoutStage && match.status === 'FINISHED') {
        if (winnerTeamId) updateFields.winner_team_id = winnerTeamId
        updateFields.outcome_type = outcomeType
      }

      const { error } = await supabase.from('matches').update(updateFields).eq('id', ourMatch.id)

      if (error) { errors.push(error.message); continue }
      updated++

      if (match.status === 'FINISHED' && ourMatch.status !== 'completed') {
        // Use appropriate scoring function based on stage
        const isKnockout = ['r32','r16','qf','sf','3rd','final'].includes(ourMatch.stage)
        if (isKnockout) {
          // Score main knockout bracket picks (team advancement)
          await supabase.rpc('calculate_knockout_points', { p_match_id: ourMatch.id })
          // Score KO Predictor picks (score/ET/PENS predictions) — separate game
          try { await supabase.rpc('calculate_ko_prediction_points', { p_match_id: ourMatch.id }) } catch (_) {}
        } else {
          await supabase.rpc('calculate_prediction_points', { p_match_id: ourMatch.id })
          // Check if this match completing finishes a group — if so, award
          // group position points (+2pts per correct position, +5 perfect group bonus).
          // check_group_bonuses is idempotent: no-ops if the group isn't complete yet.
          try { await supabase.rpc('check_group_bonuses', { p_match_id: ourMatch.id }) } catch (_) {}
        }
        pointsCalculated++

        // Batch recalc server-side: one RPC recalculates every affected user
        // (predictions AND knockout_picks users — fixes leaderboard not
        // updating after knockout matches)
        if (isKnockout) {
          // Knockout progression scoring is bracket-wide: a completed R32 result
          // can award points to ANY user who placed that team in their bracket,
          // not just users with a pick on this exact match. So recalc everyone.
          const { data: allUsers } = await supabase.from('profiles').select('id')
          for (const u of allUsers || []) {
            await supabase.rpc('recalculate_user_total_points', { p_user_id: u.id })
          }
        } else {
          const { data: recalcCount, error: recalcErr } = await supabase
            .rpc('recalculate_match_user_points', { p_match_id: ourMatch.id })
          if (recalcErr) {
            // Fallback to old per-user loop if the function is missing
            const { data: preds } = await supabase
              .from('predictions')
              .select('user_id')
              .eq('match_id', ourMatch.id)
            for (const pred of preds || []) {
              await supabase.rpc('recalculate_user_total_points', { p_user_id: pred.user_id })
            }
          }
        }

        // Score OFFLINE players for this match — idempotent recalc of their
        // total league_points from all their predictions (not additive, so
        // re-running never double-counts)
        try {
          await scoreOfflinePlayers(supabase, ourMatch.id)
        } catch (e) {
          console.error('Offline scoring failed:', e.message)
        }
      }
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
        await fetch(`${siteUrl}/.netlify/functions/sync-standings`, {
          method: 'POST',
          headers: { 'x-admin-secret': process.env.ADMIN_FUNCTION_SECRET }
        })
      } catch(e) { errors.push(`Standings auto-sync failed: ${e.message}`) }
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'Sync complete', updated, pointsCalculated, fixturesPopulated, errors }) }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}