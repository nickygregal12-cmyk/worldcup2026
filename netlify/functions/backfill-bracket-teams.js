import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// R32 bracket structure. home/away are SLOT descriptors, not teams.
const R32_MATCHES = [
  { match_number: 73, home_slot: '2A', away_slot: '2B' },
  { match_number: 76, home_slot: '1C', away_slot: '2F' },
  { match_number: 77, home_slot: '1I', away_slot: 'BT3_CDFGH' },
  { match_number: 74, home_slot: '1E', away_slot: 'BT3_ABCDF' },
  { match_number: 79, home_slot: '1A', away_slot: 'BT3_CEFHI' },
  { match_number: 75, home_slot: '1F', away_slot: '2C' },
  { match_number: 80, home_slot: '1L', away_slot: 'BT3_EHIJK' },
  { match_number: 78, home_slot: '2E', away_slot: '2I' },
  { match_number: 81, home_slot: '1D', away_slot: 'BT3_BEFIJ' },
  { match_number: 82, home_slot: '1G', away_slot: 'BT3_AEHIJ' },
  { match_number: 83, home_slot: '2K', away_slot: '2L' },
  { match_number: 87, home_slot: '1K', away_slot: 'BT3_DEIJL' },
  { match_number: 84, home_slot: '1H', away_slot: '2J' },
  { match_number: 85, home_slot: '1B', away_slot: 'BT3_EFGIJ' },
  { match_number: 88, home_slot: '2D', away_slot: '2G' },
  { match_number: 86, home_slot: '1J', away_slot: '2H' },
]

// Standings for one group from a user's predictions. Tie-break matches the app's
// calcPredictedStandings: pts, gd, gf, then registration order (NOT team id), so
// the columns we write line up with what the bracket views resolve.
function calcStandings(groupMatches, predictions, groupName) {
  const teams = {}
  groupMatches.forEach(m => {
    if (!teams[m.home_team_id]) teams[m.home_team_id] = { id: m.home_team_id, pts: 0, gd: 0, gf: 0, played: 0, order: Object.keys(teams).length }
    if (!teams[m.away_team_id]) teams[m.away_team_id] = { id: m.away_team_id, pts: 0, gd: 0, gf: 0, played: 0, order: Object.keys(teams).length }
    const pred = predictions[m.id]
    if (!pred || pred.home_score === null || pred.away_score === null) return
    const h = parseInt(pred.home_score), a = parseInt(pred.away_score)
    teams[m.home_team_id].gf += h; teams[m.home_team_id].gd += h - a; teams[m.home_team_id].played++
    teams[m.away_team_id].gf += a; teams[m.away_team_id].gd += a - h; teams[m.away_team_id].played++
    if (h > a) { teams[m.home_team_id].pts += 3 }
    else if (h < a) { teams[m.away_team_id].pts += 3 }
    else { teams[m.home_team_id].pts += 1; teams[m.away_team_id].pts += 1 }
  })
  return Object.values(teams)
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.order - b.order)
    .map((t, i) => ({ ...t, position: i + 1, group: groupName }))
}

// Whether a group is resolvable: every match is completed (group stage over) or
// has a complete prediction. Mirrors the app's groupFullyPredicted, which treats
// completed matches as satisfied — so the best-third allocation runs as it does
// in the live bracket views.
function groupFullyPredicted(groupMatches, predictions) {
  if (!groupMatches.length) return false
  return groupMatches.every(m => {
    if (m.status === 'completed') return true
    const p = predictions[m.id]
    return p && p.home_score !== null && p.away_score !== null && p.home_score !== '' && p.away_score !== ''
  })
}

// The 8 best third-placed teams across all groups, best first.
function getBest3rds(standingsMap) {
  const thirds = []
  for (const arr of Object.values(standingsMap)) {
    const t = arr.find(x => x.position === 3)
    if (t) thirds.push(t)
  }
  return thirds
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.id.localeCompare(b.id))
    .slice(0, 8)
}

// FIFA-legal global allocation of the 8 qualifying third-place GROUPS to the 8
// best-third R32 slots. Deterministic backtracking - most-constrained slot first.
// This is the part the old code got wrong: it assigned each slot independently,
// so one team could fill several slots. Mirrors allocateThirdPlaces in bracketUtils.
function allocateThirdPlaces(qualifiedGroups) {
  if (!qualifiedGroups || qualifiedGroups.length !== 8) return null
  const slotKeys = R32_MATCHES.map(m => m.away_slot).filter(s => /^BT3_[A-L]+$/.test(s))
  const slots = slotKeys.map(key => ({
    key,
    eligible: key.slice(4).split('').filter(g => qualifiedGroups.includes(g)).sort(),
  }))
  const order = [...slots].sort((a, b) => a.eligible.length - b.eligible.length || a.key.localeCompare(b.key))
  const used = new Set()
  const assign = {}
  const backtrack = (i) => {
    if (i === order.length) return true
    const slot = order[i]
    for (const g of slot.eligible) {
      if (used.has(g)) continue
      used.add(g); assign[slot.key] = g
      if (backtrack(i + 1)) return true
      used.delete(g); delete assign[slot.key]
    }
    return false
  }
  return backtrack(0) ? assign : null
}

