import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, LinkButton, PlayerIdentity, StatusBar, Tabs, TeamLabel } from '../design-system/index.jsx'
import { RESULT_COMPETITION } from '../results/resultModel.js'
import { loadMatchCentre } from './matchCentreService.js'
import styles from './MatchCentreFoundation.module.css'

const COMPETITION_OPTIONS = [
  { value: RESULT_COMPETITION.ORIGINAL, label: 'Original Predictor' },
  { value: RESULT_COMPETITION.KO_PREDICTOR, label: 'KO Predictor' },
]

function setHashParams({ matchNumber, competitionKey, leagueId }) {
  const params = new URLSearchParams()
  params.set('match', String(matchNumber))
  params.set('competition', competitionKey)
  if (leagueId && leagueId !== 'overall') params.set('league', leagueId)
  globalThis.history?.replaceState?.(null, '', `#/match-centre?${params.toString()}`)
}

function FixtureLink({ fixture, direction }) {
  if (!fixture) return <span />
  return (
    <a className={styles.fixtureLink} href={`#/match-centre?match=${fixture.matchNumber}`}>
      <small>{direction}</small>
      <strong>Match {fixture.matchNumber}</strong>
      <span>{fixture.home.label} v {fixture.away.label}</span>
    </a>
  )
}

function FixtureHero({ fixture }) {
  const tone = fixture.state === 'live' ? 'danger' : fixture.state === 'completed' ? 'safe' : 'info'
  return (
    <Card className={styles.hero} as="article">
      <div className={styles.heroHeading}>
        <div><span className="page-eyebrow">{fixture.stageLabel} · Match {fixture.matchNumber}</span><h2>{fixture.state === 'live' ? 'Live Match Centre' : fixture.state === 'completed' ? 'Full-time Match Centre' : 'Fixture Match Centre'}</h2></div>
        <Badge tone={tone}>{fixture.state.replaceAll('_', ' ')}</Badge>
      </div>
      <div className={styles.teams}>
        <TeamLabel team={fixture.home} label={fixture.home.label} isoCode={fixture.home.isoCode} unresolved={fixture.home.unresolved} />
        <strong className={styles.score}>{fixture.score ?? 'v'}</strong>
        <TeamLabel team={fixture.away} label={fixture.away.label} isoCode={fixture.away.isoCode} unresolved={fixture.away.unresolved} />
      </div>
      <div className={styles.meta}>
        <span>{fixture.kickoffAt ?? fixture.scheduledDate ?? 'Kick-off time to be confirmed'}</span>
        {fixture.venueLabel && <span>{fixture.venueLabel}</span>}
        {fixture.resultDetail && <span>{fixture.resultDetail}</span>}
        {fixture.corrected && <span>Corrected result · revision {fixture.resultRevision}</span>}
      </div>
    </Card>
  )
}

function Community({ impact }) {
  return (
    <Card className={styles.panel} as="article">
      <div className={styles.panelHeading}><div><span className="page-eyebrow">Community view</span><h3>What this scope predicted</h3></div><Badge tone="neutral">{impact.visibleCount}/{impact.memberCount} visible</Badge></div>
      {impact.community.length === 0 ? <p>No released selections are available for this fixture yet.</p> : (
        <div className={styles.community}>
          {impact.community.map(row => (
            <div key={row.key}><span><strong>{row.label}</strong><small>{row.count} player{row.count === 1 ? '' : 's'}</small></span><b>{row.percent}%</b></div>
          ))}
        </div>
      )}
      {impact.privateCount > 0 && <small>{impact.privateCount} selection{impact.privateCount === 1 ? ' remains' : 's remain'} protected by the existing privacy gate.</small>}
    </Card>
  )
}

function PlayerLine({ line }) {
  return (
    <li className={`${styles.playerLine} ${line.isCurrentUser ? styles.current : ''}`}>
      <PlayerIdentity player={line} isCurrentUser={line.isCurrentUser} />
      <span className={styles.rank}>#{line.rank || '—'} · {line.totalPoints} pts</span>
      {line.visibility === 'visible' ? (
        <div className={styles.selection}>
          <strong>{line.score ?? line.advancingTeamLabel ?? 'Saved selection'}</strong>
          {line.advancingTeamLabel && line.score && <span>{line.advancingTeamLabel} to advance</span>}
          {line.decisionMethod && <span>{line.decisionMethod.replaceAll('_', ' ')}</span>}
          {line.jokerApplied && <Badge tone="warning">Joker</Badge>}
        </div>
      ) : <p className={styles.protected}>{line.reason}</p>}
      <strong className={styles.points}>{line.maximumPoints > 0 ? `Up to ${line.maximumPoints} pts` : 'No points available'}</strong>
    </li>
  )
}

