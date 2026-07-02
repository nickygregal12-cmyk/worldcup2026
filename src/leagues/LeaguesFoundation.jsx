import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createLeague,
  deleteLeague,
  getLeagueStandings,
  getMyLeagues,
  joinLeague,
  leaveLeague,
  loadLeagueHeadToHead,
  readLeagueSession,
} from './leagueService.js'
import {
  LEAGUE_COMPETITION,
  validateJoinCode,
  validateLeagueName,
} from './leagueModel.js'

function messageForError(error) {
  const message = error instanceof Error ? error.message : String(error)
  if (/League code was not found/i.test(message)) return 'That league code was not found for Euro 2028.'
  if (/League membership is required/i.test(message)) return 'You are no longer a member of that league.'
  return message
}

function CompetitionTabs({ value, onChange }) {
  return (
    <div className="foundation-league-tabs" role="tablist" aria-label="League competition">
      <button
        type="button"
        role="tab"
        aria-selected={value === LEAGUE_COMPETITION.ORIGINAL}
        className={value === LEAGUE_COMPETITION.ORIGINAL ? 'is-active' : ''}
        onClick={() => onChange(LEAGUE_COMPETITION.ORIGINAL)}
      >
        Original Predictor
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === LEAGUE_COMPETITION.KO_PREDICTOR}
        className={value === LEAGUE_COMPETITION.KO_PREDICTOR ? 'is-active' : ''}
        onClick={() => onChange(LEAGUE_COMPETITION.KO_PREDICTOR)}
      >
        KO Predictor
      </button>
    </div>
  )
}

function LeaguePicker({ leagues, selectedId, onSelect }) {
  if (leagues.length === 0) return null
  return (
    <label className="auth-field foundation-league-picker">
      <span>Your leagues</span>
      <select value={selectedId ?? ''} onChange={event => onSelect(event.target.value)}>
        {leagues.map(league => (
          <option key={league.id} value={league.id}>
            {league.name} · {league.memberCount} member{league.memberCount === 1 ? '' : 's'}
          </option>
        ))}
      </select>
    </label>
  )
}

