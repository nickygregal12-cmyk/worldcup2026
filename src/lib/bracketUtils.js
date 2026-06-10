/**
 * Bracket utilities for WC26 Predictor
 * Calculates predicted group standings from user predictions
 * and builds the R32 bracket accordingly
 */

/**
 * Shared lock dates — single source of truth used by both Predictions and Knockout pages.
 *
 * MD1_STANDINGS_LOCK: After all MD1 matches complete (~Jun 17 last kickoff + 2hrs buffer).
 *   After this point users cannot change group standings order.
 *   They can still tweak scores as long as team positions don't change.
 *
 * KO_BRACKET_LOCK: Same date — knockout bracket also locks at end of MD1.
 *   Previously was end-of-MD2 which allowed exploitation of real match results.
 *
 * Both locks are derived dynamically from fixture data (MD1 = matches at index 0,1 per group).
 * These fallbacks are used only if fixture data is unavailable.
 */
export const MD1_STANDINGS_LOCK_FALLBACK = new Date('2026-06-18T06:00:00Z') // Wed 18 Jun 07:00 BST
export const MD1_LOCK_BUFFER_MS = 2 * 60 * 60 * 1000 // 2hr buffer after last kickoff

/**
 * Derive the MD1 lock time from actual fixture data.
 * MD1 = first 2 matches per group (indices 0, 1 when sorted by kickoff).
 */
export function getMD1LockTime(groupMatches) {
  const md1Kickoffs = []
  const byGroup = {}
  groupMatches.forEach(match => {
    const g = match.group?.name
    if (!g || !match.kickoff_time) return
    if (!byGroup[g]) byGroup[g] = []
    byGroup[g].push(match)
  })
  Object.values(byGroup).forEach(matches => {
    const ordered = [...matches].sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))
    // MD1 = first 2 matches per 4-team group
    ordered.slice(0, 2).forEach(match => {
      const kickoff = new Date(match.kickoff_time)
      if (!Number.isNaN(kickoff.getTime())) md1Kickoffs.push(kickoff)
    })
  })
  if (!md1Kickoffs.length) return MD1_STANDINGS_LOCK_FALLBACK
  const lastMD1 = new Date(Math.max(...md1Kickoffs.map(d => d.getTime())))
  return new Date(lastMD1.getTime() + MD1_LOCK_BUFFER_MS)
}

// Official R32 bracket structure — verified against FIFA/official sources
// home/away are slot descriptors, not teams
export const R32_MATCHES = [
  { match_number: 73, home_slot: '2A',  away_slot: '2B',        venue: 'Los Angeles',   kickoff: '2026-06-28T19:00:00Z' },
  { match_number: 74, home_slot: '1E',  away_slot: 'BT3_ABCDF', venue: 'Boston',        kickoff: '2026-06-29T17:00:00Z' },
  { match_number: 75, home_slot: '1F',  away_slot: '2C',        venue: 'Monterrey',     kickoff: '2026-06-29T20:30:00Z' },
  { match_number: 76, home_slot: '1C',  away_slot: '2F',        venue: 'Houston',       kickoff: '2026-06-30T01:00:00Z' },
  { match_number: 77, home_slot: '1I',  away_slot: 'BT3_CDFGH', venue: 'New York/NJ',   kickoff: '2026-06-30T17:00:00Z' },
  { match_number: 78, home_slot: '2E',  away_slot: '2I',        venue: 'Dallas',        kickoff: '2026-06-30T21:00:00Z' },
  { match_number: 79, home_slot: '1A',  away_slot: 'BT3_CEFHI', venue: 'Mexico City',   kickoff: '2026-07-01T01:00:00Z' },
  { match_number: 80, home_slot: '1L',  away_slot: 'BT3_EHIJK', venue: 'Atlanta',       kickoff: '2026-07-01T16:00:00Z' },
  { match_number: 81, home_slot: '1D',  away_slot: 'BT3_BEFIJ', venue: 'San Francisco', kickoff: '2026-07-01T20:00:00Z' },
  { match_number: 82, home_slot: '1G',  away_slot: 'BT3_AEHIJ', venue: 'Seattle',       kickoff: '2026-07-02T00:00:00Z' },
  { match_number: 83, home_slot: '2K',  away_slot: '2L',        venue: 'Toronto',       kickoff: '2026-07-02T19:00:00Z' },
  { match_number: 84, home_slot: '1H',  away_slot: '2J',        venue: 'Los Angeles',   kickoff: '2026-07-02T23:00:00Z' },
  { match_number: 85, home_slot: '1B',  away_slot: 'BT3_EFGIJ', venue: 'Vancouver',     kickoff: '2026-07-03T03:00:00Z' },
  { match_number: 86, home_slot: '1J',  away_slot: '2H',        venue: 'Miami',         kickoff: '2026-07-03T22:00:00Z' },
  { match_number: 87, home_slot: '1K',  away_slot: 'BT3_DEIJL', venue: 'Kansas City',   kickoff: '2026-07-04T01:30:00Z' },
  { match_number: 88, home_slot: '2D',  away_slot: '2G',        venue: 'Dallas',        kickoff: '2026-07-03T18:00:00Z' },
]