export default function MatchCentreFoundation({ client, reference, requestedMatchNumber = null, initialCompetition = RESULT_COMPETITION.ORIGINAL, initialLeagueId = null }) {
  const [competitionKey, setCompetitionKey] = useState(initialCompetition)
  const [leagueId, setLeagueId] = useState(initialLeagueId ?? 'overall')
  const [state, setState] = useState({ status: 'loading', data: null, error: null })

  const load = useCallback(async () => {
    setState(previous => ({ ...previous, status: 'loading', error: null }))
    try {
      const data = await loadMatchCentre(client, { reference, requestedMatchNumber, competitionKey, leagueId })
      setState({ status: 'ready', data, error: null })
      setHashParams({ matchNumber: data.navigation.current.matchNumber, competitionKey, leagueId: data.selectedScope })
    } catch (error) {
      setState({ status: 'error', data: null, error: error instanceof Error ? error.message : String(error) })
    }
  }, [client, reference, requestedMatchNumber, competitionKey, leagueId])

  useEffect(() => { void Promise.resolve().then(load) }, [load])
  const data = state.data
  const currentMatchNumber = data?.navigation?.current?.matchNumber ?? requestedMatchNumber
  const scopeOptions = useMemo(() => data?.scopes ?? [], [data])

  if (state.status === 'loading' && !data) return <div className={styles.loading} role="status">Loading Match Centre…</div>
  if (state.status === 'error') return <StatusBar tone="danger" title="Match Centre could not load" action={<Button variant="secondary" size="small" icon="refresh" onClick={load}>Try again</Button>}>{state.error}</StatusBar>

  return (
    <div className={styles.root}>
      <nav className={styles.fixtureNav} aria-label="Fixture navigation">
        <FixtureLink fixture={data.navigation.previous} direction="Previous fixture" />
        <FixtureLink fixture={data.navigation.next} direction="Next fixture" />
      </nav>
      {!data.navigation.requestedFound && <StatusBar tone="warning" title="Requested fixture was not found">Showing Match {currentMatchNumber} instead.</StatusBar>}
      <FixtureHero fixture={data.navigation.current} />

      <Card className={styles.controls} as="section">
        <Tabs label="Match Centre competition" value={competitionKey} options={COMPETITION_OPTIONS} onChange={value => { setCompetitionKey(value); setLeagueId('overall') }} />
        {data.signedIn && scopeOptions.length > 0 && (
          <label><span>Viewing</span><select value={data.selectedScope} onChange={event => setLeagueId(event.target.value)}>{scopeOptions.map(scope => <option key={scope.id} value={scope.id}>{scope.label}</option>)}</select></label>
        )}
        <small>Original and KO Predictor information remain separate. This screen never combines their points.</small>
      </Card>

      {!data.signedIn ? (
        <StatusBar tone="info" title="Sign in to see points impact" action={<LinkButton href="#/account" size="small">Account</LinkButton>}>Fixture information remains public, but player predictions follow the existing privacy gates.</StatusBar>
      ) : (
        <>
          <Community impact={data.impact} />
          <Card className={styles.panel} as="section">
            <div className={styles.panelHeading}><div><span className="page-eyebrow">Points on the line</span><h3>{data.impact.memberCount} player{data.impact.memberCount === 1 ? '' : 's'} in this scope</h3></div><Badge tone="info">Maximum available</Badge></div>
            <p>Rows show the maximum currently available from the saved selection, using the canonical Euro scoring configuration. Protected predictions stay hidden.</p>
            {data.impact.lines.length === 0 ? <p>No players are available in this scope.</p> : <ol className={styles.playerList}>{data.impact.lines.map(line => <PlayerLine key={line.userId} line={line} />)}</ol>}
          </Card>
        </>
      )}
    </div>
  )
}
