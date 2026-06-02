/**
 * 🎲 Lucky Dip — odds-weighted random predictions
 * Uses betting odds where available, falls back to ELO rankings
 * Every run produces different results (probability-weighted, not fixed)
 */

import { toApiName, normalise } from './teamNames.js'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Weighted random choice — weights are probabilities (don't need to sum to 1) */
function weightedRandom(options) {
  const total = options.reduce((sum, o) => sum + o.weight, 0)
  let rand = Math.random() * total
  for (const o of options) {
    rand -= o.weight
    if (rand <= 0) return o.value
  }
  return options[options.length - 1].value
}

/** Convert decimal odds to implied probability */
function oddsToProb(decimal) {
  if (!decimal || decimal <= 1) return 0.33
  return 1 / decimal
}

/** Generate a realistic score given a result direction */
function generateScore(result) {
  const options = {
    home: [[1,0],[2,0],[2,1],[3,0],[3,1],[3,2],[1,0],[2,0],[2,1]],
    draw: [[0,0],[1,1],[2,2],[1,1],[0,0],[1,1]],
    away: [[0,1],[0,2],[1,2],[0,3],[1,2],[0,1]],
  }
  const scores = options[result]
  return scores[Math.floor(Math.random() * scores.length)]
}

/** Add a small random nudge to a probability so same-odds matches vary */
function jitter(prob, amount = 0.08) {
  return Math.max(0.05, Math.min(0.9, prob + (Math.random() - 0.5) * amount))
}

// ── Group match prediction (odds-based) ─────────────────────────────────────

export function predictMatchOdds(match, oddsMap) {
  const homeName = match.home_team?.name
  const awayName = match.away_team?.name

  // Try to find odds
  let matchOdds = null
  if (homeName && awayName && oddsMap) {
    const key1 = `${homeName}|${awayName}`
    const key2 = `${toApiName(homeName)}|${toApiName(awayName)}`
    matchOdds = oddsMap[key1] || oddsMap[key2]
    if (!matchOdds) {
      const normHome = normalise(homeName), normAway = normalise(awayName)
      for (const key of Object.keys(oddsMap)) {
        const [h, a] = key.split('|')
        if (normalise(h) === normHome && normalise(a) === normAway) { matchOdds = oddsMap[key]; break }
      }
    }
  }

  let homeProb, drawProb, awayProb

  if (matchOdds?.home_decimal && matchOdds?.draw_decimal && matchOdds?.away_decimal) {
    // Use odds — add jitter so same match gives different results each time
    homeProb = jitter(oddsToProb(matchOdds.home_decimal))
    drawProb = jitter(oddsToProb(matchOdds.draw_decimal))
    awayProb = jitter(oddsToProb(matchOdds.away_decimal))
  } else {
    // Fall back to ELO/FIFA ranking
    const homeRank = match.home_team?.fifa_ranking || 20
    const awayRank = match.away_team?.fifa_ranking || 20
    const homeStrength = 1 / homeRank
    const awayStrength = 1 / awayRank
    const total = homeStrength + awayStrength
    homeProb = jitter((homeStrength / total) * 0.7)
    drawProb = jitter(0.27)
    awayProb = jitter((awayStrength / total) * 0.7)
  }

  const result = weightedRandom([
    { value: 'home', weight: homeProb },
    { value: 'draw', weight: drawProb },
    { value: 'away', weight: awayProb },
  ])

  const [h, a] = generateScore(result)
  return { home: h, away: a }
}

// ── Knockout picks (ELO-based) ───────────────────────────────────────────────

export function predictKnockoutMatch(homeTeam, awayTeam) {
  if (!homeTeam || !awayTeam) return null
  const homeRank = homeTeam.fifa_ranking || 20
  const awayRank = awayTeam.fifa_ranking || 20
  const homeStrength = jitter(1 / homeRank)
  const awayStrength = jitter(1 / awayRank)
  return weightedRandom([
    { value: homeTeam.id, weight: homeStrength },
    { value: awayTeam.id, weight: awayStrength },
  ])
}

// ── Goals prediction (realistic random range) ────────────────────────────────

export function predictGoals() {
  // Group stage: 72 matches, real WC average ~2.5/game → 150-200 goals
  const groupGoals = Math.round(150 + Math.random() * 50)
  // Knockout: 32 matches (inc ET/pens), avg ~2.2/game → 60-85
  const knockoutGoals = Math.round(60 + Math.random() * 25)
  const totalGoals = groupGoals + knockoutGoals
  return { groupGoals, knockoutGoals, totalGoals }
}

// ── Awards prediction (weighted random from top players) ─────────────────────

export function predictAwards(players) {
  const pick = (posFilters, topN = 15) => {
    const pool = posFilters
      ? players.filter(p => posFilters.includes(p.position))
      : players
    // Weight by inverse of index — top players picked more often but not always
    const top = pool.slice(0, topN)
    if (!top.length) return null
    return weightedRandom(top.map((p, i) => ({ value: p, weight: topN - i })))
  }

  return {
    golden_boot: pick(['FWD', 'MID']),
    golden_glove: pick(['GK']),
    player_of_tournament: pick(null),
  }
}