// R16 bracket — verified against official sources
export const R16_MATCHES = [
  { match_number: 89, home_slot: 'W74', away_slot: 'W77', venue: 'Philadelphia',  kickoff: '2026-07-04T21:00:00Z' },
  { match_number: 90, home_slot: 'W73', away_slot: 'W75', venue: 'Houston',       kickoff: '2026-07-04T17:00:00Z' },
  { match_number: 91, home_slot: 'W76', away_slot: 'W78', venue: 'New York/NJ',   kickoff: '2026-07-05T20:00:00Z' },
  { match_number: 92, home_slot: 'W79', away_slot: 'W80', venue: 'Mexico City',   kickoff: '2026-07-06T00:00:00Z' },
  { match_number: 93, home_slot: 'W83', away_slot: 'W84', venue: 'Dallas',        kickoff: '2026-07-06T19:00:00Z' },
  { match_number: 94, home_slot: 'W81', away_slot: 'W82', venue: 'Seattle',       kickoff: '2026-07-07T00:00:00Z' },
  { match_number: 95, home_slot: 'W86', away_slot: 'W88', venue: 'Atlanta',       kickoff: '2026-07-07T16:00:00Z' },
  { match_number: 96, home_slot: 'W85', away_slot: 'W87', venue: 'Vancouver',     kickoff: '2026-07-07T20:00:00Z' },
]

// QF bracket
export const QF_MATCHES = [
  { match_number: 97,  home_slot: 'W89', away_slot: 'W90', venue: 'Boston',      kickoff: '2026-07-09T20:00:00Z' },
  { match_number: 98,  home_slot: 'W93', away_slot: 'W94', venue: 'Los Angeles', kickoff: '2026-07-10T19:00:00Z' },
  { match_number: 99,  home_slot: 'W91', away_slot: 'W92', venue: 'Miami',       kickoff: '2026-07-11T21:00:00Z' },
  { match_number: 100, home_slot: 'W95', away_slot: 'W96', venue: 'Kansas City', kickoff: '2026-07-12T01:00:00Z' },
]

// SF bracket
export const SF_MATCHES = [
  { match_number: 101, home_slot: 'W97', away_slot: 'W98',  venue: 'Dallas',  kickoff: '2026-07-14T19:00:00Z' },
  { match_number: 102, home_slot: 'W99', away_slot: 'W100', venue: 'Atlanta', kickoff: '2026-07-15T19:00:00Z' },
]

export const THIRD_PLACE = { match_number: 103, home_slot: 'L101', away_slot: 'L102', venue: 'Miami', kickoff: '2026-07-18T21:00:00Z' }
export const FINAL = { match_number: 104, home_slot: 'W101', away_slot: 'W102', venue: 'New York/NJ', kickoff: '2026-07-19T19:00:00Z' }

export const ALL_STAGES = [
  { key: 'r32', label: 'Round of 32', matches: R32_MATCHES, points: 5 },
  { key: 'r16', label: 'Round of 16', matches: R16_MATCHES, points: 8 },
  { key: 'qf',  label: 'Quarter-finals', matches: QF_MATCHES, points: 12 },
  { key: 'sf',  label: 'Semi-finals', matches: SF_MATCHES, points: 16 },
  { key: 'final', label: 'The Final', matches: [FINAL], points: 20 },
]

