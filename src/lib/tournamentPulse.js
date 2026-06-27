import { supabase } from './supabase.js'

const CACHE_KEY = 'wc26_tournament_pulse_v3'
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

function normalisePlayerName(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function makeLeader(rows, valueKey) {
  const sorted = [...rows].sort((a, b) => (b[valueKey] || 0) - (a[valueKey] || 0))
  const row = sorted[0]
  return row ? { name: safeName(row), value: row[valueKey] || 0 } : null
}

function leaderFromMap(valueMap, profileMap) {
  const top = [...valueMap.entries()].sort((a, b) => b[1] - a[1])[0]
  if (!top) return null
  return { name: safeName(profileMap[top[0]]), value: top[1] || 0 }
}

function addToMap(map, key, amount = 1) {
  if (!key) return
  map.set(key, (map.get(key) || 0) + amount)
}

export async function loadTournamentPulse({ force = false } = {}) {
  if (!force) {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null')
      if (cached?.savedAt && Date.now() - cached.savedAt < CACHE_MS && cached.data) return cached.data
    } catch {}
  }

  const [profiles, predictions, matches, awardPredictions, scorers, leagues, knockoutPicks] = await Promise.all([
    fetchAllRows('profiles', 'id, username, display_name, avatar_emoji, total_points, exact_scores, streak_best, streak_current, prediction_accuracy'),
    fetchAllRows('predictions', 'user_id, match_id, home_score, away_score, is_confident, points_awarded', q => q.not('home_score', 'is', null)),
    fetchAllRows('matches', 'id, match_number, kickoff_time, stage, status, home_score, away_score, home_team_id, away_team_id, winner_team_id, home_team:home_team_id(name, flag_emoji, short_code), away_team:away_team_id(name, flag_emoji, short_code), group:group_id(name)'),
    fetchAllRows('award_predictions', 'user_id, award_type, predicted_player_name', q => q.eq('award_type', 'golden_boot')),
    supabase.from('tournament_scorers').select('*').order('goals', { ascending: false }).limit(20).then(({ data, error }) => {
      if (error) throw error
      return data || []
    }),
    fetchAllRows('leagues', 'id, is_global'),
    fetchAllRows('knockout_picks', 'user_id, match_number, stage, winner_team_id', q => q.not('winner_team_id', 'is', null)),
  ])

  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))
  const matchMap = Object.fromEntries(matches.map(m => [m.id, m]))
  const teamMap = {}
  matches.forEach(m => {
    if (m.home_team_id && m.home_team) teamMap[m.home_team_id] = m.home_team
    if (m.away_team_id && m.away_team) teamMap[m.away_team_id] = m.away_team
  })
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
    const row = (matchPredMap[p.match_id] ||= { home: 0, draw: 0, away: 0, total: 0, exact: 0, jokers: 0, paidJokers: 0 })
    row.total++
    if (p.home_score > p.away_score) row.home++
    else if (p.home_score === p.away_score) row.draw++
    else row.away++
    if (p.is_confident) {
      row.jokers++
      if ((p.points_awarded || 0) > 0) row.paidJokers++
    }
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
  const completedPredictionRows = predictions.filter(p => matchMap[p.match_id]?.status === 'completed')
  const correctResultRows = completedPredictionRows.filter(p => {
    const m = matchMap[p.match_id]
    return Math.sign(p.home_score - p.away_score) === Math.sign(m.home_score - m.away_score)
  })
  const communityAccuracy = pct(correctResultRows.length, completedPredictionRows.length)

  // Group-stage difficulty: compare the community's correct-result rate by group.
  const groupAccuracyMap = {}
  completedPredictionRows.forEach(p => {
    const m = matchMap[p.match_id]
    const groupName = m?.group?.name
    if (!groupName) return
    const row = (groupAccuracyMap[groupName] ||= { correct: 0, total: 0 })
    row.total += 1
    if (Math.sign(p.home_score - p.away_score) === Math.sign(m.home_score - m.away_score)) row.correct += 1
  })
  const groupAccuracy = Object.entries(groupAccuracyMap)
    .map(([group, row]) => ({ group, accuracy: pct(row.correct, row.total), total: row.total }))
    .filter(row => row.total > 0)
    .sort((a, b) => b.accuracy - a.accuracy)

  const upsets = completedMatches
    .filter(m => matchPredMap[m.id]?.total >= 5)
    .map(m => {
      const picks = matchPredMap[m.id]
      const actualResult = m.home_score > m.away_score ? 'home' : m.home_score < m.away_score ? 'away' : 'draw'
      return { match: m, actualResult, actualPct: pct(picks[actualResult], picks.total), exactCount: picks.exact, total: picks.total }
    })
    .sort((a, b) => a.actualPct - b.actualPct)
    .slice(0, 5)

  const predictable = completedMatches
    .filter(m => matchPredMap[m.id]?.total >= 5)
    .map(m => {
      const picks = matchPredMap[m.id]
      const actualResult = m.home_score > m.away_score ? 'home' : m.home_score < m.away_score ? 'away' : 'draw'
      return { match: m, actualPct: pct(picks[actualResult], picks.total), total: picks.total }
    })
    .sort((a, b) => b.actualPct - a.actualPct)
    .slice(0, 3)

  const jokerTraps = completedMatches
    .map(m => ({ match: m, ...(matchPredMap[m.id] || {}) }))
    .filter(row => row.jokers > 0)
    .sort((a, b) => (b.jokers - b.paidJokers) - (a.jokers - a.paidJokers))
    .slice(0, 3)

  // Golden Boot counts are keyed by a normalised name so accents, punctuation and
  // minor formatting differences (for example Dembélé / Dembele) still match.
  const bootCountsByKey = {}
  const bootDisplayNames = {}
  awardPredictions.forEach(p => {
    const raw = p.predicted_player_name?.trim()
    if (!raw) return
    const key = normalisePlayerName(raw)
    if (!key) return
    bootCountsByKey[key] = (bootCountsByKey[key] || 0) + 1
    bootDisplayNames[key] ||= raw
  })
  const scorerMap = Object.fromEntries(scorers.map(s => [normalisePlayerName(s.player_name || s.name || ''), s]))
  const allBootPicks = Object.entries(bootCountsByKey)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({
      key,
      name: bootDisplayNames[key],
      count,
      pct: pct(count, awardPredictions.length),
      scorer: scorerMap[key] || null,
    }))
  const bootPickCounts = Object.fromEntries(allBootPicks.map(p => [p.key, p]))
  const topBootPicks = allBootPicks.slice(0, 8)

  // Predictor records from completed group-stage predictions.
  const correctByUser = new Map()
  const exactByUser = new Map()
  const matchPointsByUser = new Map()
  const successfulJokersByUser = new Map()
  completedPredictionRows.forEach(p => {
    const m = matchMap[p.match_id]
    if (!m) return
    const correct = Math.sign(p.home_score - p.away_score) === Math.sign(m.home_score - m.away_score)
    const exact = p.home_score === m.home_score && p.away_score === m.away_score
    if (correct) addToMap(correctByUser, p.user_id)
    if (exact) addToMap(exactByUser, p.user_id)
    addToMap(matchPointsByUser, p.user_id, p.points_awarded || 0)
    if (p.is_confident && (p.points_awarded || 0) > 0) addToMap(successfulJokersByUser, p.user_id)
  })

  // Team-based bracket progress. A pick made in stage r32 represents a team
  // selected to reach R16, r16 represents QF, and so on.
  const targetStageForPickStage = { r32: 'r16', r16: 'qf', qf: 'sf', sf: 'final' }
  const stageWeights = { r16: 8, qf: 12, sf: 16, final: 20 }
  const actualTeamsByStage = {}
  Object.values(targetStageForPickStage).forEach(stage => {
    actualTeamsByStage[stage] = new Set()
    matches.filter(m => m.stage === stage).forEach(m => {
      if (m.home_team_id) actualTeamsByStage[stage].add(m.home_team_id)
      if (m.away_team_id) actualTeamsByStage[stage].add(m.away_team_id)
    })
  })

  const bracketByUser = new Map()
  knockoutPicks.forEach(p => {
    const targetStage = targetStageForPickStage[p.stage]
    if (!targetStage || !p.winner_team_id) return
    const row = bracketByUser.get(p.user_id) || { r16: 0, qf: 0, sf: 0, final: 0, points: 0 }
    if (actualTeamsByStage[targetStage]?.has(p.winner_team_id)) {
      row[targetStage] += 1
      row.points += stageWeights[targetStage] || 0
    }
    bracketByUser.set(p.user_id, row)
  })

  const bracketLeader = key => {
    const rows = [...bracketByUser.entries()].map(([userId, value]) => ({ userId, value: value[key] || 0 }))
    rows.sort((a, b) => b.value - a.value)
    const top = rows[0]
    return top ? { name: safeName(profileMap[top.userId]), value: top.value } : null
  }

  // Before knockout results arrive, champion trends are more useful than empty
  // bracket records. A final-stage pick represents the predicted tournament winner.
  const championCounts = {}
  knockoutPicks.forEach(p => {
    if (p.stage !== 'final' || !p.winner_team_id) return
    championCounts[p.winner_team_id] = (championCounts[p.winner_team_id] || 0) + 1
  })
  const championPicks = Object.entries(championCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([teamId, count]) => ({
      teamId,
      count,
      pct: pct(count, Object.values(championCounts).reduce((sum, value) => sum + value, 0)),
      team: teamMap[teamId] || null,
    }))

  const completedR32Matches = completedMatches.filter(m => m.stage === 'r32').length
  const bracketRaceVisible = completedR32Matches > 0

  const records = {
    topScore: makeLeader(profiles, 'total_points'),
    exact: leaderFromMap(exactByUser, profileMap) || makeLeader(profiles, 'exact_scores'),
    streak: makeLeader(profiles, 'streak_best'),
    currentStreak: makeLeader(profiles, 'streak_current'),
    correct: leaderFromMap(correctByUser, profileMap),
    matchPoints: leaderFromMap(matchPointsByUser, profileMap),
    successfulJokers: leaderFromMap(successfulJokersByUser, profileMap),
    bracketPoints: bracketLeader('points'),
    r16Teams: bracketLeader('r16'),
    qfTeams: bracketLeader('qf'),
    sfTeams: bracketLeader('sf'),
    finalTeams: bracketLeader('final'),
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
    completedMatches: completedMatches.length,
    tournamentGoals: completedMatches.reduce((sum, m) => sum + (m.home_score || 0) + (m.away_score || 0), 0),
    completedR32Matches,
    bracketRaceVisible,
    championPicks,
    groupAccuracy,
    easiestGroup: groupAccuracy[0] || null,
    toughestGroup: groupAccuracy[groupAccuracy.length - 1] || null,
    topScores,
    consensus,
    upsets,
    predictable,
    jokerTraps,
    topBootPicks,
    allBootPicks,
    bootPickCounts,
    scorers,
    records,
  }

  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data })) } catch {}
  return data
}
