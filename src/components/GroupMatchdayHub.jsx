import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { calcPredictedStandings } from '../lib/bracketUtils.js'
import WorldCupLogo from './WorldCupLogo.jsx'

const REFRESH_MS = 60000
const RECENT_RECAP_MS = 150 * 60 * 1000
const UPCOMING_PRIORITY_MS = 90 * 60 * 1000

const formatTime = (time) => new Date(time).toLocaleTimeString('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/London',
})

const formatDate = (time) => new Date(time).toLocaleDateString('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'Europe/London',
})

const VENUE_FLAGS = {
  'Mexico City': '🇲🇽', Guadalajara: '🇲🇽', Monterrey: '🇲🇽',
  Toronto: '🇨🇦', Vancouver: '🇨🇦',
  'New York': '🇺🇸', 'New York/NJ': '🇺🇸', 'New Jersey': '🇺🇸', 'East Rutherford': '🇺🇸',
  'Los Angeles': '🇺🇸', Dallas: '🇺🇸', Houston: '🇺🇸', 'San Francisco': '🇺🇸',
  Seattle: '🇺🇸', Boston: '🇺🇸', Miami: '🇺🇸', Atlanta: '🇺🇸',
  Philadelphia: '🇺🇸', 'Kansas City': '🇺🇸',
}

const venueFlag = (city = '') => VENUE_FLAGS[city] || '🏟️'

const formatWeather = weather => {
  if (!weather?.available) return null
  const temp = weather.temp_c
  const condition = weather.condition || ''
  const icon = weather.icon || '🌤️'
  return `${icon} ${Math.round(Number(temp))}°C${condition ? ` · ${condition}` : ''}`
}

const effectiveStatus = (match, now = new Date()) => {
  if (match?.status === 'live' || match?.status === 'completed') return match.status
  const kickoff = match?.kickoff_time ? new Date(match.kickoff_time) : null
  if (kickoff && kickoff <= now && now - kickoff < 3 * 60 * 60 * 1000) return 'live'
  return 'scheduled'
}

const sameKickoff = (a, b) => a?.kickoff_time && b?.kickoff_time && a.kickoff_time === b.kickoff_time

function chooseSlot(matches, now = new Date()) {
  const ordered = [...matches].sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))
  const live = ordered.filter(match => effectiveStatus(match, now) === 'live')
  if (live.length) return { mode: 'live', matches: live }

  const upcoming = ordered.filter(match => effectiveStatus(match, now) === 'scheduled' && new Date(match.kickoff_time) > now)
  const next = upcoming[0]
  if (next && new Date(next.kickoff_time) - now <= UPCOMING_PRIORITY_MS) {
    return { mode: 'prematch', matches: upcoming.filter(match => sameKickoff(match, next)) }
  }

  const completed = ordered
    .filter(match => match.status === 'completed')
    .sort((a, b) => new Date(b.kickoff_time) - new Date(a.kickoff_time))
  const latestCompleted = completed[0]
  if (latestCompleted && now - new Date(latestCompleted.kickoff_time) <= RECENT_RECAP_MS) {
    return { mode: 'fulltime', matches: completed.filter(match => sameKickoff(match, latestCompleted)) }
  }

  if (next) return { mode: 'prematch', matches: upcoming.filter(match => sameKickoff(match, next)) }
  if (latestCompleted) return { mode: 'fulltime', matches: completed.filter(match => sameKickoff(match, latestCompleted)) }
  return { mode: 'empty', matches: [] }
}