/**
 * Calculate predicted group standings from user's predictions
 * Returns { A: [{team, pts, gd, gf}, ...], B: [...], ... }
 * Falls back to registration order if no predictions exist for a group
 */
export function calcPredictedStandings(matches, predictions) {
  const groups = {}

  // First pass — register all teams in each group (in match order = seeded order)
  for (const match of matches) {
    if (match.stage !== 'group') continue
    const groupName = match.group?.name
    if (!groupName) continue

    if (!groups[groupName]) groups[groupName] = {}

    const homeId = match.home_team_id
    const awayId = match.away_team_id

    if (!groups[groupName][homeId]) {
      groups[groupName][homeId] = {
        team: match.home_team, id: homeId,
        pts: 0, gd: 0, gf: 0, played: 0, order: Object.keys(groups[groupName]).length
      }
    }
    if (!groups[groupName][awayId]) {
      groups[groupName][awayId] = {
        team: match.away_team, id: awayId,
        pts: 0, gd: 0, gf: 0, played: 0, order: Object.keys(groups[groupName]).length
      }
    }
  }

  // Second pass — apply predictions/results
  for (const match of matches) {
    if (match.stage !== 'group') continue
    const groupName = match.group?.name
    if (!groupName) continue

    const homeId = match.home_team_id
    const awayId = match.away_team_id

    let homeScore, awayScore
    if (match.status === 'completed') {
      homeScore = match.home_score
      awayScore = match.away_score
    } else {
      const pred = predictions[match.id]
      if (pred?.home === undefined || pred?.away === undefined) continue
      homeScore = Number(pred.home)
      awayScore = Number(pred.away)
    }

    const h = groups[groupName][homeId]
    const a = groups[groupName][awayId]
    if (!h || !a) continue

    h.played++; a.played++
    h.gf += homeScore; h.gd += homeScore - awayScore
    a.gf += awayScore; a.gd += awayScore - homeScore

    if (homeScore > awayScore) { h.pts += 3 }
    else if (homeScore === awayScore) { h.pts += 1; a.pts += 1 }
    else { a.pts += 3 }
  }

  // Sort each group: pts desc, gd desc, gf desc, then original order as tiebreak
  const standings = {}
  for (const [group, teams] of Object.entries(groups)) {
    standings[group] = Object.values(teams).sort((a, b) =>
      b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.order - b.order
    )
  }
  return standings
}

/**
 * Check if ALL 3 group games for a group have been predicted (or completed)
 * Only returns true when the full group is predicted — bracket is stable at that point
 */
export function groupFullyPredicted(groupName, matches, predictions) {
  const groupMatches = matches.filter(m => m.group?.name === groupName && m.stage === 'group')
  if (groupMatches.length === 0) return false
  return groupMatches.every(match => {
    if (match.status === 'completed') return true
    const pred = predictions[match.id]
    return pred?.home !== undefined && pred?.away !== undefined &&
           pred.home !== '' && pred.away !== ''
  })
}

/**
 * Get the 8 best 3rd place teams from predicted standings
 * Returns array of { team, group, pts, gd, gf } sorted best first
 */
export function getBest3rdTeams(standings) {
  const thirds = []
  for (const [group, teams] of Object.entries(standings)) {
    if (teams[2]) {
      thirds.push({ ...teams[2], group })
    }
  }
  // Sort by pts, then gd, then gf
  return thirds.sort((a, b) =>
    b.pts - a.pts || b.gd - a.gd || b.gf - a.gf
  ).slice(0, 8)
}

/**
 * FIFA-legal allocation of the 8 qualifying third-place groups to the 8
 * best-third R32 slots. Deterministic backtracking: most-constrained slot
 * first, candidate groups alphabetical. Guarantees every third lands only
 * in a slot whose eligible-group list (FIFA's official constraints) allows
 * it, with a complete assignment whenever one exists.
 * Note: FIFA's published Annex C table makes specific tie-break choices
 * among legal assignments; this solver picks one legal assignment
 * deterministically. The REAL bracket is ingested from the API once FIFA
 * announces it, so actual results always follow FIFA exactly.
 * @param qualifiedGroups e.g. ['A','B','C','D','E','F','I','J']
 * @returns { 'BT3_ABCDF': 'A', ... } or null if infeasible/invalid
 */
