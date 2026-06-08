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

export const handler = async (event) => {
  // Secret check
  const secret = event.headers?.['x-push-secret'] || event.headers?.['X-Push-Secret']
  if (process.env.PUSH_SECRET && secret && secret !== process.env.PUSH_SECRET) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  try {
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setUTCHours(0, 0, 0, 0)
    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1)
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1)

    // Get all matches from yesterday (completed) and today (upcoming/live)
    const { data: allMatches } = await supabase
      .from('matches')
      .select('id, match_number, kickoff_time, home_score, away_score, status, home_team:home_team_id(name, short_code, flag_emoji), away_team:away_team_id(name, short_code, flag_emoji), group:group_id(name)')
      .gte('kickoff_time', yesterdayStart.toISOString())
      .lt('kickoff_time', tomorrowStart.toISOString())
      .order('kickoff_time', { ascending: true })

    const yesterdayMatches = (allMatches || []).filter(m =>
      new Date(m.kickoff_time) >= yesterdayStart &&
      new Date(m.kickoff_time) < todayStart &&
      m.status === 'completed'
    )

    const todayMatches = (allMatches || []).filter(m =>
      new Date(m.kickoff_time) >= todayStart &&
      new Date(m.kickoff_time) < tomorrowStart
    )

    // Get all push subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth')

    if (!subscriptions?.length) {
      return { statusCode: 200, body: JSON.stringify({ message: 'No subscriptions' }) }
    }

    const userIds = [...new Set(subscriptions.map(s => s.user_id))]

    // Get profiles (last_seen_at + push_enabled)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, last_seen_at, push_enabled')
      .in('id', userIds)

    const lastSeenMap = {}
    const pushEnabledMap = {}
    profiles?.forEach(p => {
      lastSeenMap[p.id] = p.last_seen_at ? new Date(p.last_seen_at) : null
      pushEnabledMap[p.id] = p.push_enabled !== false // default true
    })

    // Get yesterday's predictions with points for these users
    const yesterdayMatchIds = yesterdayMatches.map(m => m.id)
    const todayMatchIds = todayMatches.map(m => m.id)

    const { data: yesterdayPreds } = yesterdayMatchIds.length ? await supabase
      .from('predictions')
      .select('user_id, match_id, home_score, away_score, points_awarded')
      .in('match_id', yesterdayMatchIds)
      .in('user_id', userIds)
      .not('home_score', 'is', null) : { data: [] }

    const { data: todayPreds } = todayMatchIds.length ? await supabase
      .from('predictions')
      .select('user_id, match_id')
      .in('match_id', todayMatchIds)
      .in('user_id', userIds)
      .not('home_score', 'is', null) : { data: [] }

    // Build per-user stats
    const userYesterdayStats = {}
    ;(yesterdayPreds || []).forEach(p => {
      if (!userYesterdayStats[p.user_id]) userYesterdayStats[p.user_id] = { total: 0, correct: 0, exact: 0, count: 0 }
      const s = userYesterdayStats[p.user_id]
      s.total += (p.points_awarded || 0)
      s.count++
      const match = yesterdayMatches.find(m => m.id === p.match_id)
      if (match && (p.points_awarded || 0) > 0) s.correct++
      if (match && p.home_score === match.home_score && p.away_score === match.away_score) s.exact++
    })

    const userTodayPredicted = new Set((todayPreds || []).map(p => `${p.user_id}:${p.match_id}`))

    // Unpredicted today matches per user (only ones not locked yet)
    const unlockedTodayMatches = todayMatches.filter(m => new Date(m.kickoff_time) > now)

    let sent = 0
    let skipped = 0

    for (const sub of subscriptions) {
      const uid = sub.user_id
      const lastSeen = lastSeenMap[uid]

      // How many of today's unlocked matches has this user NOT predicted?
      const missingToday = unlockedTodayMatches.filter(m =>
        !userTodayPredicted.has(`${uid}:${m.id}`)
      )

      // Has user seen yesterday's results? (opened app after yesterday's first match)
      const firstYesterdayKickoff = yesterdayMatches.length
        ? new Date(yesterdayMatches[0].kickoff_time)
        : null
      const hasSeenResults = lastSeen && firstYesterdayKickoff && lastSeen >= firstYesterdayKickoff

      const hasYesterdayResults = (userYesterdayStats[uid]?.count || 0) > 0
      const hasMissingPicks = missingToday.length > 0

      // Skip if user has disabled notifications
      if (!pushEnabledMap[uid]) { skipped++; continue }

      // Skip if nothing to say
      if (!hasYesterdayResults && !hasMissingPicks) { skipped++; continue }

      // Skip if they've already seen results AND have no missing picks
      if (hasSeenResults && !hasMissingPicks) { skipped++; continue }

      // Build notification
      let title, body

      if (hasYesterdayResults && !hasSeenResults) {
        // Primary: score summary from yesterday
        const s = userYesterdayStats[uid]
        title = `⚽ Yesterday: +${s.total}pts — ${s.correct}/${s.count} correct${s.exact > 0 ? ` · ${s.exact} exact!` : ''}`
        if (hasMissingPicks) {
          body = `${missingToday.length} match${missingToday.length > 1 ? 'es' : ''} today still to predict`
        } else {
          body = yesterdayMatches.slice(0, 2).map(m =>
            `${m.home_team?.flag_emoji}${m.home_team?.short_code} ${m.home_score}–${m.away_score} ${m.away_team?.short_code}${m.away_team?.flag_emoji}`
          ).join(' · ')
        }
      } else if (hasMissingPicks) {
        // Secondary: reminder to pick (only if not locked)
        const names = missingToday.slice(0, 2).map(m =>
          `${m.home_team?.flag_emoji}${m.home_team?.short_code} v ${m.away_team?.short_code}${m.away_team?.flag_emoji}`
        ).join(', ')
        title = `📋 ${missingToday.length} prediction${missingToday.length > 1 ? 's' : ''} missing today`
        body = names
      }

      const payload = JSON.stringify({
        title,
        body,
        tag: `wc26-${todayStart.toISOString().split('T')[0]}`,
        renotify: false,
        url: hasYesterdayResults && !hasSeenResults ? '/predictions' : '/predictions',
      })

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        sent++
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    }

    return { statusCode: 200, body: JSON.stringify({ sent, skipped }) }
  } catch (err) {
    console.error('Push error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