function StandingsTable({ rows, onCompare }) {
  return (
    <div className="foundation-table-wrap">
      <table className="foundation-league-table">
        <thead>
          <tr><th>#</th><th>Member</th><th>Match</th><th>Bracket</th><th>Total</th></tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.userId} className={row.isCurrentUser ? 'is-current-user' : ''}>
              <td>{row.rank}</td>
              <td>
                {row.isCurrentUser ? (
                  <strong>{row.displayName} <small>(you)</small></strong>
                ) : (
                  <button type="button" className="foundation-member-link" onClick={() => onCompare(row)}>
                    {row.displayName}
                  </button>
                )}
                {row.memberRole === 'owner' && <span className="foundation-owner-chip">Owner</span>}
              </td>
              <td>{row.matchPoints}</td>
              <td>{row.bracketPoints}</td>
              <td><strong>{row.totalPoints}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HeadToHead({ state, competitionKey, onClose }) {
  if (!state) return null
  return (
    <article className="foundation-league-comparison">
      <div className="foundation-section-heading">
        <div>
          <span className="foundation-kicker">Head to head</span>
          <h3>You v {state.otherName}</h3>
        </div>
        <button type="button" className="foundation-secondary-button" onClick={onClose}>Close</button>
      </div>

      {state.status === 'loading' && <p className="foundation-empty-copy">Loading shared predictions…</p>}
      {state.status === 'error' && <p className="foundation-warning-text">{state.error}</p>}
      {state.status === 'ready' && !state.data.comparison.visible && (
        <p className="foundation-empty-copy">{state.data.comparison.reason}</p>
      )}
      {state.status === 'ready' && state.data.comparison.visible && (
        <>
          <div className="foundation-result-summary foundation-comparison-summary">
            <div><strong>{state.data.comparison.comparedMatches}</strong><span>matches compared</span></div>
            <div><strong>{state.data.comparison.exactScoreMatches}</strong><span>same score</span></div>
            {competitionKey === LEAGUE_COMPETITION.ORIGINAL ? (
              <div><strong>{state.data.comparison.bracketMatches}</strong><span>same bracket picks</span></div>
            ) : (
              <>
                <div><strong>{state.data.comparison.advancingTeamMatches}</strong><span>same team through</span></div>
                <div><strong>{state.data.comparison.methodMatches}</strong><span>same method</span></div>
              </>
            )}
          </div>

          {state.data.comparison.rows.length > 0 && (
            <div className="foundation-comparison-list">
              {state.data.comparison.rows.slice(0, 15).map(row => (
                <div key={row.matchNumber}>
                  <span>Match {row.matchNumber}</span>
                  <strong>{row.leftScore} v {row.rightScore}</strong>
                  <small>{row.scoreSame ? 'Same exact score' : 'Different score'}{row.leftJoker || row.rightJoker ? ' · joker involved' : ''}</small>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </article>
  )
}

export default function LeaguesFoundation({ client, tournamentId }) {
  const [session, setSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(Boolean(client))
  const [leagues, setLeagues] = useState([])
  const [selectedLeagueId, setSelectedLeagueId] = useState(null)
  const [competitionKey, setCompetitionKey] = useState(LEAGUE_COMPETITION.ORIGINAL)
  const [standings, setStandings] = useState([])
  const [status, setStatus] = useState('idle')
  const [notice, setNotice] = useState(null)
  const [createName, setCreateName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [comparison, setComparison] = useState(null)

  const selectedLeague = useMemo(
    () => leagues.find(league => league.id === selectedLeagueId) ?? leagues[0] ?? null,
    [leagues, selectedLeagueId],
  )

  const refreshLeagues = useCallback(async () => {
    if (!client || !session?.user || !tournamentId) return
    const nextLeagues = await getMyLeagues(client, tournamentId)
    setLeagues(nextLeagues)
    setSelectedLeagueId(previous => (
      nextLeagues.some(league => league.id === previous) ? previous : nextLeagues[0]?.id ?? null
    ))
  }, [client, session, tournamentId])

  const refreshStandings = useCallback(async () => {
    if (!client || !selectedLeague?.id) {
      setStandings([])
      return
    }
    setStatus('loading')
    try {
      const rows = await getLeagueStandings(client, {
        leagueId: selectedLeague.id,
        competitionKey,
      })
      setStandings(rows)
      setStatus('ready')
    } catch (error) {
      setStatus('error')
      setNotice({ tone: 'danger', message: messageForError(error) })
    }
  }, [client, selectedLeague, competitionKey])

  useEffect(() => {
    if (!client) return undefined
    let active = true
    readLeagueSession(client)
      .then(nextSession => {
        if (!active) return
        setSession(nextSession)
        setLoadingSession(false)
      })
      .catch(error => {
        if (!active) return
        setLoadingSession(false)
        setNotice({ tone: 'danger', message: messageForError(error) })
      })

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setLoadingSession(false)
      if (!nextSession) {
        setLeagues([])
        setSelectedLeagueId(null)
        setStandings([])
        setComparison(null)
      }
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [client])

  useEffect(() => {
    if (!client || !session?.user || !tournamentId) return undefined
    let active = true

    getMyLeagues(client, tournamentId)
      .then(nextLeagues => {
        if (!active) return
        setLeagues(nextLeagues)
        setSelectedLeagueId(previous => (
          nextLeagues.some(league => league.id === previous) ? previous : nextLeagues[0]?.id ?? null
        ))
      })
      .catch(error => {
        if (active) setNotice({ tone: 'danger', message: messageForError(error) })
      })

    return () => { active = false }
  }, [client, session, tournamentId])

  useEffect(() => {
    if (!client || !selectedLeague?.id) return undefined
    let active = true

    getLeagueStandings(client, {
      leagueId: selectedLeague.id,
      competitionKey,
    })
      .then(rows => {
        if (!active) return
        setStandings(rows)
        setStatus('ready')
      })
      .catch(error => {
        if (!active) return
        setStatus('error')
        setNotice({ tone: 'danger', message: messageForError(error) })
      })

    return () => { active = false }
  }, [client, selectedLeague, competitionKey])

  const run = async action => {
    setNotice(null)
    setStatus('loading')
    try {
      await action()
      await refreshLeagues()
      setStatus('ready')
    } catch (error) {
      setStatus('error')
      setNotice({ tone: 'danger', message: messageForError(error) })
    }
  }

  const submitCreate = event => {
    event.preventDefault()
    const checked = validateLeagueName(createName)
    if (!checked.valid) {
      setNotice({ tone: 'danger', message: checked.error })
      return
    }
    run(async () => {
      const created = await createLeague(client, { tournamentId, name: checked.value })
      setCreateName('')
      setSelectedLeagueId(created.league_id)
      setNotice({ tone: 'safe', message: `${created.name} was created.` })
    })
  }

  const submitJoin = event => {
    event.preventDefault()
    const checked = validateJoinCode(joinCode)
    if (!checked.valid) {
      setNotice({ tone: 'danger', message: checked.error })
      return
    }
    run(async () => {
      const joined = await joinLeague(client, { tournamentId, joinCode: checked.value })
      setJoinCode('')
      setSelectedLeagueId(joined.league_id)
      setNotice({ tone: 'safe', message: `Joined ${joined.name}.` })
    })
  }

  const handleLeave = () => {
    if (!selectedLeague) return
    run(async () => {
      await leaveLeague(client, selectedLeague.id)
      setNotice({ tone: 'safe', message: `You left ${selectedLeague.name}.` })
    })
  }

  const handleDelete = () => {
    if (!selectedLeague) return
    run(async () => {
      await deleteLeague(client, selectedLeague.id)
      setNotice({ tone: 'safe', message: `${selectedLeague.name} was deleted.` })
    })
  }

  const compareMember = async row => {
    if (!selectedLeague || !session?.user) return
    setComparison({ status: 'loading', otherName: row.displayName, data: null, error: null })
    try {
      const data = await loadLeagueHeadToHead(client, {
        leagueId: selectedLeague.id,
        currentUserId: session.user.id,
        otherUserId: row.userId,
        competitionKey,
      })
      setComparison({ status: 'ready', otherName: row.displayName, data, error: null })
    } catch (error) {
      setComparison({ status: 'error', otherName: row.displayName, data: null, error: messageForError(error) })
    }
  }

  return (
    <section className="foundation-panel foundation-leagues" aria-labelledby="stage11-leagues-heading">
      <div className="foundation-section-heading">
        <div>
          <span className="foundation-kicker">Leagues and shared predictions</span>
          <h2 id="stage11-leagues-heading">Private leagues with two separate tables</h2>
          <p>One member list, but Original Predictor and KO Predictor points are never combined.</p>
        </div>
        {session?.user && <button type="button" className="foundation-secondary-button" onClick={refreshStandings}>Refresh</button>}
      </div>

      {notice && <p className={`auth-notice auth-notice--${notice.tone}`}>{notice.message}</p>}

      {loadingSession && <p className="foundation-empty-copy">Checking your league access…</p>}
      {!loadingSession && !session?.user && (
        <p className="foundation-empty-copy">Sign in to create or join private leagues. Guest predictions remain browser-only and cannot enter a leaderboard.</p>
      )}

      {!loadingSession && session?.user && (
        <>
          <div className="foundation-league-actions">
            <form onSubmit={submitCreate}>
              <span className="foundation-kicker">Create</span>
              <h3>Start a private league</h3>
              <label className="auth-field">
                <span>League name</span>
                <input value={createName} onChange={event => setCreateName(event.target.value)} maxLength={40} required />
              </label>
              <button type="submit" disabled={status === 'loading'}>Create league</button>
            </form>

            <form onSubmit={submitJoin}>
              <span className="foundation-kicker">Join</span>
              <h3>Enter a league code</h3>
              <label className="auth-field">
                <span>10-character code</span>
                <input value={joinCode} onChange={event => setJoinCode(event.target.value.toUpperCase())} maxLength={12} required />
              </label>
              <button type="submit" disabled={status === 'loading'}>Join league</button>
            </form>
          </div>

          {leagues.length === 0 ? (
            <p className="foundation-empty-copy">You have not created or joined a league yet.</p>
          ) : (
            <>
              <div className="foundation-league-toolbar">
                <LeaguePicker leagues={leagues} selectedId={selectedLeague?.id} onSelect={value => { setSelectedLeagueId(value); setComparison(null) }} />
                <CompetitionTabs value={competitionKey} onChange={value => { setCompetitionKey(value); setComparison(null) }} />
              </div>

              <article className="foundation-league-card">
                <div className="foundation-section-heading">
                  <div>
                    <span className="foundation-kicker">{selectedLeague?.memberCount} member{selectedLeague?.memberCount === 1 ? '' : 's'}</span>
                    <h3>{selectedLeague?.name}</h3>
                    <p>League code: <strong>{selectedLeague?.joinCode}</strong></p>
                  </div>
                  <div className="foundation-inline-actions">
                    {selectedLeague?.memberRole === 'owner' ? (
                      <button type="button" className="foundation-danger-button" onClick={handleDelete}>Delete league</button>
                    ) : (
                      <button type="button" className="foundation-secondary-button" onClick={handleLeave}>Leave league</button>
                    )}
                  </div>
                </div>

                {status === 'loading' && <p className="foundation-empty-copy">Loading league table…</p>}
                {status !== 'loading' && standings.length === 0 && <p className="foundation-empty-copy">No league members were returned.</p>}
                {standings.length > 0 && <StandingsTable rows={standings} onCompare={compareMember} />}
              </article>

              <HeadToHead state={comparison} competitionKey={competitionKey} onClose={() => setComparison(null)} />
            </>
          )}
        </>
      )}
    </section>
  )
}
