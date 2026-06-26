import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

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

function calcStandings(groupMatches, predictions, groupName) {
  const teams = {}
  groupMatches.forEach(m => {
    if (!teams[m.home_team_id]) teams[m.home_team_id] = { id: m.home_team_id, pts: 0, gd: 0, gf: 0, played: 0 }
    if (!teams[m.away_team_id]) teams[m.away_team_id] = { id: m.away_team_id, pts: 0, gd: 0, gf: 0, played: 0 }
    const pred = predictions[m.id]
    if (!pred || pred.home_score === null || pred.away_score === null) return
    const h = parseInt(pred.home_score), a = parseInt(pred.away_score)
    teams[m.home_team_id].gf += h; teams[m.home_team_id].gd += h - a; teams[m.home_team_id].played++
    teams[m.away_team_id].gf += a; teams[m.away_team_id].gd += a - h; teams[m.away_team_id].played++
    if (h > a) { teams[m.home_team_id].pts += 3 }
    else if (h < a) { teams[m.away_team_id].pts += 3 }
    else { teams[m.home_team_id].pts += 1; teams[m.away_team_id].pts += 1 }
  })
  return Object.values(teams).sort((a, b) =>
    b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.id.localeCompare(b.id)
  ).map((t, i) => ({ ...t, position: i + 1, group: groupName }))
}

function resolveSlot(slot, standingsMap) {
  if (!slot) return null
  const posMatch = slot.match(/^([12])([A-L])$/)
  if (posMatch) {
    const pos = parseInt(posMatch[1]), grp = posMatch[2]
    const grpStandings = standingsMap[grp] || []
    return grpStandings.find(t => t.position === pos)?.id || null
  }
  if (slot.startsWith('BT3_')) {
    const groups = slot.replace('BT3_', '').split('')
    const thirds = groups.map(g => {
      const s = standingsMap[g] || []
      return s.find(t => t.position === 3) || null
    }).filter(Boolean)
    if (thirds.length < groups.length) return null // not all groups done
    thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.id.localeCompare(b.id))
    return thirds[0]?.id || null
  }
  return null
}

export const handler = async (event) => {
  const secret = event.headers['x-admin-secret']
  if (!secret || secret !== process.env.ADMIN_FUNCTION_SECRET) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  try {
    // Fetch all group matches with their IDs
    const { data: groupMatches } = await supabase
      .from('matches')
      .select('id, match_number, group_id, home_team_id, away_team_id, groups:group_id(name)')
      .eq('stage', 'group')

    const groupsByName = {}
    groupMatches.forEach(m => {
      const g = m.groups?.name
      if (g) { if (!groupsByName[g]) groupsByName[g] = []; groupsByName[g].push(m) }
    })

    // Fetch all users
    const { data: users } = await supabase.from('profiles').select('id, username')
    
    // Fetch all predictions
    const { data: allPreds } = await supabase
      .from('predictions')
      .select('user_id, match_id, home_score, away_score')

    const predsByUser = {}
    allPreds.forEach(p => {
      if (!predsByUser[p.user_id]) predsByUser[p.user_id] = {}
      predsByUser[p.user_id][p.match_id] = p
    })

    // Fetch all R32 knockout picks
    const { data: r32Picks } = await supabase
      .from('knockout_picks')
      .select('id, user_id, match_number, home_team_id, away_team_id, winner_team_id')
      .eq('stage', 'r32')

    const updates = []
    let skipped = 0

    for (const pick of r32Picks) {
      // Skip if already populated
      if (pick.home_team_id && pick.away_team_id) { skipped++; continue }

      const matchDef = R32_MATCHES.find(m => m.match_number === pick.match_number)
      if (!matchDef) continue

      const userPreds = predsByUser[pick.user_id] || {}
      
      // Build standings for each group from user predictions
      const standingsMap = {}
      for (const [grp, matches] of Object.entries(groupsByName)) {
        standingsMap[grp] = calcStandings(matches, userPreds, grp)
      }

      const homeId = resolveSlot(matchDef.home_slot, standingsMap)
      const awayId = resolveSlot(matchDef.away_slot, standingsMap)

      if (homeId || awayId) {
        updates.push({ id: pick.id, home_team_id: homeId, away_team_id: awayId })
      }
    }

    // Batch update in chunks of 50
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
      body: JSON.stringify({ message: 'Backfill complete', updated, skipped, total: r32Picks.length })
    }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}
