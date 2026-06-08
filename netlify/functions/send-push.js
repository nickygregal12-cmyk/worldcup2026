import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// Find match windows that completed in the last 3 hours
const getRecentlyCompletedWindow = async () => {
  const now = new Date()
  const threeHoursAgo = new Date(now - 3 * 60 * 60 * 1000)

  const { data: matches } = await supabase
    .from('matches')
    .select('id, match_number, kickoff_time, home_score, away_score, home_team:home_team_id(name,short_code,flag_emoji), away_team:away_team_id(name,short_code,flag_emoji), status')
    .eq('status', 'completed')
    .gte('kickoff_time', threeHoursAgo.toISOString())
    .lte('kickoff_time', now.toISOString())
    .order('kickoff_time', { ascending: false })

  return matches || []
}

const buildMatchSummary = (matches) => {
  return matches.slice(0, 3).map(m =>
    `${m.home_team?.flag_emoji || ''}${m.home_team?.short_code} ${m.home_score}–${m.away_score} ${m.away_team?.short_code}${m.away_team?.flag_emoji || ''}`
  ).join(' · ')
}

export const handler = async (event) => {
  // Basic secret check — only applies when called externally (not from pg_cron)
  const secret = event.headers?.['x-push-secret'] || event.headers?.['X-Push-Secret']
  if (process.env.PUSH_SECRET && secret && secret !== process.env.PUSH_SECRET) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  try {
    // Get recently completed matches
    const recentMatches = await getRecentlyCompletedWindow()
    if (recentMatches.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ message: 'No recently completed matches' }) }
    }

    const matchIds = recentMatches.map(m => m.id)
    const windowEnd = new Date(recentMatches[0].kickoff_time)

    // Get all predictions for these matches with points
    const { data: predictions } = await supabase
      .from('predictions')
      .select('user_id, match_id, home_score, away_score, points_awarded')
      .in('match_id', matchIds)
      .not('home_score', 'is', null)

    if (!predictions?.length) {
      return { statusCode: 200, body: JSON.stringify({ message: 'No predictions found' }) }
    }

    // Group by user
    const byUser = {}
    predictions.forEach(p => {
      if (!byUser[p.user_id]) byUser[p.user_id] = { preds: [], total: 0, correct: 0, exact: 0 }
      byUser[p.user_id].preds.push(p)
      byUser[p.user_id].total += (p.points_awarded || 0)
      const match = recentMatches.find(m => m.id === p.match_id)
      if (match && p.points_awarded > 0) byUser[p.user_id].correct++
      if (match && p.home_score === match.home_score && p.away_score === match.away_score) byUser[p.user_id].exact++
    })

    const userIds = Object.keys(byUser)

    // Get push subscriptions — only for users who haven't seen results yet
    // last_seen_at < windowEnd means they haven't opened the app since results came in
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth')
      .in('user_id', userIds)

    if (!subscriptions?.length) {
      return { statusCode: 200, body: JSON.stringify({ message: 'No subscriptions' }) }
    }

    // Get last_seen_at for these users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, last_seen_at')
      .in('id', userIds)

    const lastSeenMap = {}
    profiles?.forEach(p => { lastSeenMap[p.id] = p.last_seen_at })

    let sent = 0
    let skipped = 0

    for (const sub of subscriptions) {
      const userStats = byUser[sub.user_id]
      if (!userStats) continue

      // Skip if user has seen results already
      const lastSeen = lastSeenMap[sub.user_id]
      if (lastSeen && new Date(lastSeen) >= windowEnd) {
        skipped++
        continue
      }

      // Build personalised notification
      const pts = userStats.total
      const correct = userStats.correct
      const total = userStats.preds.length
      const exact = userStats.exact

      let title = `⚽ ${pts > 0 ? `+${pts}pts` : '0pts'} — ${correct}/${total} correct`
      if (exact > 0) title += ` · ${exact} exact!`

      const summary = buildMatchSummary(recentMatches)

      const payload = JSON.stringify({
        title,
        body: summary,
        tag: `results-${windowEnd.toISOString().split('T')[0]}`,
        renotify: false,
        url: '/predictions',
      })

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        sent++
      } catch (err) {
        // Remove invalid subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint)
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ sent, skipped, matches: recentMatches.length }),
    }
  } catch (err) {
    console.error('Push error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
