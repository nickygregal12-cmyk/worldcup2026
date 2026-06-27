import { supabase } from './supabase.js'

const CACHE_KEY = 'wc26_tournament_pulse_v1'
const CACHE_MS = 5 * 60 * 1000

async function fetchAllRows(table, select, configure) {
  const pageSize = 1000
  const rows = []
  let from = 0

  while (true) {
    let query = supabase.from(table).select(select).range(from, from + pageSize - 1)
    if (configure) query = configure(query)
    const { data, error } = await query
    if (error) throw error
    const batch = data || []
    rows.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }

  return rows
}

function pct(value, total) {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

function safeName(profile) {
  return profile?.display_name || profile?.username || 'Player'
}

export async function loadTournamentPulse({ force = false } = {}) {
  if (!force) {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null')
      if (cached?.savedAt && Date.now() - cached.savedAt < CACHE_MS && cached.data) return cached.data
    } catch {}
  }

  const [profiles, predictions, matches, awardPredictions, scorers, leagues] = await Promise.all([
    fetchAllRows('profiles', 'id, username, display_name, avatar_emoji, total_points, exact_scores, streak_best, prediction_accuracy'),
    fetchAllRows('predictions', 'user_id, match_id, home_score, away_score, is_confident, points_awarded', q => q.not('home_score', 'is', null)),
    fetchAllRows('matches', 'id, match_number, kickoff_time, stage, status, home_score, away_score, home_team:home_team_id(name, flag_emoji, short_code), away_team:away_team_id(name, flag_emoji, short_code), group:group_id(name)'),
    fetchAllRows('award_predictions', 'award_type, predicted_player_name', q => q.eq('award_type', 'golden_boot')),
    supabase.from('tournament_scorers').select('*').order('goals', { ascending: false }).limit(10).then(({ data, error }) => {
      if (error) throw error
      return data || []
    }),
    fetchAllRows('leagues', 'id, is_global'),
  ])

  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))
  const matchMap = Object.fromEntries(matches.map(m => [m.id, m]))
  const now = Date.now()

  const totalUsers = profiles.length
  const activeUserIds = new Set(predictions.map(p => p.user_id))
  const totalPredictions = predictions.length
  const jokerCount = predictions.filter(p => p.is_confident).length
  const totalPoints = profiles.reduce((sum, p) => sum + (p.total_points || 0), 0)
  const avgPoints = totalUsers ? Math.round(totalPoints / totalUsers) : 0
  const topScore = Math.max(0, ...profiles.map(p => p.total_points || 0))
  const totalExact = profiles.reduce((sum, p) => sum + (p.exact_scores || 0), 0)
  const bestStreak = Math.max(0, ...profiles.map(p => p.streak_best || 0))
  const privateLeagueCount = leagues.filter(l => !l.is_global).length

  const scoreCounts = {}
  predictions.forEach(p => {
    const key = `${p.home_score}–${p.away_score}`
    scoreCounts[key] = (scoreCounts[key] || 0) + 1
  })
  const topScores = Object.entries(scoreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([score, count]) => ({ score, count, pct: pct(count, totalPredictions) }))

  const matchPredMap = {}
  predictions.forEach(p => {
    const match = matchMap[p.match_id]
    if (!match) return
    const locked = match.status === 'live' || match.status === 'completed' || new Date(match.kickoff_time).getTime() <= now
    if (!locked) return
    const row = (matchPredMap[p.match_id] ||= { home: 0, draw: 0, away: 0, total: 0, exact: 0 })
    row.total++
    if (p.home_score > p.away_score) row.home++
    else if (p.home_score === p.away_score) row.draw++
    else row.away++
    if (match.status === 'completed' && p.home_score === match.home_score && p.away_score === match.away_score) row.exact++
  })

  const consensus = matches
    .filter(m => (m.status === 'live' || m.status === 'completed' || new Date(m.kickoff_time).getTime() <= now) && matchPredMap[m.id]?.total >= 3)
    .map(m => {
      const picks = matchPredMap[m.id]
      const outcomes = [
        { key: 'home', count: picks.home, team: m.home_team },
        { key: 'draw', count: picks.draw, team: null },
        { key: 'away', count: picks.away, team: m.away_team },
      ].sort((a, b) => b.count - a.count)
      return { match: m, outcome: outcomes[0], pct: pct(outcomes[0].count, picks.total), total: picks.total }
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5)

  const completedMatches = matches.filter(m => m.status === 'completed' && m.home_score != null && m.away_score != null)
  const upsets = completedMatches
    .filter(m => matchPredMap[m.id]?.total >= 5)
    .map(m => {
      const picks = matchPredMap[m.id]
      const actualResult = m.home_score > m.away_score ? 'home' : m.home_score < m.away_score ? 'away' : 'draw'
      return { match: m, actualResult, actualPct: pct(picks[actualResult], picks.total), exactCount: picks.exact, total: picks.total }
    })
    .sort((a, b) => a.actualPct - b.actualPct)
    .slice(0, 5)

  const completedPredictionRows = predictions.filter(p => matchMap[p.match_id]?.status === 'completed')
  const correctResultRows = completedPredictionRows.filter(p => {
    const m = matchMap[p.match_id]
    const pred = Math.sign(p.home_score - p.away_score)
    const actual = Math.sign(m.home_score - m.away_score)
    return pred === actual
  })
  const communityAccuracy = pct(correctResultRows.length, completedPredictionRows.length)

  const bootCounts = {}
  awardPredictions.forEach(p => {
    if (p.predicted_player_name) bootCounts[p.predicted_player_name] = (bootCounts[p.predicted_player_name] || 0) + 1
  })
  const scorerMap = Object.fromEntries(scorers.map(s => [String(s.player_name || s.name || '').toLowerCase(), s]))
  const topBootPicks = Object.entries(bootCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count, pct: pct(count, awardPredictions.length), scorer: scorerMap[name.toLowerCase()] || null }))

  const records = {
    topScore: [...profiles].sort((a, b) => (b.total_points || 0) - (a.total_points || 0))[0] || null,
    exact: [...profiles].sort((a, b) => (b.exact_scores || 0) - (a.exact_scores || 0))[0] || null,
    streak: [...profiles].sort((a, b) => (b.streak_best || 0) - (a.streak_best || 0))[0] || null,
  }

  const data = {
    generatedAt: new Date().toISOString(),
    totalUsers,
    activeUsers: activeUserIds.size,
    privateLeagueCount,
    totalPredictions,
    jokerCount,
    avgPoints,
    topScore,
    totalExact,
    bestStreak,
    communityAccuracy,
    topScores,
    consensus,
    upsets,
    topBootPicks,
    scorers,
    records: {
      topScore: records.topScore ? { name: safeName(records.topScore), value: records.topScore.total_points || 0 } : null,
      exact: records.exact ? { name: safeName(records.exact), value: records.exact.exact_scores || 0 } : null,
      streak: records.streak ? { name: safeName(records.streak), value: records.streak.streak_best || 0 } : null,
    },
  }

  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data })) } catch {}
  return data
}