export function allocateThirdPlaces(qualifiedGroups) {
  if (!qualifiedGroups || qualifiedGroups.length !== 8) return null
  const slotKeys = R32_MATCHES
    .map(m => m.away_slot)
    .filter(s => /^BT3_[A-L]+$/.test(s))
  const slots = slotKeys.map(key => ({
    key,
    eligible: key.slice(4).split('').filter(g => qualifiedGroups.includes(g)).sort(),
  }))
  // Most-constrained first keeps the search tiny and the result deterministic
  const order = [...slots].sort((a, b) =>
    a.eligible.length - b.eligible.length || a.key.localeCompare(b.key))
  const used = new Set()
  const assign = {}
  const backtrack = (i) => {
    if (i === order.length) return true
    const slot = order[i]
    for (const g of slot.eligible) {
      if (used.has(g)) continue
      used.add(g)
      assign[slot.key] = g
      if (backtrack(i + 1)) return true
      used.delete(g)
      delete assign[slot.key]
    }
    return false
  }
  return backtrack(0) ? assign : null
}

/**
 * Resolve a slot descriptor to a team object from standings
 * Only returns a team if the group has actual predictions/results
 * e.g. '1A' = winner of group A, '2B' = runner-up of group B
 * 'BT3_XXXXX' = FIFA Annex C best-third slot. The suffix lists the possible source groups.
 */
export function resolveSlot(slot, standings, matches = [], predictions = {}) {
  if (!slot) return null
  
  // Winner/runner-up slots: '1A', '2B', etc
  const posMatch = slot.match(/^([12])([A-L])$/)
  if (posMatch) {
    const pos = parseInt(posMatch[1]) - 1
    const group = posMatch[2]
    // Only show team if this group has at least one prediction or completed match
    if (!groupFullyPredicted(group, matches, predictions)) return null
    const entry = standings[group]?.[pos]
    return entry?.team || null
  }
  
  // FIFA best-third slots. These are not ranked #1-#8. FIFA allocates them using
  // Annexe C after the eight qualifying third-placed groups are known. Until the real
  // allocation is saved to the matches table, we only auto-resolve a slot when exactly
  // one qualifying third-placed group fits that slot's eligible group list. This avoids
  // showing a wrong team in the predictor.
  const bestThirdMatch = slot.match(/^BT3_([A-L]+)$/)
  if (bestThirdMatch) {
    const eligibleGroups = bestThirdMatch[1].split('')
    const best3rd = getBest3rdTeams(standings)
    const groupsWithPreds = Object.keys(standings).filter(g => groupFullyPredicted(g, matches, predictions))
    if (groupsWithPreds.length < 4) return null

    // All 12 groups predicted -> the 8 qualifying thirds are known, so run
    // the full FIFA-legal allocation and return this slot's assigned third.
    if (groupsWithPreds.length === 12 && best3rd.length === 8) {
      const allocation = allocateThirdPlaces(best3rd.map(t => t.group))
      if (allocation && allocation[slot]) {
        const assigned = best3rd.find(t => t.group === allocation[slot])
        return assigned?.team || null
      }
    }

    // Partial predictions: only resolve when exactly one qualifying third
    // fits this slot's eligible groups (never place a team illegally)
    const matchingThirds = best3rd.filter(t => eligibleGroups.includes(t.group))
    return matchingThirds.length === 1 ? matchingThirds[0].team : null
  }

  return null
}

/**
 * Find all knockout picks affected by a team change
 * Returns array of match_numbers that need warning
 * Only cascades FORWARD — higher match numbers only (never earlier rounds)
 */
export function findAffectedPicks(changedTeamId, knockoutPicks, changedMatchNumber = 0) {
  const affected = []
  for (const [matchNum, pick] of Object.entries(knockoutPicks)) {
    const mn = parseInt(matchNum)
    // Only flag matches that come AFTER the changed match (forward cascade only)
    if (mn <= changedMatchNumber) continue
    if (pick?.winner_id === changedTeamId || 
        pick?.home_id === changedTeamId || 
        pick?.away_id === changedTeamId) {
      affected.push(mn)
    }
  }
  return affected
}