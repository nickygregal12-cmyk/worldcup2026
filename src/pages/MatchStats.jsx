import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'
import { ALL_STAGES, calcPredictedStandings, resolveSlot } from '../lib/bracketUtils.js'
import { buildPredictedDepthByTeam, buildFixtureBracketHealth } from '../lib/bracketHealth.js'

const VENUE_FLAGS = { Mexico:'🇲🇽', 'Mexico City':'🇲🇽', Guadalajara:'🇲🇽', Monterrey:'🇲🇽', Canada:'🇨🇦', Toronto:'🇨🇦', Vancouver:'🇨🇦', USA:'🇺🇸', 'United States':'🇺🇸', 'New York':'🇺🇸', 'New Jersey':'🇺🇸', 'East Rutherford':'🇺🇸', 'New York/NJ':'🇺🇸', Boston:'🇺🇸', Dallas:'🇺🇸', Houston:'🇺🇸', Miami:'🇺🇸', Seattle:'🇺🇸', Philadelphia:'🇺🇸', Atlanta:'🇺🇸', 'Kansas City':'🇺🇸', 'Los Angeles':'🇺🇸', 'San Francisco':'🇺🇸' }
const venueFlag = (venue) => VENUE_FLAGS[venue?.country] || VENUE_FLAGS[venue?.city] || '🏟️'

const STAGE_LABELS = { r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-final', sf: 'Semi-final', '3rd': 'Third-place', final: 'Final' }

// Tournament scoring shown in the league rules:
// 3 points for the live match result currently landing, plus the saved
// knockout-bracket progression value for the round.
const BRACKET_STAGE_POINTS = { r32: 5, r16: 10, qf: 15, sf: 20, '3rd': 20, final: 20 }

export default function MatchStats() {
  const { matchId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [slotIds, setSlotIds] = useState(null)
  const [loadingSlot, setLoadingSlot] = useState(true)
  const [scopeOptions, setScopeOptions] = useState([])
  const [loadingScopes, setLoadingScopes] = useState(false)

  const selectedScope = useMemo(() => {
    const league = searchParams.get('league')
    const koLeague = searchParams.get('koLeague')
    if (koLeague) return `ko:${koLeague}`
    if (league) return `league:${league}`
    return 'overall'
  }, [searchParams])

  const leagueCode = selectedScope.startsWith('league:') ? selectedScope.slice(7) : null
  const koLeagueCode = selectedScope.startsWith('ko:') ? selectedScope.slice(3) : null



  useEffect(() => {
    let cancelled = false

    const loadScopes = async () => {
      if (!user?.id) {
        setScopeOptions([])
        return
      }

      setLoadingScopes(true)
      try {
        const [leagueMemberships, koMemberships] = await Promise.all([
          supabase.from('league_members').select('league_id').eq('user_id', user.id),
          supabase.from('ko_league_members').select('league_id').eq('user_id', user.id),
        ])

        const leagueIds = [...new Set((leagueMemberships.data || []).map(row => row.league_id).filter(Boolean))]
        const koLeagueIds = [...new Set((koMemberships.data || []).map(row => row.league_id).filter(Boolean))]

        const [leagueRows, koLeagueRows] = await Promise.all([
          leagueIds.length
            ? supabase.from('leagues').select('id, name, invite_code').in('id', leagueIds).order('name')
            : Promise.resolve({ data: [] }),
          koLeagueIds.length
            ? supabase.from('ko_leagues').select('id, name, invite_code').in('id', koLeagueIds).order('name')
            : Promise.resolve({ data: [] }),
        ])

        if (cancelled) return

        const options = [
          ...(leagueRows.data || []).filter(row => row.invite_code).map(row => ({
            value: `league:${row.invite_code}`,
            label: row.name,
            type: 'Tournament league',
          })),
          ...(koLeagueRows.data || []).filter(row => row.invite_code).map(row => ({
            value: `ko:${row.invite_code}`,
            label: row.name,
            type: 'KO Predictor league',
          })),
        ]
        setScopeOptions(options)

        const requestedIsValid = selectedScope === 'overall' || options.some(option => option.value === selectedScope)
        if (!requestedIsValid) {
          setSearchParams({}, { replace: true })
          return
        }

        if (selectedScope === 'overall' && !searchParams.get('league') && !searchParams.get('koLeague')) {
          try {
            const remembered = window.localStorage.getItem('wc26_match_centre_scope')
            if (remembered && remembered !== 'overall' && options.some(option => option.value === remembered)) {
              const next = new URLSearchParams()
              if (remembered.startsWith('league:')) next.set('league', remembered.slice(7))
              if (remembered.startsWith('ko:')) next.set('koLeague', remembered.slice(3))
              setSearchParams(next, { replace: true })
            }
          } catch (_) {}
        }
      } finally {
        if (!cancelled) setLoadingScopes(false)
      }
    }

    loadScopes()
    return () => { cancelled = true }
  }, [user?.id])

  const changeScope = (value) => {
    const next = new URLSearchParams(searchParams)
    next.delete('league')
    next.delete('koLeague')

    if (value.startsWith('league:')) next.set('league', value.slice(7))
    if (value.startsWith('ko:')) next.set('koLeague', value.slice(3))

    setSearchParams(next, { replace: true })
    try { window.localStorage.setItem('wc26_match_centre_scope', value) } catch (_) {}
  }

  useEffect(() => {
    const loadSlot = async () => {
      setLoadingSlot(true)
      // Links around the app may contain either the database UUID or the public
      // match number. Resolve both so older and newer links remain valid.
      const numericMatchNumber = /^\d+$/.test(String(matchId || '')) ? Number(matchId) : null
      let matchQuery = supabase.from('matches').select('id, kickoff_time')
      matchQuery = numericMatchNumber !== null
        ? matchQuery.eq('match_number', numericMatchNumber)
        : matchQuery.eq('id', matchId)
      const { data: m, error: matchError } = await matchQuery.maybeSingle()
      if (matchError) console.error('Match Centre lookup failed:', matchError)
      if (!m) { setSlotIds([]); setLoadingSlot(false); return }
      // every match kicking off at the same instant — shown together
      const { data: siblings } = await supabase
        .from('matches').select('id, match_number').eq('kickoff_time', m.kickoff_time).order('match_number')
      const ids = (siblings || []).map(s => s.id)
      setSlotIds([m.id, ...ids.filter(i => i !== m.id)])
      setLoadingSlot(false)
    }
    if (matchId) loadSlot()
  }, [matchId])

  if (loadingSlot) {
    return <div className="container" style={{ padding: '40px 16px', textAlign: 'center' }}>
      <div className="spinner" style={{ margin: '0 auto' }} />
    </div>
  }

  return (
    <div className="container" style={{ padding: '16px 16px 40px', maxWidth: '560px' }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: '12px', color: 'var(--scottish-navy)', fontWeight: '700', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>← Back</button>

      {slotIds && slotIds.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', marginBottom: '14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
          ⏱️ <span>{slotIds.length} games kicking off together — all shown below.</span>
        </div>
      )}


      {user && (scopeOptions.length > 0 || loadingScopes) && (
        <div className="card" style={{ padding: '12px 14px', marginBottom: '14px' }}>
          <label htmlFor="match-centre-scope" style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 800, marginBottom: '6px' }}>
            Viewing predictions from
          </label>
          <select
            id="match-centre-scope"
            className="input"
            value={selectedScope}
            onChange={event => changeScope(event.target.value)}
            disabled={loadingScopes}
            style={{ width: '100%', fontWeight: 800 }}
          >
            <option value="overall">Overall predictors</option>
            {scopeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label} · {option.type}
              </option>
            ))}
          </select>
          <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
            Change this at any time to compare the same live match across your leagues.
          </div>
        </div>
      )}

      {(slotIds || []).map((id, i) => (
        <MatchCentre key={id} matchId={id} leagueCode={leagueCode} koLeagueCode={koLeagueCode} divider={i > 0} />
      ))}

      {slotIds && slotIds.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Match not found.</p>
      )}
    </div>
  )
}

