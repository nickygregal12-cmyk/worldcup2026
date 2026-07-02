import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createLeague,
  deleteLeague,
  getMyLeagues,
  joinLeague,
  leaveLeague,
  loadLeagueHeadToHead,
  loadLeagueOverview,
  readLeagueSession,
} from './leagueService.js'
import {
  buildSharedPredictionJourney,
  buildStandingComparison,
  formatOrdinal,
  LEAGUE_COMPETITION,
  validateJoinCode,
  validateLeagueName,
} from './leagueModel.js'
import { createLatestRequestGuard } from '../lib/latestRequest.js'

function messageForError(error) {
  const message = error instanceof Error ? error.message : String(error)
  if (/League code was not found/i.test(message)) return 'That league code was not found for Euro 2028.'
  if (/League membership is required/i.test(message)) return 'You are no longer a member of that league.'
  return message
}

function competitionName(competitionKey) {
  return competitionKey === LEAGUE_COMPETITION.ORIGINAL ? 'Original Predictor' : 'KO Predictor'
}

function CompetitionTabs({ value, onChange }) {
  return (
    <div className="foundation-league-tabs" role="tablist" aria-label="League competition">
      {Object.values(LEAGUE_COMPETITION).map(key => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={value === key}
          className={value === key ? 'is-active' : ''}
          onClick={() => onChange(key)}
        >
          {competitionName(key)}
        </button>
      ))}
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


function MemberPicker({ members, selectedId, onSelect }) {
  const available = members.filter(member => !member.isCurrentUser)
  if (available.length === 0) return null
  return (
    <label className="auth-field foundation-member-picker">
      <span>Compare with member</span>
      <select value={selectedId ?? ''} onChange={event => onSelect(event.target.value)}>
        <option value="">Choose a member</option>
        {available.map(member => (
          <option key={member.userId} value={member.userId}>{member.displayName}</option>
        ))}
      </select>
    </label>
  )
}

function LeagueSummaryCard({ title, summary, section }) {
  if (!summary || section?.status === 'error') {
    return (
      <article className="foundation-league-summary-card is-error">
        <span className="foundation-kicker">{title}</span>
        <strong>Unavailable</strong>
        <small>{section?.error ?? 'This competition summary could not be loaded.'}</small>
      </article>
    )
  }

  const stateCopy = summary.state === 'pre_competition'
    ? 'Standings begin after scoring starts.'
    : summary.state === 'empty'
      ? 'No members were returned.'
      : summary.leaderName
        ? `${summary.leaderName} leads on ${summary.leaderPoints} pts.`
        : 'Standings are ready.'

  return (
    <article className="foundation-league-summary-card">
      <span className="foundation-kicker">{title}</span>
      <strong>{formatOrdinal(summary.currentRank)}</strong>
      <span>{summary.currentPoints} pts</span>
      <small>{stateCopy}</small>
    </article>
  )
}

function StandingsTable({ rows, competitionKey, onCompare }) {
  const original = competitionKey === LEAGUE_COMPETITION.ORIGINAL
  return (
    <div className="foundation-table-wrap">
      <table className="foundation-league-table">
        <thead>
          <tr>
            <th>#</th><th>Member</th>
            {original ? <><th>Groups</th><th>Bracket</th></> : <><th>Scored</th><th>Match points</th></>}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.userId} className={row.isCurrentUser ? 'is-current-user' : ''}>
              <td data-label="Rank">{row.rank}</td>
              <td data-label="Member">
                {row.isCurrentUser ? (
                  <strong>{row.displayName} <small>(you)</small></strong>
                ) : (
                  <button type="button" className="foundation-member-link" onClick={() => onCompare(row)}>
                    {row.displayName}
                  </button>
                )}
                {row.memberRole === 'owner' && <span className="foundation-owner-chip">Owner</span>}
              </td>
              {original ? (
                <><td data-label="Groups">{row.matchPoints}</td><td data-label="Bracket">{row.bracketPoints}</td></>
              ) : (
                <><td data-label="Scored">{row.scoredMatchCount}</td><td data-label="Match points">{row.matchPoints}</td></>
              )}
              <td data-label="Total"><strong>{row.totalPoints}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PredictionRows({ journey, heading }) {
  const rows = [...journey.matches, ...journey.bracket]
  const entirelyPrivate = journey.privateSelectionCount === journey.totalSelectionCount
  return (
    <section className="foundation-member-predictions">
      <div>
        <h4>{heading}</h4>
        <small>{journey.visibleSelectionCount} visible · {journey.privateSelectionCount} private · {journey.notSavedSelectionCount} not saved</small>
      </div>
      {entirelyPrivate ? (
        <div className="foundation-privacy-state" role="status">
          <strong>Selections remain private</strong>
          <p>{journey.reason ?? rows[0]?.message ?? 'These selections have not been released by the server yet.'}</p>
          <small>{journey.totalSelectionCount} selections protected by the competition privacy rules.</small>
        </div>
      ) : (
        <div className="foundation-member-prediction-list">
          {rows.map(row => (
            <article key={`${row.kind}-${row.matchNumber}`} className={`foundation-member-prediction is-${row.visibility}`}>
              <div>
                <span>{row.stageLabel} · Match {row.matchNumber}</span>
                <strong>{row.homeLabel} v {row.awayLabel}</strong>
              </div>
              {row.visibility === 'visible' && row.kind === 'match' && (
                <div className="foundation-member-prediction__pick">
                  <strong>{row.score}</strong>
                  {row.advancingTeamLabel && <small>{row.advancingTeamLabel} through</small>}
                  {row.decisionMethodLabel && <small>{row.decisionMethodLabel}</small>}
                  {row.jokerApplied && <small>Joker applied</small>}
                </div>
              )}
              {row.visibility === 'visible' && row.kind === 'bracket' && (
                <div className="foundation-member-prediction__pick">
                  <strong>{row.advancingTeamLabel ?? 'No selection'}</strong>
                  <small>Advancing team</small>
                </div>
              )}
              {row.visibility !== 'visible' && <p>{row.message}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function HeadToHead({ state, reference, onClose }) {
  if (!state) return null
  const competitionKey = state.competitionKey
  let currentJourney = null
  let otherJourney = null
  if (state.status === 'ready') {
    currentJourney = buildSharedPredictionJourney({
      bundle: state.data.currentBundle,
      reference,
      competitionKey,
    })
    otherJourney = buildSharedPredictionJourney({
      bundle: state.data.otherBundle,
      reference,
      competitionKey,
    })
  }

  return (
    <article className="foundation-league-comparison">
      <div className="foundation-section-heading">
        <div>
          <span className="foundation-kicker">Member comparison · {competitionName(competitionKey)}</span>
          <h3>You v {state.otherName}</h3>
          <p>Only selections released by the existing server privacy rules are shown.</p>
        </div>
        <button type="button" className="foundation-secondary-button" onClick={onClose}>Close</button>
      </div>

      {state.standings && (
        <div className="foundation-head-to-head-points" aria-label={`${competitionName(competitionKey)} league positions`}>
          <div>
            <span>You</span>
            <strong>{formatOrdinal(state.standings.current?.rank)}</strong>
            <small>{state.standings.current ? `${state.standings.current.totalPoints} pts` : 'Position unavailable'}</small>
          </div>
          <div>
            <span>{state.otherName}</span>
            <strong>{formatOrdinal(state.standings.other?.rank)}</strong>
            <small>{state.standings.other ? `${state.standings.other.totalPoints} pts` : 'Position unavailable'}</small>
          </div>
        </div>
      )}

      {state.status === 'loading' && <p className="foundation-empty-copy">Loading authorised shared predictions…</p>}
      {state.status === 'error' && <p className="foundation-warning-text">{state.error}</p>}
      {state.status === 'ready' && !state.data.comparison.visible && (
        <p className="foundation-empty-copy">{state.data.comparison.reason}</p>
      )}
      {state.status === 'ready' && state.data.comparison.visible && (
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
      )}
      {state.status === 'ready' && (
        <div className="foundation-member-prediction-columns">
          <PredictionRows journey={currentJourney} heading="Your available selections" />
          <PredictionRows journey={otherJourney} heading={`${state.otherName}'s available selections`} />
        </div>
      )}
    </article>
  )
}

export default function LeaguesFoundation({ client, tournamentId, reference }) {
  const [session, setSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(Boolean(client))
  const [leagues, setLeagues] = useState([])
  const [leagueListStatus, setLeagueListStatus] = useState('idle')
  const [selectedLeagueId, setSelectedLeagueId] = useState(null)
  const [competitionKey, setCompetitionKey] = useState(LEAGUE_COMPETITION.ORIGINAL)
  const [overview, setOverview] = useState({ status: 'idle', data: null, leagueId: null })
  const [actionStatus, setActionStatus] = useState('idle')
  const [notice, setNotice] = useState(null)
  const [createName, setCreateName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [comparison, setComparison] = useState(null)
  const [comparisonMemberId, setComparisonMemberId] = useState('')
  const [pendingLeagueAction, setPendingLeagueAction] = useState(null)
  const overviewRequests = useRef(createLatestRequestGuard())
  const comparisonRequests = useRef(createLatestRequestGuard())

  const selectedLeague = useMemo(
    () => leagues.find(league => league.id === selectedLeagueId) ?? leagues[0] ?? null,
    [leagues, selectedLeagueId],
  )

  const refreshLeagues = useCallback(async preferredId => {
    if (!client || !session?.user || !tournamentId) return []
    setLeagueListStatus('loading')
    try {
      const nextLeagues = await getMyLeagues(client, tournamentId)
      setLeagues(nextLeagues)
      setSelectedLeagueId(previous => {
        if (preferredId && nextLeagues.some(league => league.id === preferredId)) return preferredId
        return nextLeagues.some(league => league.id === previous) ? previous : nextLeagues[0]?.id ?? null
      })
      setLeagueListStatus('ready')
      return nextLeagues
    } catch (error) {
      setLeagueListStatus('error')
      throw error
    }
  }, [client, session, tournamentId])

  const refreshOverview = useCallback(async () => {
    if (!client || !selectedLeague?.id) {
      overviewRequests.current.cancel()
      setOverview({ status: 'idle', data: null, leagueId: null })
      return
    }
    const leagueId = selectedLeague.id
    const requestToken = overviewRequests.current.begin()
    setOverview(previous => ({ ...previous, status: 'loading', leagueId }))
    try {
      const data = await loadLeagueOverview(client, leagueId)
      if (!overviewRequests.current.isCurrent(requestToken)) return
      setOverview({ status: data.status, data, leagueId })
    } catch (error) {
      if (!overviewRequests.current.isCurrent(requestToken)) return
      setOverview(previous => ({
        status: previous.data ? 'partial' : 'error',
        data: previous.data,
        leagueId,
      }))
      setNotice({ tone: 'danger', message: messageForError(error) })
    }
  }, [client, selectedLeague])

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
        setOverview({ status: 'idle', data: null, leagueId: null })
        comparisonRequests.current.cancel()
        overviewRequests.current.cancel()
        setComparison(null)
        setComparisonMemberId('')
        setPendingLeagueAction(null)
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
        setLeagueListStatus('ready')
      })
      .catch(error => {
        if (!active) return
        setLeagueListStatus('error')
        setNotice({ tone: 'danger', message: messageForError(error) })
      })
    return () => { active = false }
  }, [client, session, tournamentId])

  useEffect(() => {
    if (!client || !selectedLeague?.id) return undefined
    const requestGuard = overviewRequests.current
    void refreshOverview()
    return () => { requestGuard.cancel() }
  }, [client, refreshOverview, selectedLeague])

  const run = async action => {
    setNotice(null)
    setActionStatus('loading')
    try {
      await action()
      setActionStatus('ready')
      return true
    } catch (error) {
      setActionStatus('error')
      setNotice({ tone: 'danger', message: messageForError(error) })
      return false
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
      await refreshLeagues(created.league_id)
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
      await refreshLeagues(joined.league_id)
      setNotice({ tone: 'safe', message: `Joined ${joined.name}.` })
    })
  }

  const confirmLeagueAction = async () => {
    if (!selectedLeague || !pendingLeagueAction) return
    const leagueName = selectedLeague.name
    const action = pendingLeagueAction
    const succeeded = await run(async () => {
      if (action === 'delete') await deleteLeague(client, selectedLeague.id)
      else await leaveLeague(client, selectedLeague.id)
      clearComparison()
      await refreshLeagues()
    })
    if (!succeeded) return
    setPendingLeagueAction(null)
    setNotice({
      tone: 'safe',
      message: action === 'delete' ? `${leagueName} was deleted.` : `You left ${leagueName}.`,
    })
  }


  const clearComparison = () => {
    comparisonRequests.current.cancel()
    setComparison(null)
    setComparisonMemberId('')
  }

  const compareMember = async (row, requestedCompetitionKey = competitionKey) => {
    if (!selectedLeague || !session?.user) return
    const requestToken = comparisonRequests.current.begin()
    const leagueId = selectedLeague.id
    const section = requestedCompetitionKey === LEAGUE_COMPETITION.ORIGINAL
      ? overview.data?.sections.original
      : overview.data?.sections.koPredictor
    const standings = buildStandingComparison(section?.data ?? [], row.userId)

    setComparisonMemberId(row.userId)
    setComparison({
      status: 'loading',
      otherName: row.displayName,
      otherUserId: row.userId,
      competitionKey: requestedCompetitionKey,
      leagueId,
      standings,
      data: null,
      error: null,
    })
    try {
      const data = await loadLeagueHeadToHead(client, {
        leagueId,
        currentUserId: session.user.id,
        otherUserId: row.userId,
        competitionKey: requestedCompetitionKey,
      })
      if (!comparisonRequests.current.isCurrent(requestToken)) return
      setComparison(previous => ({ ...previous, status: 'ready', data, error: null }))
    } catch (error) {
      if (!comparisonRequests.current.isCurrent(requestToken)) return
      setComparison(previous => ({ ...previous, status: 'error', data: null, error: messageForError(error) }))
    }
  }



  const overviewLoading = Boolean(selectedLeague?.id) && overview.leagueId !== selectedLeague.id
  const activeOverview = overviewLoading ? null : overview.data
  const activeSection = competitionKey === LEAGUE_COMPETITION.ORIGINAL
    ? activeOverview?.sections.original
    : activeOverview?.sections.koPredictor
  const standings = activeSection?.data ?? []
  const leagueListLoading = ['idle', 'loading'].includes(leagueListStatus)

  const chooseComparisonMember = memberUserId => {
    if (!memberUserId) {
      clearComparison()
      return
    }
    const member = activeOverview?.members.find(candidate => candidate.userId === memberUserId)
    if (member) compareMember(member)
  }

  const copyLeagueCode = async () => {
    if (!selectedLeague?.joinCode) return
    try {
      await navigator.clipboard.writeText(selectedLeague.joinCode)
      setNotice({ tone: 'safe', message: 'League code copied.' })
    } catch {
      setNotice({ tone: 'info', message: `League code: ${selectedLeague.joinCode}` })
    }
  }

  return (
    <section className="foundation-panel foundation-leagues" aria-labelledby="euro28-leagues-heading">
      <div className="foundation-section-heading">
        <div>
          <span className="foundation-kicker">Private leagues</span>
          <h2 id="euro28-leagues-heading">One member list, two separate competitions</h2>
          <p>Original Predictor and KO Predictor ranks and points are always shown separately.</p>
        </div>
        {session?.user && <button type="button" className="foundation-secondary-button" onClick={() => { void refreshOverview() }} disabled={overview.status === 'loading'}>{overview.status === 'loading' ? 'Refreshing…' : 'Refresh league'}</button>}
      </div>

      {notice && <p className={`auth-notice auth-notice--${notice.tone}`}>{notice.message}</p>}
      {loadingSession && <p className="foundation-empty-copy">Checking your league access…</p>}
      {!loadingSession && !session?.user && (
        <p className="foundation-empty-copy">Sign in to create or join private leagues. Guest predictions remain browser-only and cannot enter a leaderboard.</p>
      )}

      {!loadingSession && session?.user && (
        <>
          <details className="foundation-league-manage" open={leagues.length === 0}>
            <summary>Manage leagues</summary>
            <div className="foundation-league-actions">
              <form onSubmit={submitCreate}>
                <span className="foundation-kicker">Create</span>
                <h3>Start a private league</h3>
                <label className="auth-field">
                  <span>League name</span>
                  <input value={createName} onChange={event => setCreateName(event.target.value)} maxLength={40} required />
                </label>
                <button type="submit" disabled={actionStatus === 'loading'}>Create league</button>
              </form>

              <form onSubmit={submitJoin}>
                <span className="foundation-kicker">Join</span>
                <h3>Enter a league code</h3>
                <label className="auth-field">
                  <span>10-character code</span>
                  <input value={joinCode} onChange={event => setJoinCode(event.target.value.toUpperCase())} maxLength={12} required />
                </label>
                <button type="submit" disabled={actionStatus === 'loading'}>Join league</button>
              </form>
            </div>
          </details>

          {leagueListLoading && <p className="foundation-empty-copy">Loading your leagues…</p>}
          {!leagueListLoading && leagues.length === 0 ? (
            <p className="foundation-empty-copy">You have not created or joined a league yet.</p>
          ) : selectedLeague && (
            <>
              <div className="foundation-league-toolbar">
                <LeaguePicker leagues={leagues} selectedId={selectedLeague.id} onSelect={value => { overviewRequests.current.cancel(); setSelectedLeagueId(value); clearComparison(); setPendingLeagueAction(null) }} />
                <CompetitionTabs value={competitionKey} onChange={value => { setCompetitionKey(value); clearComparison() }} />
              </div>

              <article className="foundation-league-card">
                <div className="foundation-section-heading">
                  <div>
                    <span className="foundation-kicker">{selectedLeague.memberCount} member{selectedLeague.memberCount === 1 ? '' : 's'}</span>
                    <h3>{selectedLeague.name}</h3>
                    <div className="foundation-league-code"><span>League code</span><strong>{selectedLeague.joinCode}</strong><button type="button" className="foundation-secondary-button" onClick={copyLeagueCode}>Copy</button></div>
                  </div>
                  <div className="foundation-inline-actions">
                    {selectedLeague.memberRole === 'owner' ? (
                      <button type="button" className="foundation-danger-button" onClick={() => setPendingLeagueAction('delete')} disabled={actionStatus === 'loading'}>Delete league</button>
                    ) : (
                      <button type="button" className="foundation-secondary-button" onClick={() => setPendingLeagueAction('leave')} disabled={actionStatus === 'loading'}>Leave league</button>
                    )}
                  </div>
                </div>

                {pendingLeagueAction && (
                  <div className="foundation-destructive-confirmation" role="alert">
                    <div>
                      <strong>{pendingLeagueAction === 'delete' ? `Delete ${selectedLeague.name}?` : `Leave ${selectedLeague.name}?`}</strong>
                      <p>{pendingLeagueAction === 'delete' ? 'This removes the private league for every member. Prediction and scoring records remain separate.' : 'You will lose access to this league and its member comparisons.'}</p>
                    </div>
                    <div className="foundation-inline-actions">
                      <button type="button" className="foundation-danger-button" onClick={() => { void confirmLeagueAction() }} disabled={actionStatus === 'loading'}>{actionStatus === 'loading' ? 'Working…' : pendingLeagueAction === 'delete' ? 'Confirm delete' : 'Confirm leave'}</button>
                      <button type="button" className="foundation-secondary-button" onClick={() => setPendingLeagueAction(null)} disabled={actionStatus === 'loading'}>Cancel</button>
                    </div>
                  </div>
                )}

                {(overview.status === 'loading' || overviewLoading) && !overview.data && <p className="foundation-empty-copy">Loading both competition tables…</p>}
                {activeOverview && (
                  <>
                    {overview.status === 'partial' && <p className="foundation-warning-text">One competition table could not be loaded. The available table remains usable.</p>}
                    <div className="foundation-league-summary-grid">
                      <LeagueSummaryCard title="Original Predictor" summary={activeOverview.summaries.original} section={activeOverview.sections.original} />
                      <LeagueSummaryCard title="KO Predictor" summary={activeOverview.summaries.koPredictor} section={activeOverview.sections.koPredictor} />
                    </div>
                    <div className="foundation-shared-member-row">
                      <p className="foundation-member-count">Shared member list: <strong>{activeOverview.members.length}</strong></p>
                      <MemberPicker members={activeOverview.members} selectedId={comparisonMemberId} onSelect={chooseComparisonMember} />
                    </div>
                  </>
                )}

                <div className="foundation-competition-heading">
                  <div>
                    <span className="foundation-kicker">Separate standings</span>
                    <h3>{competitionName(competitionKey)}</h3>
                  </div>
                  <small>{competitionKey === LEAGUE_COMPETITION.ORIGINAL ? 'Group matches and original bracket only' : 'Real knockout fixtures only'}</small>
                </div>

                {activeSection?.status === 'error' && <p className="foundation-warning-text">{activeSection.error}</p>}
                {(overview.status === 'loading' || overviewLoading) && <p className="foundation-empty-copy">Refreshing standings…</p>}
                {overview.status !== 'loading' && !overviewLoading && activeSection?.status === 'ready' && standings.length === 0 && <p className="foundation-empty-copy">No league members were returned.</p>}
                {standings.length > 0 && <StandingsTable rows={standings} competitionKey={competitionKey} onCompare={compareMember} />}
              </article>

              <HeadToHead state={comparison} reference={reference} onClose={clearComparison} />
            </>
          )}
        </>
      )}
    </section>
  )
}