function useCountdown(target) {
  const [value, setValue] = useState({})

  useEffect(() => {
    if (!target) return undefined
    const update = () => {
      const diff = new Date(target) - new Date()
      if (diff <= 0) {
        setValue({ started: true, days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }
      setValue({
        started: false,
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [target])

  return value
}

function predictionPoints(prediction, match) {
  if (!prediction || match?.home_score == null || match?.away_score == null) return 0
  if (match.status === 'completed' && prediction.points_awarded != null) return Number(prediction.points_awarded) || 0

  const exact = Number(prediction.home_score) === Number(match.home_score) && Number(prediction.away_score) === Number(match.away_score)
  const sign = value => value > 0 ? 1 : value < 0 ? -1 : 0
  const outcome = sign(Number(prediction.home_score) - Number(prediction.away_score)) === sign(Number(match.home_score) - Number(match.away_score))
  const base = exact ? 5 : outcome ? 3 : 0
  return prediction.is_confident ? base * 2 : base
}

function predictionStatus(prediction, match) {
  if (!prediction) return 'No prediction saved'
  if (match?.home_score == null || match?.away_score == null) return 'Locked in'

  const exact = Number(prediction.home_score) === Number(match.home_score) && Number(prediction.away_score) === Number(match.away_score)
  const sign = value => value > 0 ? 1 : value < 0 ? -1 : 0
  const outcome = sign(Number(prediction.home_score) - Number(prediction.away_score)) === sign(Number(match.home_score) - Number(match.away_score))
  if (exact) return match.status === 'completed' ? 'Exact score 🎯' : 'Exact score currently'
  if (outcome) return match.status === 'completed' ? 'Correct result' : 'Result on track'
  return match.status === 'completed' ? 'Missed' : 'Not landing yet'
}

function calculateStandings(matches, scoreResolver) {
  const teams = new Map()
  matches.forEach(match => {
    if (match.home_team_id && !teams.has(match.home_team_id)) {
      teams.set(match.home_team_id, { id: match.home_team_id, team: match.home_team, pts: 0, gd: 0, gf: 0, played: 0 })
    }
    if (match.away_team_id && !teams.has(match.away_team_id)) {
      teams.set(match.away_team_id, { id: match.away_team_id, team: match.away_team, pts: 0, gd: 0, gf: 0, played: 0 })
    }
  })

  matches.forEach(match => {
    const score = scoreResolver(match)
    if (!score || score.home == null || score.away == null) return
    const home = teams.get(match.home_team_id)
    const away = teams.get(match.away_team_id)
    if (!home || !away) return

    const homeScore = Number(score.home)
    const awayScore = Number(score.away)
    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return

    home.played += 1
    away.played += 1
    home.gf += homeScore
    away.gf += awayScore
    home.gd += homeScore - awayScore
    away.gd += awayScore - homeScore

    if (homeScore > awayScore) home.pts += 3
    else if (awayScore > homeScore) away.pts += 3
    else {
      home.pts += 1
      away.pts += 1
    }
  })

  return [...teams.values()].sort((a, b) =>
    b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || String(a.id).localeCompare(String(b.id))
  )
}

function actualLiveStandings(groupMatches) {
  return calculateStandings(groupMatches, match => {
    const status = effectiveStatus(match)
    if (!['live', 'completed'].includes(status)) return null
    if (match.home_score == null || match.away_score == null) return null
    return { home: match.home_score, away: match.away_score }
  })
}

function hypotheticalScore(match, outcome, prediction) {
  const currentHome = Number(match.home_score ?? prediction?.home_score ?? 0)
  const currentAway = Number(match.away_score ?? prediction?.away_score ?? 0)
  const home = Number.isFinite(currentHome) ? currentHome : 0
  const away = Number.isFinite(currentAway) ? currentAway : 0

  if (outcome === 'home') return { home: Math.max(home, away + 1), away }
  if (outcome === 'away') return { home, away: Math.max(away, home + 1) }
  const level = Math.max(home, away)
  return { home: level, away: level }
}

function scoreScenario({ targetMatch, outcome, groupMatches, predictionMap, predictedTopTwo }) {
  const standings = calculateStandings(groupMatches, match => {
    if (match.id === targetMatch.id) return hypotheticalScore(match, outcome, predictionMap[match.id])
    const status = effectiveStatus(match)
    if (['live', 'completed'].includes(status) && match.home_score != null && match.away_score != null) {
      return { home: match.home_score, away: match.away_score }
    }
    const prediction = predictionMap[match.id]
    if (prediction?.home_score != null && prediction?.away_score != null) {
      return { home: prediction.home_score, away: prediction.away_score }
    }
    return null
  })

  const topTwo = standings.slice(0, 2).map(row => row.id)
  const predictedIds = predictedTopTwo.map(row => row.id)
  const exactPositions = topTwo.reduce((count, id, index) => count + (id === predictedIds[index] ? 1 : 0), 0)
  const qualifiers = topTwo.filter(id => predictedIds.includes(id)).length
  return { standings, topTwo, exactPositions, qualifiers, score: exactPositions * 3 + qualifiers }
}

function MatchStatus({ match, mode }) {
  if (mode === 'live') {
    const minute = match.live_minute != null
      ? `${match.live_minute}${match.injury_time ? `+${match.injury_time}` : ''}'`
      : 'LIVE'
    return <span style={{ color: '#d32f2f', fontSize: '10px', fontWeight: 900 }}>● {minute}</span>
  }
  if (mode === 'fulltime') return <span style={{ color: 'var(--accent-green)', fontSize: '10px', fontWeight: 900 }}>FULL TIME</span>
  return <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 800 }}>{formatTime(match.kickoff_time)} BST</span>
}

function ScenarioGrid({ match, groupMatches, predictionMap, predictedTopTwo, mode }) {
  if (mode === 'fulltime') {
    const finalTable = actualLiveStandings(groupMatches)
    const actualTopTwo = finalTable.slice(0, 2).map(row => row.id)
    const predictedIds = predictedTopTwo.map(row => row.id)
    const exact = actualTopTwo.reduce((count, id, index) => count + (id === predictedIds[index] ? 1 : 0), 0)
    const qualifiers = actualTopTwo.filter(id => predictedIds.includes(id)).length
    return (
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border-light)' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 800, marginBottom: '8px' }}>
          Final group-pick impact
        </div>
        <div style={{ padding: '9px 10px', borderRadius: 'var(--radius-sm)', background: qualifiers === 2 ? 'rgba(46,125,50,0.08)' : 'var(--bg-secondary)', border: qualifiers === 2 ? '1px solid rgba(46,125,50,0.22)' : '1px solid var(--border-light)', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          <b style={{ color: qualifiers === 2 ? 'var(--accent-green)' : 'var(--text-primary)' }}>{qualifiers}/2 predicted qualifiers</b> finished in the top two, with <b>{exact}/2</b> in the exact position.
        </div>
      </div>
    )
  }

  const scenarios = [
    { key: 'home', label: `${match.home_team?.short_code || 'Home'} win` },
    { key: 'draw', label: 'Draw' },
    { key: 'away', label: `${match.away_team?.short_code || 'Away'} win` },
  ].map(item => ({
    ...item,
    ...scoreScenario({ targetMatch: match, outcome: item.key, groupMatches, predictionMap, predictedTopTwo }),
  }))
  const bestScore = Math.max(...scenarios.map(item => item.score))
  const uniqueBest = scenarios.filter(item => item.score === bestScore).length === 1

  return (
    <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border-light)' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 800, marginBottom: '8px' }}>
        What best protects your group picks?
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
        {scenarios.map(item => {
          const highlighted = uniqueBest && item.score === bestScore
          return (
            <div key={item.key} style={{ padding: '9px 6px', borderRadius: 'var(--radius-sm)', textAlign: 'center', background: highlighted ? 'rgba(46,125,50,0.08)' : 'var(--bg-secondary)', border: highlighted ? '2px solid var(--accent-green)' : '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 900, color: highlighted ? 'var(--accent-green)' : 'var(--scottish-navy)', marginTop: '3px' }}>{item.qualifiers}/2</div>
              <div style={{ fontSize: '8.5px', color: 'var(--text-muted)', marginTop: '2px' }}>qualifiers match</div>
              {highlighted && <div style={{ fontSize: '8.5px', color: 'var(--accent-green)', fontWeight: 900, marginTop: '4px' }}>BEST FOR YOU</div>}
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '7px', lineHeight: 1.4 }}>
        Based on the current score in the other group match; unplayed games use your saved prediction.
      </div>
    </div>
  )
}

function GroupMatchCard({ match, mode, prediction, leagueCode, rivalId, weather }) {
  const hasScore = match.home_score != null && match.away_score != null
  const points = predictionPoints(prediction, match)
  const statusText = predictionStatus(prediction, match)
  const good = points > 0
  const matchCentre = `/match/${match.id}/stats${leagueCode ? `?league=${encodeURIComponent(leagueCode)}` : ''}`

  return (
    <article className="card fade-in" style={{ overflow: 'hidden', border: mode === 'live' ? '2px solid #d32f2f' : '1px solid var(--border-light)' }}>
      <div style={{ padding: '14px 14px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 800 }}>
            Group {match.group?.name || '?'} · M{match.match_number}
          </div>
          <MatchStatus match={match} mode={mode} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
            <span style={{ fontSize: '27px' }}>{match.home_team?.flag_emoji}</span>
            <span style={{ fontSize: '12px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.home_team?.short_code}</span>
          </div>
          <div style={{ textAlign: 'center', minWidth: '72px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 900 }}>{hasScore ? `${match.home_score}–${match.away_score}` : 'vs'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '7px', minWidth: 0 }}>
            <span style={{ fontSize: '12px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.away_team?.short_code}</span>
            <span style={{ fontSize: '27px' }}>{match.away_team?.flag_emoji}</span>
          </div>
        </div>

        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
          {formatDate(match.kickoff_time)} · {formatTime(match.kickoff_time)} BST
        </div>

        {(match.venue?.name || match.venue?.city) && (
          <div style={{ marginTop: '7px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '5px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: 700 }}>
            <span>{venueFlag(match.venue?.city)} {match.venue?.name || match.venue?.city}</span>
            {match.venue?.name && match.venue?.city && <span>· {match.venue.city}</span>}
            {formatWeather(weather) && <span>· {formatWeather(weather)}</span>}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '10px 14px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-secondary)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11.5px', fontWeight: 800 }}>
            {prediction?.home_score != null ? `Your pick: ${prediction.home_score}–${prediction.away_score}${prediction.is_confident ? ' 🃏' : ''}` : 'No prediction saved'}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{statusText}</div>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '17px', fontWeight: 900, color: mode === 'prematch' ? 'var(--text-muted)' : good ? 'var(--accent-green)' : 'var(--text-muted)' }}>
          {mode === 'prematch' ? '—' : `${points > 0 ? '+' : ''}${points}`}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: mode !== 'prematch' && rivalId ? '1fr 1fr' : '1fr', gap: '7px', padding: '0 14px 14px' }}>
        {mode === 'prematch' ? (
          <div
            aria-disabled="true"
            className="btn"
            style={{
              justifyContent: 'center',
              textAlign: 'center',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-light)',
              cursor: 'not-allowed',
            }}
          >
            🔒 Match Centre opens at kickoff
          </div>
        ) : (
          <Link to={matchCentre} className="btn" style={{ textDecoration: 'none', justifyContent: 'center', textAlign: 'center', background: 'var(--scottish-navy)', color: 'white' }}>
            Open Match Centre
          </Link>
        )}
        {mode !== 'prematch' && rivalId && (
          <Link to={`/h2h/${rivalId}`} className="btn btn-outline" style={{ textDecoration: 'none', justifyContent: 'center', textAlign: 'center' }}>
            Compare closest rival
          </Link>
        )}
      </div>
    </article>
  )
}

function GroupTable({ groupName, rows, predictedTopTwo }) {
  const predictedPosition = new Map(predictedTopTwo.map((row, index) => [row.id, index + 1]))
  return (
    <div className="card fade-in" style={{ padding: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 900 }}>Group {groupName}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Current table compared with your predicted finishing positions</div>
        </div>
        <span style={{ fontSize: '9px', fontWeight: 900, color: '#d32f2f', background: 'rgba(211,47,47,0.08)', borderRadius: 'var(--radius-full)', padding: '4px 7px' }}>LIVE TABLE</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 42px 30px 38px 32px', gap: '5px', color: 'var(--text-muted)', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', padding: '6px 4px' }}>
        <span>#</span><span>Team</span><span style={{ textAlign: 'center' }}>Your pick</span><span style={{ textAlign: 'right' }}>P</span><span style={{ textAlign: 'right' }}>GD</span><span style={{ textAlign: 'right' }}>Pts</span>
      </div>
      {rows.map((row, index) => {
        const predicted = predictedPosition.get(row.id)
        const livePosition = index + 1
        const movement = predicted ? predicted - livePosition : null
        return (
          <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 42px 30px 38px 32px', gap: '5px', alignItems: 'center', padding: '8px 4px', borderTop: '1px solid var(--border-light)', background: predicted ? 'rgba(0,48,135,0.045)' : 'transparent', fontSize: '11px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900 }}>{livePosition}</span>
            <span style={{ fontWeight: 800, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.team?.flag_emoji} {row.team?.short_code || row.team?.name}{livePosition < 3 ? <span style={{ color: 'var(--accent-green)', marginLeft: '4px' }}>Q</span> : null}</span>
            <span style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 900, color: predicted ? 'var(--scottish-navy)' : 'var(--text-muted)' }}>
              {predicted ? `${predicted}${movement > 0 ? ' ↑' : movement < 0 ? ' ↓' : ' ='}` : '—'}
            </span>
            <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{row.played}</span>
            <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{row.gd > 0 ? `+${row.gd}` : row.gd}</span>
            <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 900 }}>{row.pts}</span>
          </div>
        )
      })}
      <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.45 }}>
        “Your pick” shows the position you predicted. ↑ means the team is currently higher than your pick; ↓ means lower.
      </div>
    </div>
  )
}

export default function GroupMatchdayHub({ user, profile }) {
  const [allMatches, setAllMatches] = useState([])
  const [predictions, setPredictions] = useState([])
  const [freshProfile, setFreshProfile] = useState(profile || null)
  const [overallRank, setOverallRank] = useState(null)
  const [league, setLeague] = useState(null)
  const [leagueMembers, setLeagueMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [matchWeather, setMatchWeather] = useState({})

  useEffect(() => {
    if (!user?.id) return undefined
    let cancelled = false

    const load = async () => {
      try {
        setError('')
        const matchesRes = await supabase
          .from('matches')
          .select('id, match_number, stage, status, kickoff_time, home_score, away_score, live_minute, injury_time, group_id, venue_id, home_team_id, away_team_id, group:group_id(id,name), venue:venue_id(name,city), home_team:home_team_id(id,name,flag_emoji,short_code), away_team:away_team_id(id,name,flag_emoji,short_code)')
          .eq('stage', 'group')
          .order('kickoff_time', { ascending: true })
        if (matchesRes.error) throw matchesRes.error

        const matchData = matchesRes.data || []
        const matchIds = matchData.map(match => match.id)
        const [predictionRes, ownProfileRes, membershipRes] = await Promise.all([
          matchIds.length
            ? supabase.from('predictions').select('match_id, home_score, away_score, is_confident, points_awarded').eq('user_id', user.id).in('match_id', matchIds)
            : Promise.resolve({ data: [], error: null }),
          supabase.from('profiles').select('id, total_points, rank_at_kickoff, display_name, username').eq('id', user.id).maybeSingle(),
          supabase.from('league_members').select('league_id').eq('user_id', user.id).limit(1).maybeSingle(),
        ])
        if (predictionRes.error) throw predictionRes.error
        if (ownProfileRes.error) throw ownProfileRes.error
        if (membershipRes.error) throw membershipRes.error

        const ownProfile = ownProfileRes.data || profile || null
        let rank = null
        if (ownProfile) {
          const rankRes = await supabase.from('profiles').select('id', { count: 'exact', head: true }).gt('total_points', ownProfile.total_points || 0)
          if (!rankRes.error) rank = (rankRes.count || 0) + 1
        }

        let leagueData = null
        let membersData = []
        if (membershipRes.data?.league_id) {
          const [leagueRes, membersRes] = await Promise.all([
            supabase.from('leagues').select('id, name, invite_code').eq('id', membershipRes.data.league_id).maybeSingle(),
            supabase.from('league_members').select('user_id, league_points, profile:user_id(id,display_name,username,avatar_emoji,avatar_color,total_points)').eq('league_id', membershipRes.data.league_id),
          ])
          if (!leagueRes.error) leagueData = leagueRes.data || null
          if (!membersRes.error) membersData = membersRes.data || []
        }

        if (!cancelled) {
          setAllMatches(matchData)
          setPredictions(predictionRes.data || [])
          setFreshProfile(ownProfile)
          setOverallRank(rank)
          setLeague(leagueData)
          setLeagueMembers(membersData)
        }
      } catch (loadError) {
        console.error('Group matchday hub failed to load:', loadError)
        if (!cancelled) setError(loadError.message || 'Could not load group matchday data.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const interval = window.setInterval(load, REFRESH_MS)
    const onVisible = () => { if (!document.hidden) load() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user?.id])

  useEffect(() => {
    const relevant = chooseSlot(allMatches).matches || []
    relevant.forEach(match => {
      if (!match?.id || !match?.venue?.city || matchWeather[match.id]) return
      const params = new URLSearchParams({
        city: match.venue.city,
        stadium: match.venue.name || '',
        kickoff: match.kickoff_time,
      })
      fetch(`/.netlify/functions/weather?${params.toString()}`)
        .then(response => response.ok ? response.json() : null)
        .then(data => {
          if (data?.available) setMatchWeather(current => ({ ...current, [match.id]: data }))
        })
        .catch(() => {})
    })
  }, [allMatches, matchWeather])

  const slot = useMemo(() => chooseSlot(allMatches), [allMatches])
  const predictionMap = useMemo(() => {
    const map = {}
    predictions.forEach(prediction => { map[prediction.match_id] = prediction })
    return map
  }, [predictions])

  const predictedStandings = useMemo(() => {
    const map = {}
    predictions.forEach(prediction => {
      map[prediction.match_id] = { home: prediction.home_score, away: prediction.away_score }
    })
    return calcPredictedStandings(allMatches, map, true)
  }, [allMatches, predictions])

  const activeGroups = useMemo(() => [...new Set(slot.matches.map(match => match.group?.name).filter(Boolean))], [slot.matches])
  const groupMatchesByName = useMemo(() => {
    const map = {}
    activeGroups.forEach(groupName => {
      map[groupName] = allMatches.filter(match => match.group?.name === groupName)
    })
    return map
  }, [allMatches, activeGroups])

  const liveTables = useMemo(() => {
    const map = {}
    activeGroups.forEach(groupName => {
      map[groupName] = actualLiveStandings(groupMatchesByName[groupName] || [])
    })
    return map
  }, [activeGroups, groupMatchesByName, allMatches])

  const slotPoints = slot.matches.reduce((sum, match) => sum + predictionPoints(predictionMap[match.id], match), 0)
  const countdown = useCountdown(slot.mode === 'prematch' ? slot.matches[0]?.kickoff_time : null)

  const sortedLeagueMembers = useMemo(() => [...leagueMembers].sort((a, b) => (b.league_points || 0) - (a.league_points || 0)), [leagueMembers])
  const myLeagueIndex = sortedLeagueMembers.findIndex(member => member.user_id === user?.id)
  const rivalAbove = myLeagueIndex > 0 ? sortedLeagueMembers[myLeagueIndex - 1] : null
  const rivalBelow = myLeagueIndex >= 0 && myLeagueIndex < sortedLeagueMembers.length - 1 ? sortedLeagueMembers[myLeagueIndex + 1] : null
  const closestRival = rivalAbove || rivalBelow

  const nextSlot = useMemo(() => {
    const currentKickoffs = new Set(slot.matches.map(match => match.kickoff_time))
    const next = allMatches.find(match => effectiveStatus(match) === 'scheduled' && new Date(match.kickoff_time) > new Date() && !currentKickoffs.has(match.kickoff_time))
    if (!next) return []
    return allMatches.filter(match => effectiveStatus(match) === 'scheduled' && sameKickoff(match, next))
  }, [allMatches, slot.matches])

  if (loading) {
    return <div className="card fade-in" style={{ padding: '28px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
  }

  if (error) {
    return <div className="card fade-in" style={{ padding: '16px', color: 'var(--accent-red)', fontSize: '12px' }}>Group hub could not load: {error}</div>
  }

  if (!slot.matches.length) return null

  const groupLabel = activeGroups.length === 1 ? `Group ${activeGroups[0]}` : `${activeGroups.length} groups`
  const currentTotal = freshProfile?.total_points ?? profile?.total_points ?? 0
  const rankMove = freshProfile?.rank_at_kickoff && overallRank
    ? freshProfile.rank_at_kickoff - overallRank
    : null

  const modeCopy = slot.mode === 'live'
    ? { eyebrow: 'Group matchday · live', title: `${slot.matches.length} match${slot.matches.length === 1 ? '' : 'es'} in progress`, description: 'Scores, your live points and qualification implications update together.' }
    : slot.mode === 'fulltime'
      ? { eyebrow: 'Group matchday · full time', title: `${groupLabel} recap`, description: 'Your match points and the final group-pick impact are ready.' }
      : { eyebrow: 'Next group matchday', title: `${slot.matches.length} match${slot.matches.length === 1 ? '' : 'es'} kick off together`, description: 'Your predictions are locked in and the hub will switch to live automatically.' }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ background: 'linear-gradient(145deg, var(--scottish-navy), #163d6a)', color: 'white', borderRadius: 'var(--radius-lg)', padding: '18px 16px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', width: '160px', height: '160px', borderRadius: '50%', right: '-55px', top: '-82px', background: 'radial-gradient(circle, rgba(255,193,7,0.3), transparent 70%)' }} />
        <WorldCupLogo variant="watermark" size={148} opacity={0.11} style={{ right: '-8px', top: '48%' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.66)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em' }}>{modeCopy.eyebrow}</div>
          <div style={{ fontSize: '21px', fontWeight: 900, marginTop: '4px' }}>{modeCopy.title}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.45, marginTop: '5px', maxWidth: '520px' }}>{modeCopy.description}</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '14px' }}>
            <div style={{ background: 'rgba(255,255,255,0.09)', borderRadius: 'var(--radius-md)', padding: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.58)', textTransform: 'uppercase', fontWeight: 800 }}>{slot.mode === 'prematch' ? 'Kickoff in' : slot.mode === 'live' ? 'Live points' : 'Slot points'}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: slot.mode === 'prematch' ? '14px' : '20px', fontWeight: 900, marginTop: slot.mode === 'prematch' ? '6px' : '2px', color: slot.mode === 'prematch' ? '#ffcc80' : 'white' }}>
                {slot.mode === 'prematch'
                  ? `${String(countdown.hours || 0).padStart(2, '0')}:${String(countdown.minutes || 0).padStart(2, '0')}:${String(countdown.seconds || 0).padStart(2, '0')}`
                  : `${slotPoints > 0 ? '+' : ''}${slotPoints}`}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.09)', borderRadius: 'var(--radius-md)', padding: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.58)', textTransform: 'uppercase', fontWeight: 800 }}>Tournament total</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 900, marginTop: '2px' }}>{currentTotal}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.09)', borderRadius: 'var(--radius-md)', padding: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.58)', textTransform: 'uppercase', fontWeight: 800 }}>Overall rank</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 900, marginTop: '2px' }}>{overallRank ? `${overallRank}${overallRank === 1 ? 'st' : overallRank === 2 ? 'nd' : overallRank === 3 ? 'rd' : 'th'}` : '—'}</div>
              {rankMove ? <div style={{ fontSize: '9px', color: rankMove > 0 ? '#b9f6ca' : '#ffccbc', fontWeight: 800, marginTop: '2px' }}>{rankMove > 0 ? `▲ ${rankMove}` : `▼ ${Math.abs(rankMove)}`} since kickoff</div> : null}
            </div>
          </div>
        </div>
      </div>

      {slot.matches.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 11px', borderRadius: 'var(--radius-md)', background: 'rgba(255,193,7,0.12)', border: '1px solid rgba(255,193,7,0.28)', color: '#755500', fontSize: '10.5px', fontWeight: 800 }}>
          ⏱️ These matches share a kickoff slot, so the hub and group table update them together.
        </div>
      )}

      {slot.matches.map(match => {
        const groupName = match.group?.name
        return (
          <GroupMatchCard
            key={match.id}
            match={match}
            mode={slot.mode}
            prediction={predictionMap[match.id]}
            leagueCode={league?.invite_code}
            rivalId={closestRival?.user_id}
            weather={matchWeather[match.id]}
          />
        )
      })}

      {activeGroups.map(groupName => (
        <GroupTable
          key={groupName}
          groupName={groupName}
          rows={liveTables[groupName] || []}
          predictedTopTwo={(predictedStandings[groupName] || []).slice(0, 2)}
        />
      ))}

      {league && myLeagueIndex >= 0 && (
        <div className="card fade-in" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 900 }}>The chase</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{league.name} · {myLeagueIndex + 1} of {sortedLeagueMembers.length}</div>
            </div>
            <Link to="/leagues" style={{ color: 'var(--scottish-navy)', fontSize: '10px', fontWeight: 900 }}>League table →</Link>
          </div>
          {[rivalAbove, sortedLeagueMembers[myLeagueIndex], rivalBelow].filter(Boolean).map(member => {
            const me = member.user_id === user.id
            const name = member.profile?.display_name || member.profile?.username || 'Player'
            const gap = (sortedLeagueMembers[myLeagueIndex]?.league_points || 0) - (member.league_points || 0)
            return (
              <div key={member.user_id} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 0', borderTop: '1px solid var(--border-light)', background: me ? 'rgba(0,48,135,0.04)' : 'transparent' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: member.profile?.avatar_color || 'var(--scottish-navy)', color: 'white', fontSize: '11px', fontWeight: 900 }}>{member.profile?.avatar_emoji || name[0]?.toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 800 }}>{me ? 'You' : name}</div>
                  <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>{member.league_points || 0} pts</div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 900, color: me ? 'var(--text-muted)' : gap < 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{me ? '—' : `${gap > 0 ? '+' : ''}${gap}`}</div>
                {!me && <Link to={`/h2h/${member.user_id}`} style={{ color: 'var(--scottish-navy)', fontSize: '10px', fontWeight: 900 }}>H2H</Link>}
              </div>
            )
          })}
        </div>
      )}

      {nextSlot.length > 0 && slot.mode !== 'prematch' && (
        <div className="card fade-in" style={{ padding: '14px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 800 }}>Next group slot</div>
          <div style={{ fontSize: '13px', fontWeight: 900, marginTop: '4px' }}>{formatDate(nextSlot[0].kickoff_time)} · {formatTime(nextSlot[0].kickoff_time)} BST</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: '9px' }}>
            {nextSlot.map(match => (
              <div key={match.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span>{match.home_team?.flag_emoji}</span><b>{match.home_team?.short_code}</b><span style={{ color: 'var(--text-muted)' }}>v</span><b>{match.away_team?.short_code}</b><span>{match.away_team?.flag_emoji}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>Group {match.group?.name}</span>
              </div>
            ))}
          </div>
          <Link to="/predictions" className="btn btn-outline" style={{ display: 'flex', justifyContent: 'center', textDecoration: 'none', marginTop: '10px' }}>View all group predictions</Link>
        </div>
      )}
    </section>
  )
}