function MatchCentre({ matchId, leagueCode, koLeagueCode, divider }) {
  const { user } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [match, setMatch] = useState(null)
  const [stats, setStats] = useState(null)
  const [scopeLabel, setScopeLabel] = useState('Everyone')
  const [ranked, setRanked] = useState([])
  const [myLine, setMyLine] = useState(null)
  const [notLocked, setNotLocked] = useState(false)
  const [scopeDenied, setScopeDenied] = useState(false)
  const [scopeMessage, setScopeMessage] = useState('')
  const [koScopeLabel, setKoScopeLabel] = useState('Everyone')
  const [showKoRivals, setShowKoRivals] = useState(true)
  const [koMine, setKoMine] = useState(null)
  const [koRivals, setKoRivals] = useState([])
  const [tournamentBracketRivals, setTournamentBracketRivals] = useState([])
  const [bracketHealth, setBracketHealth] = useState(null)
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setNotLocked(false)
      setScopeDenied(false)
      setScopeMessage('')
      setScopeLabel('Everyone')
      setKoScopeLabel('Everyone')
      setShowKoRivals(true)
      setStats(null)
      setRanked([])
      setMyLine(null)
      setKoMine(null)
      setKoRivals([])
      setTournamentBracketRivals([])
      setBracketHealth(null)

      // Load the fixture independently from venue metadata. A missing or renamed
      // venue column must never make the entire Match Centre query return null.
      const { data: matchRow, error: matchError } = await supabase
        .from('matches')
        .select('id, match_number, stage, home_score, away_score, winner_team_id, status, kickoff_time, live_minute, injury_time, home_team_id, away_team_id, venue_id, home_team:home_team_id(name, flag_emoji, short_code), away_team:away_team_id(name, flag_emoji, short_code)')
        .eq('id', matchId)
        .maybeSingle()

      if (matchError) console.error('Match Centre fixture query failed:', matchError)

      let m = matchRow
      if (m?.venue_id) {
        const { data: venue, error: venueError } = await supabase
          .from('venues')
          .select('*')
          .eq('id', m.venue_id)
          .maybeSingle()
        if (venueError) console.warn('Match Centre venue query failed:', venueError)
        if (venue) m = { ...m, venue }
      }

      setMatch(m)
      setWeather(null)
      if (m?.venue?.city && m?.kickoff_time) {
        const params = new URLSearchParams({ city: m.venue.city, kickoff: m.kickoff_time, stadium: m.venue.name || m.venue.stadium_name || '' })
        fetch(`/.netlify/functions/weather?${params.toString()}`).then(r => r.ok ? r.json() : null).then(data => { if (data?.available) setWeather(data) }).catch(() => {})
      }

      const locked = m && (m.status === 'live' || m.status === 'completed' || new Date(m.kickoff_time) <= new Date())
      if (!locked) { setNotLocked(true); setLoading(false); return }

      // Scope tournament stats and KO Predictor stats separately.
      let userIdFilter = null
      if (m.stage === 'group' && leagueCode) {
        const { data: league } = await supabase.from('leagues').select('id, name').eq('invite_code', leagueCode).maybeSingle()
        if (!league) {
          setScopeDenied(true)
          setScopeMessage('League not found.')
          setLoading(false)
          return
        }
        const { data: members } = await supabase.from('league_members').select('user_id').eq('league_id', league.id)
        userIdFilter = (members || []).map(mm => mm.user_id)
        if (!user?.id || !userIdFilter.includes(user.id)) {
          setScopeDenied(true)
          setScopeMessage('You need to be a member of this league to view its predictions.')
          setLoading(false)
          return
        }
        setScopeLabel(league.name)
      }

      // ── Knockout match: KO Predictor picks + bracket impact ──
      if (m.stage !== 'group') {
        let koUserIds = null
        let tournamentLeagueUserIds = null
        let tournamentLeagueName = null
        let tournamentLeagueId = null
        let tournamentLeagueUsesSnapshot = false

        if (koLeagueCode) {
          const { data: koLeague } = await supabase.from('ko_leagues').select('id, name').eq('invite_code', koLeagueCode).maybeSingle()
          if (!koLeague) {
            setScopeDenied(true)
            setScopeMessage('KO Predictor league not found.')
            setLoading(false)
            return
          }
          const { data: koMembers } = await supabase.from('ko_league_members').select('user_id').eq('league_id', koLeague.id)
          koUserIds = (koMembers || []).map(mm => mm.user_id)
          if (!user?.id || !koUserIds.includes(user.id)) {
            setScopeDenied(true)
            setScopeMessage('You need to be a member of this KO Predictor league to view its picks.')
            setLoading(false)
            return
          }
          setKoScopeLabel(koLeague.name)
          setShowKoRivals(true)
        } else if (leagueCode) {
          const { data: league } = await supabase
            .from('leagues')
            .select('id, name, lock_type, snapshot_taken_at')
            .eq('invite_code', leagueCode)
            .maybeSingle()
          if (!league) {
            setScopeDenied(true)
            setScopeMessage('Tournament league not found.')
            setLoading(false)
            return
          }

          const { data: members } = await supabase.from('league_members').select('user_id').eq('league_id', league.id)
          tournamentLeagueUserIds = (members || []).map(mm => mm.user_id)
          if (!user?.id || !tournamentLeagueUserIds.includes(user.id)) {
            setScopeDenied(true)
            setScopeMessage('You need to be a member of this Tournament league to view its bracket picks.')
            setLoading(false)
            return
          }

          tournamentLeagueName = league.name
          tournamentLeagueId = league.id
          tournamentLeagueUsesSnapshot =
            league.lock_type === 'pre_tournament' && Boolean(league.snapshot_taken_at)

          // Tournament mini-leagues and KO Predictor are separate competitions.
          // Keep the viewer's own KO pick visible, and show the league's original
          // tournament bracket picks in their own section below.
          koUserIds = user?.id ? [user.id] : []
          setKoScopeLabel('KO Predictor')
          setShowKoRivals(false)
        }

        let koQ = supabase.from('ko_predictions')
          .select('user_id, home_score, away_score, winner_team_id, is_joker, first_goal_band, outcome_type')
          .eq('match_id', matchId)
        if (koUserIds?.length) koQ = koQ.in('user_id', koUserIds)
        const koPreds = koUserIds && koUserIds.length === 0
          ? []
          : ((await koQ).data || [])
        const koIds = [...new Set(koPreds.map(p => p.user_id))]
        const koNames = {}
        if (koIds.length) {
          const { data: kp } = await supabase.from('profiles').select('id, username, display_name, avatar_emoji').in('id', koIds)
          ;(kp || []).forEach(pr => { koNames[pr.id] = pr })
        }
        const rivals = koPreds.map(p => {
          const prof = koNames[p.user_id] || {}

          // winner_team_id is required for ET/penalties, but older 90-minute
          // predictions may only have a score. Infer the advancing side from the
          // saved score so live Match Centre never shows a blank pick.
          let side = p.winner_team_id === m.home_team_id
            ? 'home'
            : p.winner_team_id === m.away_team_id
              ? 'away'
              : null

          if (!side && p.home_score != null && p.away_score != null) {
            if (Number(p.home_score) > Number(p.away_score)) side = 'home'
            if (Number(p.away_score) > Number(p.home_score)) side = 'away'
          }

          return {
            userId: p.user_id,
            name: prof.display_name || prof.username || 'Player',
            avatar: prof.avatar_emoji,
            side,
            home: p.home_score,
            away: p.away_score,
            joker: !!p.is_joker,
            firstGoalBand: p.first_goal_band,
            outcomeType: p.outcome_type,
          }
        })
        setKoRivals(rivals)
        setKoMine(rivals.find(r => r.userId === user?.id) || null)

        if (tournamentLeagueUserIds?.length) {
          const stageConfig = ALL_STAGES.find(stage => stage.key === m.stage)
          const stageMatchDefs = stageConfig?.matches || []
          const allKnockoutMatchNumbers = ALL_STAGES.flatMap(stage => stage.matches.map(matchDef => matchDef.match_number))

          // Rebuild every member's original bracket using the same source data and
          // slot-resolution approach as the Knockout tab and View Predictions.
          // Do not trust knockout_picks.home_team_id / away_team_id here because
          // those stored helper fields can be stale after a bracket remap.
          const bracketTable = tournamentLeagueUsesSnapshot
            ? 'league_knockout_picks'
            : 'knockout_picks'
          // Group-stage predictions are locked once the tournament starts.
          // Use the live predictions table for bracket slot resolution even in
          // frozen leagues, because some league snapshot rows are incomplete.
          const predictionTable = 'predictions'

          let bracketQuery = supabase
            .from(bracketTable)
            .select(`
              user_id,
              match_number,
              home_team_id,
              away_team_id,
              winner_team_id,
              saved_home_team:home_team_id(id,name,short_code,flag_emoji),
              saved_away_team:away_team_id(id,name,short_code,flag_emoji)
            `)
            .in('match_number', allKnockoutMatchNumbers)
            .in('user_id', tournamentLeagueUserIds)

          let groupPredictionQuery = supabase
            .from(predictionTable)
            .select('user_id, match_id, home_score, away_score')
            .in('user_id', tournamentLeagueUserIds)

          if (tournamentLeagueUsesSnapshot && tournamentLeagueId) {
            bracketQuery = bracketQuery.eq('league_id', tournamentLeagueId)
          }

          const [
            { data: allBracketRows },
            { data: allGroupPredictions },
            { data: originalGroupMatches },
            { data: allTeams },
            { data: leagueProfiles },
          ] = await Promise.all([
            bracketQuery,
            groupPredictionQuery,
            supabase
              .from('matches')
              .select('id, match_number, stage, kickoff_time, home_team_id, away_team_id, home_team:home_team_id(id,name,flag_emoji,short_code), away_team:away_team_id(id,name,flag_emoji,short_code), group:group_id(name)')
              .eq('stage', 'group')
              .order('kickoff_time', { ascending: true }),
            supabase
              .from('teams')
              .select('id, name, flag_emoji, short_code'),
            supabase
              .from('profiles')
              .select('id, username, display_name, avatar_emoji')
              .in('id', tournamentLeagueUserIds),
          ])

          const teamById = {}
          ;(originalGroupMatches || []).forEach(groupMatch => {
            if (groupMatch.home_team?.id) teamById[groupMatch.home_team.id] = groupMatch.home_team
            if (groupMatch.away_team?.id) teamById[groupMatch.away_team.id] = groupMatch.away_team
          })
          ;(allTeams || []).forEach(team => {
            if (team.id) teamById[team.id] = team
          })

          const bracketRowsByUser = {}
          ;(allBracketRows || []).forEach(row => {
            if (!bracketRowsByUser[row.user_id]) bracketRowsByUser[row.user_id] = {}
            bracketRowsByUser[row.user_id][Number(row.match_number)] = row
          })

          const groupPredictionsByUser = {}
          ;(allGroupPredictions || []).forEach(row => {
            if (!groupPredictionsByUser[row.user_id]) groupPredictionsByUser[row.user_id] = {}
            groupPredictionsByUser[row.user_id][row.match_id] = {
              home: row.home_score,
              away: row.away_score,
            }
          })

          const profileByUser = {}
          ;(leagueProfiles || []).forEach(profile => { profileByUser[profile.id] = profile })

          setTournamentBracketRivals(
            tournamentLeagueUserIds.map(memberId => {
              const profile = profileByUser[memberId] || {}
              const predictionMap = groupPredictionsByUser[memberId] || {}
              const pickMap = bracketRowsByUser[memberId] || {}
              const standings = calcPredictedStandings(originalGroupMatches || [], predictionMap, true)

              const getTeam = teamId => teamId ? (teamById[teamId] || {
                id: teamId,
                name: 'Unknown team',
                short_code: 'TBC',
                flag_emoji: '🏳️',
              }) : null

              const resolveOriginalSlot = slot => {
                if (!slot) return null
                if (slot.startsWith('W')) {
                  const previousMatchNumber = Number(slot.slice(1))
                  return getTeam(pickMap[previousMatchNumber]?.winner_team_id)
                }
                if (slot.startsWith('L')) return null
                return resolveSlot(slot, standings, originalGroupMatches || [], predictionMap)
              }

              const currentMatchDef = stageMatchDefs.find(
                matchDef => Number(matchDef.match_number) === Number(m.match_number)
              )

              const exactPick = pickMap[Number(m.match_number)] || null
              const pureHome = currentMatchDef ? resolveOriginalSlot(currentMatchDef.home_slot) : null
              const pureAway = currentMatchDef ? resolveOriginalSlot(currentMatchDef.away_slot) : null
              const exactWinner = getTeam(exactPick?.winner_team_id)

              // This is intentionally the same resolvedFor logic used by
              // MemberPredictionsModal. When a historic bracket remap means the
              // selected winner is no longer one of the freshly resolved slots,
              // preserve that winner on the side it originally occupied.
              let originalHome = pureHome
              let originalAway = pureAway

              if (
                exactPick?.winner_team_id &&
                exactPick.winner_team_id !== pureHome?.id &&
                exactPick.winner_team_id !== pureAway?.id
              ) {
                if (
                  exactPick.away_team_id === exactPick.winner_team_id &&
                  exactPick.home_team_id !== exactPick.winner_team_id
                ) {
                  originalAway = exactWinner
                } else {
                  originalHome = exactWinner
                }
              }

              // Only fall back to the saved pair when neither side can be rebuilt.
              // Never mix one rebuilt team with one stale saved team, which caused
              // hybrid fixtures such as Canada v Qatar.
              if (!originalHome && !originalAway) {
                originalHome = exactPick?.saved_home_team || getTeam(exactPick?.home_team_id)
                originalAway = exactPick?.saved_away_team || getTeam(exactPick?.away_team_id)
              }

              const exactSide = exactPick?.winner_team_id === m.home_team_id
                ? 'home'
                : exactPick?.winner_team_id === m.away_team_id
                  ? 'away'
                  : null

              const backedHomeElsewhere = stageMatchDefs.some(matchDef =>
                Number(matchDef.match_number) !== Number(m.match_number) &&
                pickMap[Number(matchDef.match_number)]?.winner_team_id === m.home_team_id
              )

              const backedAwayElsewhere = stageMatchDefs.some(matchDef =>
                Number(matchDef.match_number) !== Number(m.match_number) &&
                pickMap[Number(matchDef.match_number)]?.winner_team_id === m.away_team_id
              )

              const currentFixtureBackings = [
                exactSide === 'home' ? { team: m.home_team, route: 'exact' } : null,
                exactSide === 'away' ? { team: m.away_team, route: 'exact' } : null,
                backedHomeElsewhere ? { team: m.home_team, route: 'different' } : null,
                backedAwayElsewhere ? { team: m.away_team, route: 'different' } : null,
              ].filter(Boolean)

              return {
                userId: memberId,
                name: profile.display_name || profile.username || 'Player',
                avatar: profile.avatar_emoji,
                exactPick: exactPick ? {
                  ...exactPick,
                  home_team: originalHome,
                  away_team: originalAway,
                } : null,
                exactWinner,
                exactSide,
                hasPick: Boolean(exactPick?.winner_team_id),
                currentFixtureBackings,
              }
            })
          )

          setScopeLabel(tournamentLeagueName || 'Tournament league')
        }

        if (user?.id) {
          const [{ data: groupMatches }, { data: groupPreds }, { data: kpicks }] = await Promise.all([
            supabase.from('matches')
              .select('id, match_number, stage, kickoff_time, status, home_team_id, away_team_id, home_team:home_team_id(id,name,flag_emoji,short_code), away_team:away_team_id(id,name,flag_emoji,short_code), group:group_id(name)')
              .eq('stage', 'group')
              .order('kickoff_time', { ascending: true }),
            supabase.from('predictions').select('match_id, home_score, away_score').eq('user_id', user.id),
            supabase.from('knockout_picks').select('match_number, winner_team_id, home_team_id, away_team_id').eq('user_id', user.id),
          ])

          const predictionMap = {}
          ;(groupPreds || []).forEach(p => { predictionMap[p.match_id] = { home: p.home_score, away: p.away_score } })
          const standings = calcPredictedStandings(groupMatches || [], predictionMap, true)
          const pickMap = {}
          ;(kpicks || []).forEach(p => {
            pickMap[p.match_number] = { winner_id: p.winner_team_id, home_id: p.home_team_id, away_id: p.away_team_id }
          })
          const teamById = {}
          ;(groupMatches || []).forEach(gm => {
            if (gm.home_team?.id) teamById[gm.home_team.id] = gm.home_team
            if (gm.away_team?.id) teamById[gm.away_team.id] = gm.away_team
          })
          const getTeamById = id => id ? (teamById[id] || { id, name: 'Unknown team', flag_emoji: '🏳️', short_code: 'TBC' }) : null
          const resolveWinner = slot => {
            const num = Number(String(slot || '').replace('W', ''))
            return getTeamById(pickMap[num]?.winner_id)
          }
          const getMatchTeams = matchDef => {
            const resolve = slot => slot?.startsWith('W')
              ? resolveWinner(slot)
              : slot?.startsWith('L')
                ? null
                : resolveSlot(slot, standings, groupMatches || [], predictionMap)
            const pureHome = resolve(matchDef.home_slot)
            const pureAway = resolve(matchDef.away_slot)
            const saved = pickMap[matchDef.match_number]
            if (!saved?.winner_id || saved.winner_id === pureHome?.id || saved.winner_id === pureAway?.id) return { home: pureHome, away: pureAway }
            const winner = getTeamById(saved.winner_id)
            return saved.away_id === saved.winner_id && saved.home_id !== saved.winner_id
              ? { home: pureHome, away: winner }
              : { home: winner, away: pureAway }
          }
          const stageConfig = ALL_STAGES.find(stage => stage.key === m.stage)
          const predictedDepthByTeam = buildPredictedDepthByTeam({ allStages: ALL_STAGES, knockoutPicks: pickMap, getMatchTeams })
          const health = buildFixtureBracketHealth({
            fixture: m, stageKey: m.stage, stageConfig, knockoutPicks: pickMap,
            predictedDepthByTeam, getTeamById, getMatchTeams,
          })
          setBracketHealth(health)
        }
        setLoading(false)
        return
      }

      // ── Group match: scoreline predictions ──
      let q = supabase.from('predictions')
        .select('user_id, home_score, away_score, is_confident, points_awarded')
        .eq('match_id', matchId).not('home_score', 'is', null)
      if (userIdFilter) q = q.in('user_id', userIdFilter)
      const { data: preds } = await q

      const { data: reactions } = await supabase.from('match_reactions').select('reaction').eq('match_id', matchId)

      const ids = [...new Set((preds || []).map(p => p.user_id))]
      const nameMap = {}
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('id, username, display_name, avatar_emoji').in('id', ids)
        ;(profs || []).forEach(pr => { nameMap[pr.id] = pr })
      }
      const rankedList = (preds || []).map(p => {
        const lp = livePts(p, m)
        const prof = nameMap[p.user_id] || {}
        const finalPts = (m?.status === 'completed' && p.points_awarded != null) ? p.points_awarded : lp.pts
        return { userId: p.user_id, name: prof.display_name || prof.username || 'Player', avatar: prof.avatar_emoji, home: p.home_score, away: p.away_score, joker: !!p.is_confident, status: lp.status, exact: lp.exact, pts: finalPts }
      }).sort((a, b) => b.pts - a.pts || (b.exact ? 1 : 0) - (a.exact ? 1 : 0) || a.name.localeCompare(b.name))
      setRanked(rankedList)
      setMyLine(rankedList.find(r => r.userId === user?.id) || null)
      setStats(computeStats(preds || [], reactions || [], m))
      setLoading(false)
    }
    if (matchId) load()
  }, [matchId, leagueCode, koLeagueCode, user?.id])

  const wrap = (children) => (
    <div style={{ marginTop: divider ? '6px' : 0, paddingTop: divider ? '18px' : 0, borderTop: divider ? '2px solid var(--border-light)' : 'none' }}>{children}</div>
  )

  if (loading) return wrap(<div style={{ textAlign: 'center', padding: '24px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>)
  if (scopeDenied) return wrap(<p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>{scopeMessage || 'You do not have access to this view.'}</p>)
  if (!match) return wrap(<p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>Match not found.</p>)
  if (notLocked) return wrap(
    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
      <div style={{ fontSize: '30px', marginBottom: '6px' }}>🔒</div>
      <p>{match.home_team?.short_code} v {match.away_team?.short_code} — predictions appear once it kicks off.</p>
    </div>
  )

  const hasResult = match.home_score != null && match.away_score != null
  const live = match.status === 'live'
  const completed = match.status === 'completed'
  const scoreLead = hasResult ? (match.home_score > match.away_score ? 'home' : match.away_score > match.home_score ? 'away' : 'draw') : null
  const winnerSide = completed && match.winner_team_id
    ? match.winner_team_id === match.home_team_id
      ? 'home'
      : match.winner_team_id === match.away_team_id
        ? 'away'
        : null
    : null
  const lead = winnerSide || scoreLead

  // ── Knockout centre ──
  if (match.stage !== 'group') {
    const totalBackers = koRivals.length
    const homeBackers = koRivals.filter(r => r.side === 'home').length
    const awayBackers = koRivals.filter(r => r.side === 'away').length
    const myWinner = koMine ? (koMine.side === 'home' ? match.home_team : koMine.side === 'away' ? match.away_team : null) : null
    const myOnTrack = koMine && lead && lead === koMine.side
    return wrap(<>
      <KOHeader match={match} hasResult={hasResult} live={live} weather={weather} />

      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '8px 12px', marginBottom: '12px', background: 'rgba(230,81,0,0.08)', border: '1px solid rgba(230,81,0,0.2)', borderRadius: 'var(--radius-md)', fontSize: '11.5px', fontWeight: 700, color: '#e65100' }}>
        🔥 <span>{leagueCode && !koLeagueCode
          ? 'KO Predictor is separate from this Tournament mini-league. Open the KO Predictor leaderboard to compare other players.'
          : 'KO Predictor is a separate competition — it does not affect your Tournament score.'}</span>
      </div>

      <div className="card fade-up" style={{ marginBottom: '14px', border: `2px solid ${myOnTrack ? 'var(--accent-green)' : 'var(--border-light)'}` }}>
        <div style={{ fontSize: 'var(--t-tiny)', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Your KO Predictor pick</div>
        {koMine ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>{myWinner?.flag_emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>
                {myWinner?.name || (koMine.side ? 'Selected team' : 'Winner not recorded')} to advance {koMine.joker && '🃏'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Your score: {koMine.home}–{koMine.away}{koMine.firstGoalBand ? ` · First goal ${koMine.firstGoalBand}` : ''}</div>
            </div>
            {hasResult && <span style={{ fontSize: '11px', fontWeight: 800, color: myOnTrack ? 'var(--accent-green)' : 'var(--text-muted)' }}>{live && lead === 'draw' ? 'Level' : myOnTrack ? (live ? 'On track' : '✓ Through') : (live ? 'Trailing' : '✗ Missed')}</span>}
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>You haven't predicted this one. <Link to="/ko-predictor" style={{ color: '#e65100', fontWeight: 700 }}>Make your KO pick →</Link></div>
        )}
      </div>

      {bracketHealth && (
        <StatCard title="Bracket health">
          <div>
            <div style={{ padding: '11px 12px', borderRadius: 'var(--radius-md)', marginBottom: '12px', background: bracketHealth.tone === 'out' ? 'rgba(198,40,40,0.07)' : bracketHealth.tone === 'need' || bracketHealth.tone === 'safe' ? 'var(--accent-green-light)' : 'rgba(184,134,11,0.09)', border: `1px solid ${bracketHealth.tone === 'out' ? 'rgba(198,40,40,0.2)' : bracketHealth.tone === 'need' || bracketHealth.tone === 'safe' ? 'rgba(0,122,51,0.2)' : 'rgba(184,134,11,0.22)'}` }}>
              <div style={{ fontSize: '13px', fontWeight: 900, color: bracketHealth.tone === 'out' ? '#c62828' : bracketHealth.tone === 'need' || bracketHealth.tone === 'safe' ? 'var(--accent-green)' : 'var(--accent-gold)', marginBottom: '4px' }}>{bracketHealth.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{bracketHealth.detail}</div>
            </div>

            <div style={{ padding: '11px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Your original pick</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 800, flexWrap: 'wrap' }}>
                <span>{bracketHealth.originalHome?.flag_emoji || '🏳️'} {bracketHealth.originalHome?.name || 'Unknown'}</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>vs</span>
                <span>{bracketHealth.originalAway?.flag_emoji || '🏳️'} {bracketHealth.originalAway?.name || 'Unknown'}</span>
              </div>
              <div style={{ marginTop: '7px', fontSize: '12px', fontWeight: 800, color: 'var(--scottish-navy)' }}>
                {bracketHealth.savedWinner?.flag_emoji || '🏳️'} {bracketHealth.savedWinner?.name || 'No winner saved'}{bracketHealth.savedWinner ? ' to advance' : ''}
              </div>
            </div>
          </div>
        </StatCard>
      )}

      {showKoRivals && totalBackers > 0 && (
        <StatCard title={`${koScopeLabel} · who's backing who`}>
          <div>
            <div style={{ display: 'flex', height: '30px', borderRadius: '8px', overflow: 'hidden', fontWeight: 800, fontSize: '12px', color: '#fff', marginBottom: '12px' }}>
              <div style={{ width: `${homeBackers / totalBackers * 100}%`, background: 'var(--scottish-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: homeBackers ? '46px' : 0 }}>{match.home_team?.short_code} {homeBackers}</div>
              <div style={{ width: `${awayBackers / totalBackers * 100}%`, background: '#7a4fd0', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: awayBackers ? '46px' : 0 }}>{match.away_team?.short_code} {awayBackers}</div>
            </div>
            {koRivals.slice(0, 30).map((r, i) => {
              const me = r.userId === user?.id
              const winTeam = r.side === 'home' ? match.home_team : r.side === 'away' ? match.away_team : null
              return (
                <div key={r.userId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: me ? '8px' : '8px 0', borderRadius: me ? 'var(--radius-sm)' : 0, background: me ? 'var(--bg-secondary)' : 'transparent', borderBottom: i < Math.min(koRivals.length, 30) - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--scottish-navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '10px', flexShrink: 0 }}>{r.avatar || (r.name[0] || '?').toUpperCase()}</span>
                  <span style={{ flex: 1, fontWeight: 700, fontSize: '13px' }}>{me ? 'You' : r.name}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, textAlign: 'right' }}>
                    <span>{winTeam?.flag_emoji || '🏳️'} {winTeam?.short_code || 'Pick'}</span>
                    {r.home != null && r.away != null && (
                      <span style={{ color: 'var(--text-muted)', marginLeft: '6px', fontFamily: 'var(--font-mono)' }}>{r.home}–{r.away}</span>
                    )}
                    {r.joker ? ' 🃏' : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </StatCard>
      )}

      {showKoRivals && totalBackers === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '8px 0' }}>No KO Predictor picks in yet for this match.</p>
      )}

      {leagueCode && tournamentBracketRivals.length > 0 && (() => {
        const currentLeadSide = hasResult
          ? match.home_score > match.away_score
            ? 'home'
            : match.away_score > match.home_score
              ? 'away'
              : null
          : null

        const roundPoints = BRACKET_STAGE_POINTS[match.stage] || 0
        const projectedRows = tournamentBracketRivals
          .map(r => {
            const hasCurrentTeamBacking = r.currentFixtureBackings.length > 0
            const backingCurrentLeader = currentLeadSide &&
              r.currentFixtureBackings.some(backing =>
                backing.team?.id === (currentLeadSide === 'home' ? match.home_team_id : match.away_team_id)
              )

            const projectedPoints = backingCurrentLeader
              ? 3 + roundPoints
              : 0

            return {
              ...r,
              hasCurrentTeamBacking,
              backingCurrentLeader: Boolean(backingCurrentLeader),
              projectedPoints,
            }
          })
          .sort((a, b) =>
            b.projectedPoints - a.projectedPoints ||
            Number(b.hasCurrentTeamBacking) - Number(a.hasCurrentTeamBacking) ||
            a.name.localeCompare(b.name)
          )

        return (
        <StatCard title={`${scopeLabel} · original tournament bracket picks`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {projectedRows.map(r => {
              const me = r.userId === user?.id
              const originalHome = r.exactPick?.home_team
              const originalAway = r.exactPick?.away_team
              const originalWinner = r.exactWinner

              let routeSummary = 'Neither real team was backed to advance from this round.'
              if (r.currentFixtureBackings.length === 1) {
                const backing = r.currentFixtureBackings[0]
                routeSummary = backing.route === 'exact'
                  ? `${backing.team?.name || 'This team'} was their saved winner for this exact fixture.`
                  : `${backing.team?.name || 'This team'} was backed to advance from a different route.`
              } else if (r.currentFixtureBackings.length > 1) {
                const exactBacking = r.currentFixtureBackings.find(backing => backing.route === 'exact')
                const differentBacking = r.currentFixtureBackings.find(backing => backing.route === 'different')
                if (exactBacking && differentBacking) {
                  routeSummary = `${exactBacking.team?.name || 'One team'} was the exact saved winner, while ${differentBacking.team?.name || 'the other team'} was also backed from a different route.`
                } else {
                  routeSummary = 'Both real teams were backed to advance somewhere in this round.'
                }
              }

              return (
                <div
                  key={r.userId}
                  style={{
                    padding: '12px',
                    background: me ? 'var(--scottish-navy-light)' : 'var(--bg-secondary)',
                    border: me ? '1px solid rgba(0,48,135,0.28)' : '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '10px' }}>
                    <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--scottish-navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px', flexShrink: 0 }}>
                      {r.avatar || (r.name[0] || '?').toUpperCase()}
                    </span>
                    <span style={{ flex: 1, fontWeight: 800, fontSize: '13px' }}>{me ? 'You' : r.name}</span>
                    <span style={{
                      minWidth: '48px',
                      textAlign: 'right',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 900,
                      fontSize: '14px',
                      color: r.projectedPoints > 0 ? 'var(--accent-green)' : 'var(--text-muted)',
                    }}>
                      {r.projectedPoints > 0 ? `+${r.projectedPoints} pts` : '—'}
                    </span>
                  </div>

                  {r.hasPick ? (
                    <>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                        Original M{match.match_number}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', fontSize: '12px', fontWeight: 800 }}>
                        <span>{originalHome?.flag_emoji || '🏳️'} {originalHome?.short_code || originalHome?.name || 'TBC'}</span>
                        <span style={{ color: 'var(--text-muted)' }}>vs</span>
                        <span>{originalAway?.flag_emoji || '🏳️'} {originalAway?.short_code || originalAway?.name || 'TBC'}</span>
                      </div>
                      <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: 900, color: 'var(--scottish-navy)' }}>
                        {originalWinner?.flag_emoji || '🏳️'} {originalWinner?.name || originalWinner?.short_code || 'No winner saved'}{originalWinner ? ' to advance' : ''}
                      </div>
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-light)', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        {routeSummary}
                      </div>

                      {r.hasCurrentTeamBacking && (
                        <div style={{
                          marginTop: '8px',
                          padding: '7px 9px',
                          borderRadius: 'var(--radius-sm)',
                          background: r.projectedPoints > 0 ? 'var(--accent-green-light)' : 'var(--bg-card)',
                          border: `1px solid ${r.projectedPoints > 0 ? 'rgba(0,122,51,0.2)' : 'var(--border-light)'}`,
                          fontSize: '10.5px',
                          fontWeight: 800,
                          color: r.projectedPoints > 0 ? 'var(--accent-green)' : 'var(--text-muted)',
                        }}>
                          {r.projectedPoints > 0
                            ? `Live projection: +${r.projectedPoints} pts`
                            : `Potential: +${3 + roundPoints} pts if ${r.currentFixtureBackings[0]?.team?.name || 'their backed team'} advance`}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No original bracket pick saved for M{match.match_number}.</div>
                  )}
                </div>
              )
            })}
          </div>
        </StatCard>
        )
      })()}
    </>)
  }

  // ── Group centre ──
  if (!stats || stats.total === 0) {
    return wrap(<>
      <GroupHeader match={match} hasResult={hasResult} live={live} statsTotal={0} scopeLabel={scopeLabel} weather={weather} />
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px' }}>No predictions in yet for this match.</p>
    </>)
  }

  const actualResult = lead

  return wrap(<>
    <GroupHeader match={match} hasResult={hasResult} live={live} statsTotal={stats.total} scopeLabel={scopeLabel} weather={weather} />

    {myLine && (() => {
      const statusLabel = {
        exact: live ? 'On track · exact 🎯' : 'Exact score 🎯',
        result: live ? 'Result on track' : 'Correct result',
        miss: live ? 'Not landing yet' : 'Missed',
        pending: 'Locked in',
      }[myLine.status]
      const good = myLine.pts > 0
      return (
        <div className="card fade-up" style={{ marginBottom: '14px', border: `2px solid ${good ? 'var(--accent-green)' : 'var(--border-light)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: 'var(--t-tiny)', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Your prediction</span>
            {myLine.joker && <span style={{ fontSize: '12px' }}>🃏</span>}
            <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 800, color: good ? 'var(--accent-green)' : 'var(--text-muted)' }}>{statusLabel}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '16px', fontWeight: 800 }}>You picked <span className="stat-num">{myLine.home}–{myLine.away}</span></div>
            <div className="stat-num" style={{ fontSize: '26px', fontWeight: 800, color: good ? 'var(--accent-green)' : 'var(--text-muted)' }}>
              {good ? '+' : ''}{myLine.pts}<span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>{live ? ' live' : ' pts'}</span>
            </div>
          </div>
          {live && <div style={{ fontSize: 'var(--t-tiny)', color: 'var(--text-muted)', marginTop: '5px' }}>Updates as the score changes{myLine.joker ? ' · joker doubles it' : ''}.</div>}
        </div>
      )
    })()}

    {ranked.length > 0 && (
      <StatCard title={`${scopeLabel} · this match`}>
        <div>
          {ranked.slice(0, 30).map((r, i) => {
            const me = r.userId === user?.id
            const last = i === Math.min(ranked.length, 30) - 1
            return (
              <div key={r.userId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: me ? '9px 8px' : '9px 0', borderBottom: last ? 'none' : '1px solid var(--border-light)', background: me ? 'var(--bg-secondary)' : 'transparent', borderRadius: me ? 'var(--radius-sm)' : 0 }}>
                <span className="stat-num" style={{ width: '20px', fontWeight: 800, color: 'var(--text-muted)', fontSize: '13px' }}>{i + 1}</span>
                <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--scottish-navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px', flexShrink: 0 }}>{r.avatar || (r.name[0] || '?').toUpperCase()}</span>
                <span style={{ flex: 1, fontWeight: 700, fontSize: '13px' }}>{me ? 'You' : r.name}</span>
                <span className="stat-num" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.home}–{r.away}{r.joker ? ' 🃏' : ''}</span>
                <span className="stat-num" style={{ width: '42px', textAlign: 'right', fontWeight: 800, fontSize: '13px', color: r.pts > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>{r.pts > 0 ? '+' : ''}{r.pts}</span>
              </div>
            )
          })}
          {ranked.length > 30 && <div style={{ textAlign: 'center', fontSize: 'var(--t-tiny)', color: 'var(--text-muted)', paddingTop: '8px' }}>+ {ranked.length - 30} more</div>}
        </div>
      </StatCard>
    )}

    <StatCard title="How people predicted">
      <div style={{ display: 'flex', gap: '3px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: '8px', marginBottom: '9px' }}>
        <div style={{ width: `${stats.homePct}%`, background: 'var(--scottish-navy)' }} />
        <div style={{ width: `${stats.drawPct}%`, background: 'var(--text-muted)', opacity: 0.4 }} />
        <div style={{ width: `${stats.awayPct}%`, background: '#c62828' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--t-small)', fontWeight: '700' }}>
        <span style={{ color: actualResult === 'home' ? 'var(--scottish-navy)' : 'var(--text-secondary)' }}>
          {match.home_team?.short_code} <span className="stat-num">{stats.homePct}%</span>{actualResult === 'home' ? ' ✓' : ''}
        </span>
        <span style={{ color: actualResult === 'draw' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          Draw <span className="stat-num">{stats.drawPct}%</span>{actualResult === 'draw' ? ' ✓' : ''}
        </span>
        <span style={{ color: actualResult === 'away' ? '#c62828' : 'var(--text-secondary)' }}>
          {match.away_team?.short_code} <span className="stat-num">{stats.awayPct}%</span>{actualResult === 'away' ? ' ✓' : ''}
        </span>
      </div>
    </StatCard>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
      <MiniStat label="Most popular score" value={stats.topScore} sub={`${stats.topScorePct}% picked it`} />
      <MiniStat label="Jokers used 🃏" value={stats.jokers} sub={`${stats.jokerPct}% of players`} />
      <MiniStat label="Avg predicted goals" value={stats.avgGoals} sub={hasResult ? `actual: ${match.home_score + match.away_score}` : 'total'} />
      <MiniStat label="Boldest scoreline" value={stats.boldest} sub={`${stats.boldestGoals} goals`} />
    </div>

    {hasResult && (
      <StatCard title={live ? 'Currently spot on 🎯' : 'Got it spot on 🎯'}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span className="stat-num" style={{ fontSize: '32px', fontWeight: '700', color: 'var(--accent-green)' }}>{stats.exactPct}%</span>
          <span style={{ fontSize: 'var(--t-small)', color: 'var(--text-muted)' }}>
            {live ? 'currently match' : 'predicted'} {match.home_score}–{match.away_score} exactly ({stats.exactCount} {stats.exactCount === 1 ? 'person' : 'people'})
          </span>
        </div>
      </StatCard>
    )}

    {hasResult && stats.actualResultPct != null && (
      <StatCard title={live ? 'Live upset meter' : 'Upset meter'}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ height: '8px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
              <div style={{ width: `${100 - stats.actualResultPct}%`, height: '100%', background: stats.actualResultPct <= 20 ? '#e65100' : stats.actualResultPct <= 45 ? 'var(--accent-gold)' : 'var(--accent-green)', transition: 'width 0.5s' }} />
            </div>
          </div>
          <span style={{ fontSize: 'var(--t-small)', fontWeight: '800', color: stats.actualResultPct <= 20 ? '#e65100' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            {stats.actualResultPct <= 5 ? '🚨 Massive upset' : stats.actualResultPct <= 20 ? '😲 Upset' : stats.actualResultPct <= 45 ? 'Mild surprise' : '✓ As expected'}
          </span>
        </div>
        <div style={{ fontSize: 'var(--t-tiny)', color: 'var(--text-muted)', marginTop: '6px' }}>
          Only <span className="stat-num" style={{ fontWeight: '700' }}>{stats.actualResultPct}%</span> {live ? 'currently back this result' : 'predicted this result'}
        </div>
      </StatCard>
    )}

    {(stats.reactions.fire + stats.reactions.laugh + stats.reactions.skull) > 0 && (
      <StatCard title="Reactions">
        <div style={{ display: 'flex', gap: '16px' }}>
          <span style={{ fontSize: 'var(--t-body)' }}>🔥 <span className="stat-num" style={{ fontWeight: '700' }}>{stats.reactions.fire}</span></span>
          <span style={{ fontSize: 'var(--t-body)' }}>😂 <span className="stat-num" style={{ fontWeight: '700' }}>{stats.reactions.laugh}</span></span>
          <span style={{ fontSize: 'var(--t-body)' }}>💀 <span className="stat-num" style={{ fontWeight: '700' }}>{stats.reactions.skull}</span></span>
        </div>
      </StatCard>
    )}
  </>)
}

function MatchVenue({ match, weather }) {
  const venue = match.venue
  if (!venue) return null
  const name = venue.name || venue.stadium_name || 'Stadium'
  const weatherText = weather?.available ? ` · ${weather.icon || '🌤️'} ${Math.round(Number(weather.temp_c))}°C${weather.condition ? ` · ${weather.condition}` : ''}` : ''
  return <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'10px', fontWeight:600 }}>{venueFlag(venue)} {name}{venue.city ? ` · ${venue.city}` : ''}{weatherText}</div>
}

function GroupHeader({ match, hasResult, live, statsTotal, scopeLabel, weather }) {
  return (
    <div className="card fade-up" style={{ marginBottom: '14px', textAlign: 'center' }}>
      <div style={{ fontSize: 'var(--t-tiny)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '12px' }}>
        M{match.match_number} · {live
          ? `🔴 Live ${match.live_minute != null ? `${match.live_minute}${match.injury_time ? `+${match.injury_time}` : ''}'` : ''}`.trim()
          : match.status === 'completed'
            ? 'Full time'
            : 'Predictions'}
      </div>
      <ScoreRow match={match} hasResult={hasResult} />
      <MatchVenue match={match} weather={weather} />
      <div style={{ fontSize: 'var(--t-tiny)', color: 'var(--text-muted)', marginTop: '12px' }}>
        📊 {statsTotal} predictions · {scopeLabel}
      </div>
    </div>
  )
}

function KOHeader({ match, hasResult, live, weather }) {
  return (
    <div className="card fade-up" style={{ marginBottom: '12px', textAlign: 'center' }}>
      <div style={{ fontSize: 'var(--t-tiny)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '12px' }}>
        {STAGE_LABELS[match.stage] || 'Knockout'} · M{match.match_number} · {live
          ? `🔴 Live ${match.live_minute != null ? `${match.live_minute}${match.injury_time ? `+${match.injury_time}` : ''}'` : ''}`.trim()
          : match.status === 'completed'
            ? 'Full time'
            : 'KO Predictor'}
      </div>
      <ScoreRow match={match} hasResult={hasResult} />
      <MatchVenue match={match} weather={weather} />
    </div>
  )
}

function ScoreRow({ match, hasResult }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
      <div style={{ textAlign: 'center', width: '88px' }}>
        <div style={{ fontSize: '34px', lineHeight: 1 }}>{match.home_team?.flag_emoji}</div>
        <div style={{ fontWeight: '800', fontSize: 'var(--t-small)', marginTop: '4px' }}>{match.home_team?.short_code}</div>
      </div>
      <div style={{ minWidth: '92px', textAlign: 'center' }}>
        <div className="stat-num" style={{ fontSize: '32px', fontWeight: '500' }}>
          {hasResult ? `${match.home_score} – ${match.away_score}` : 'vs'}
        </div>
      </div>
      <div style={{ textAlign: 'center', width: '88px' }}>
        <div style={{ fontSize: '34px', lineHeight: 1 }}>{match.away_team?.flag_emoji}</div>
        <div style={{ fontWeight: '800', fontSize: 'var(--t-small)', marginTop: '4px' }}>{match.away_team?.short_code}</div>
      </div>
    </div>
  )
}

function StatCard({ title, children }) {
  return (
    <div className="card fade-up" style={{ marginBottom: '14px' }}>
      <div style={{ fontSize: 'var(--t-tiny)', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>{title}</div>
      {children}
    </div>
  )
}

function MiniStat({ label, value, sub }) {
  return (
    <div className="card fade-up" style={{ padding: '14px' }}>
      <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</div>
      <div className="stat-num" style={{ fontSize: 'var(--t-h2)', fontWeight: '700', color: 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: 'var(--t-tiny)', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>}
    </div>
  )
}

function livePts(pred, match) {
  const hasScore = match?.home_score != null && match?.away_score != null
  if (!hasScore) return { pts: 0, status: 'pending', exact: false }
  const exact = pred.home_score === match.home_score && pred.away_score === match.away_score
  const sgn = n => (n > 0 ? 1 : n < 0 ? -1 : 0)
  const hit = sgn(pred.home_score - pred.away_score) === sgn(match.home_score - match.away_score)
  let base = exact ? 5 : hit ? 3 : 0
  if (pred.is_confident) base *= 2
  return { pts: base, status: exact ? 'exact' : hit ? 'result' : 'miss', exact }
}

function computeStats(preds, reactions, match) {
  const total = preds.length
  if (total === 0) return { total: 0 }

  let home = 0, draw = 0, away = 0, jokers = 0, goalSum = 0
  const scoreCounts = {}
  let boldest = '0–0', boldestGoals = -1

  preds.forEach(p => {
    if (p.home_score > p.away_score) home++
    else if (p.home_score === p.away_score) draw++
    else away++
    if (p.is_confident) jokers++
    const g = p.home_score + p.away_score
    goalSum += g
    if (g > boldestGoals) { boldestGoals = g; boldest = `${p.home_score}–${p.away_score}` }
    const key = `${p.home_score}–${p.away_score}`
    scoreCounts[key] = (scoreCounts[key] || 0) + 1
  })

  let topScore = '–', topCount = 0
  Object.entries(scoreCounts).forEach(([k, c]) => { if (c > topCount) { topCount = c; topScore = k } })

  let exactCount = 0, actualResultCount = 0
  const hasResult = match?.home_score != null && match?.away_score != null
  if (hasResult) {
    const ar = match.home_score > match.away_score ? 'home' : match.home_score === match.away_score ? 'draw' : 'away'
    preds.forEach(p => {
      if (p.home_score === match.home_score && p.away_score === match.away_score) exactCount++
      const pr = p.home_score > p.away_score ? 'home' : p.home_score === p.away_score ? 'draw' : 'away'
      if (pr === ar) actualResultCount++
    })
  }

  const r = { fire: 0, laugh: 0, skull: 0 }
  reactions.forEach(x => {
    if (x.reaction === 'fire') r.fire++
    else if (x.reaction === 'laugh') r.laugh++
    else if (x.reaction === 'skull') r.skull++
  })

  const homePct = Math.round((home / total) * 100)
  const drawPct = Math.round((draw / total) * 100)
  const awayPct = Math.round((away / total) * 100)

  return {
    total, homePct, drawPct, awayPct,
    topScore, topScorePct: Math.round((topCount / total) * 100),
    jokers, jokerPct: Math.round((jokers / total) * 100),
    avgGoals: (goalSum / total).toFixed(1),
    boldest, boldestGoals,
    exactCount,
    exactPct: hasResult ? Math.round((exactCount / total) * 100) : null,
    actualResultPct: hasResult ? Math.round((actualResultCount / total) * 100) : null,
    reactions: r,
  }
}