// Resolve any slot to a team id, using a precomputed best-third allocation so
// each third lands in exactly one slot (matches the live app's resolveSlot).
function resolveSlot(slot, standingsMap, allocation, best3rds, predictedGroups) {
  if (!slot) return null

  const posMatch = slot.match(/^([12])([A-L])$/)
  if (posMatch) {
    const pos = parseInt(posMatch[1]), grp = posMatch[2]
    if (!predictedGroups.has(grp)) return null
    return (standingsMap[grp] || []).find(t => t.position === pos)?.id || null
  }

  const bt3 = slot.match(/^BT3_([A-L]+)$/)
  if (bt3) {
    const eligibleGroups = bt3[1].split('')
    if (predictedGroups.size < 4) return null
    // Full bracket predicted -> use the global FIFA-legal allocation.
    if (predictedGroups.size === 12 && allocation && allocation[slot]) {
      const grp = allocation[slot]
      return best3rds.find(t => t.group === grp)?.id || null
    }
    // Partial: only resolve when exactly one qualifying third fits this slot.
    const matching = best3rds.filter(t => eligibleGroups.includes(t.group))
    return matching.length === 1 ? matching[0].id : null
  }

  return null
}

export const handler = async (event) => {
  const secret = event.headers['x-admin-secret']
  if (!secret || secret !== process.env.ADMIN_FUNCTION_SECRET) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  // ?dry=1 reports what WOULD change without writing.
  const dryRun = event.queryStringParameters?.dry === '1'

  try {
    const { data: groupMatches } = await supabase
      .from('matches')
      .select('id, match_number, group_id, status, home_team_id, away_team_id, groups:group_id(name)')
      .eq('stage', 'group')

    const groupsByName = {}
    groupMatches.forEach(m => {
      const g = m.groups?.name
      if (g) { if (!groupsByName[g]) groupsByName[g] = []; groupsByName[g].push(m) }
    })

    const { data: allPreds } = await supabase
      .from('predictions')
      .select('user_id, match_id, home_score, away_score')

    const predsByUser = {}
    allPreds.forEach(p => {
      if (!predsByUser[p.user_id]) predsByUser[p.user_id] = {}
      predsByUser[p.user_id][p.match_id] = p
    })

    // Every R32 pick - we re-resolve ALL of them (the corruption is in already
    // populated rows, so we no longer skip rows that have teams).
    const { data: r32Picks } = await supabase
      .from('knockout_picks')
      .select('id, user_id, match_number, home_team_id, away_team_id, winner_team_id')
      .eq('stage', 'r32')

    const updates = []
    let unchanged = 0

    for (const pick of r32Picks) {
      const matchDef = R32_MATCHES.find(m => m.match_number === pick.match_number)
      if (!matchDef) continue

      const userPreds = predsByUser[pick.user_id] || {}

      const standingsMap = {}
      const predictedGroups = new Set()
      for (const [grp, matches] of Object.entries(groupsByName)) {
        standingsMap[grp] = calcStandings(matches, userPreds, grp)
        if (groupFullyPredicted(matches, userPreds)) predictedGroups.add(grp)
      }

      const best3rds = getBest3rds(standingsMap)
      const allocation = (predictedGroups.size === 12 && best3rds.length === 8)
        ? allocateThirdPlaces(best3rds.map(t => t.group))
        : null

      const homeId = resolveSlot(matchDef.home_slot, standingsMap, allocation, best3rds, predictedGroups)
      const awayId = resolveSlot(matchDef.away_slot, standingsMap, allocation, best3rds, predictedGroups)

      // Don't wipe a previously-resolved team if we can't resolve it now
      // (e.g. incomplete predictions) - only write when we have a value.
      const newHome = homeId || pick.home_team_id || null
      const newAway = awayId || pick.away_team_id || null

      if (newHome === pick.home_team_id && newAway === pick.away_team_id) {
        unchanged++
        continue
      }
      updates.push({ id: pick.id, home_team_id: newHome, away_team_id: newAway })
    }

    if (dryRun) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Dry run - no writes', wouldUpdate: updates.length, unchanged, total: r32Picks.length }),
      }
    }

    let updated = 0
    for (let i = 0; i < updates.length; i += 50) {
      const chunk = updates.slice(i, i + 50)
      for (const u of chunk) {
        const { error } = await supabase
          .from('knockout_picks')
          .update({ home_team_id: u.home_team_id, away_team_id: u.away_team_id })
          .eq('id', u.id)
        if (!error) updated++
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Backfill complete', updated, unchanged, total: r32Picks.length }),
    }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}
