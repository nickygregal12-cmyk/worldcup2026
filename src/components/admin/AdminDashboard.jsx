import { useEffect, useMemo, useState } from 'react'

const STATUS_META = {
  ok: { icon: '✓', label: 'Healthy', colour: 'var(--accent-green)', bg: 'rgba(0,122,51,0.08)', border: 'rgba(0,122,51,0.25)' },
  warning: { icon: '!', label: 'Needs attention', colour: '#b26a00', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.32)' },
  error: { icon: '×', label: 'Action required', colour: '#c62828', bg: 'rgba(198,40,40,0.08)', border: 'rgba(198,40,40,0.28)' },
  info: { icon: 'i', label: 'Information', colour: 'var(--scottish-navy)', bg: 'rgba(0,48,135,0.07)', border: 'rgba(0,48,135,0.20)' },
  progress: { icon: '…', label: 'In progress', colour: '#1558b0', bg: 'rgba(21,88,176,0.08)', border: 'rgba(21,88,176,0.24)' },
}

const compactDate = value => {
  if (!value) return 'Never'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/London',
  })
}

function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.info
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '4px 8px', borderRadius: '999px',
      background: meta.bg, border: `1px solid ${meta.border}`,
      color: meta.colour, fontSize: '10px', fontWeight: 900,
      textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
    }}>
      <span aria-hidden>{meta.icon}</span>{meta.label}
    </span>
  )
}

function CheckCard({ check, onOpen }) {
  const meta = STATUS_META[check.status] || STATUS_META.info
  return (
    <div style={{
      background: 'var(--bg-card)', border: `1px solid ${meta.border}`,
      borderRadius: '16px', padding: '14px', boxShadow: 'var(--shadow-sm)',
      display: 'flex', flexDirection: 'column', gap: '9px', minHeight: '142px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '11px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: meta.bg, color: meta.colour, fontWeight: 900, fontSize: '16px',
          }}>{check.icon}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 900 }}>{check.title}</div>
            {check.value !== undefined && (
              <div style={{ fontSize: '20px', fontFamily: 'var(--font-mono)', fontWeight: 900, marginTop: '2px', color: meta.colour }}>
                {check.value}
              </div>
            )}
          </div>
        </div>
        <StatusPill status={check.status} />
      </div>
      <div style={{ fontSize: '11px', lineHeight: 1.45, color: 'var(--text-muted)', flex: 1 }}>{check.detail}</div>
      {check.action && (
        <button onClick={() => onOpen(check.action)} className="btn btn-sm" style={{
          alignSelf: 'flex-start', padding: '6px 10px', fontSize: '10px',
          background: 'var(--bg-secondary)', border: '1px solid var(--border-light)',
        }}>
          {check.actionLabel || 'Review →'}
        </button>
      )}
    </div>
  )
}

function IssueRow({ issue, onOpen }) {
  const meta = STATUS_META[issue.status] || STATUS_META.info
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0',
      borderTop: '1px solid var(--border-light)',
    }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '9px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: meta.bg, color: meta.colour, fontWeight: 900,
      }}>{meta.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: 800 }}>{issue.title}</div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.35 }}>{issue.detail}</div>
      </div>
      {issue.action && (
        <button onClick={() => onOpen(issue.action)} className="btn btn-sm" style={{ padding: '6px 9px', fontSize: '10px', flexShrink: 0 }}>
          Open
        </button>
      )}
    </div>
  )
}

export default function AdminDashboard({ admin }) {
  const {
    health, matches, users, leagues, settings, saving, setSaving, setActionResult,
    syncScoresNow, prepopulateMatchIds, recalcAllPoints, loadAll, callAdminFunction,
    setPrimarySection, setActiveTab, supabase,
  } = admin

  const [runningChecks, setRunningChecks] = useState(true)
  const [audit, setAudit] = useState({
    unscoredPredictions: 0,
    standingsRows: null,
    incompleteKoPicks: 0,
    queryErrors: [],
    checkedAt: null,
  })

  const runDiagnostics = async () => {
    setRunningChecks(true)
    const queryErrors = []
    const completedIds = (matches || []).filter(m => m.status === 'completed').map(m => m.id)

    let unscoredPredictions = 0
    if (completedIds.length) {
      const { count, error } = await supabase
        .from('predictions')
        .select('id', { count: 'exact', head: true })
        .in('match_id', completedIds)
        .not('home_score', 'is', null)
        .not('away_score', 'is', null)
        .is('points_awarded', null)
      if (error) queryErrors.push(`Prediction points check: ${error.message}`)
      else unscoredPredictions = count || 0
    }

    const standingsRes = await supabase.from('group_standings').select('id', { count: 'exact', head: true })
    if (standingsRes.error) queryErrors.push(`Standings check: ${standingsRes.error.message}`)

    const koRes = await supabase
      .from('knockout_picks')
      .select('id', { count: 'exact', head: true })
      .is('winner_team_id', null)
    if (koRes.error) queryErrors.push(`Bracket picks check: ${koRes.error.message}`)

    setAudit({
      unscoredPredictions,
      standingsRows: standingsRes.error ? null : (standingsRes.count || 0),
      incompleteKoPicks: koRes.error ? 0 : (koRes.count || 0),
      queryErrors,
      checkedAt: new Date(),
    })
    setRunningChecks(false)
  }

  useEffect(() => {
    runDiagnostics()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- diagnostics intentionally rerun only when aggregate inputs change
  }, [matches?.length, health?.completedMatches])

  const metrics = useMemo(() => {
    const all = matches || []
    const groups = all.filter(m => m.stage === 'group')
    const knockouts = all.filter(m => m.stage && m.stage !== 'group')
    const missingCore = all.filter(m => !m.match_number || !m.stage || !m.kickoff_time)
    const missingVenue = all.filter(m => !m.venue_id && !m.venue?.id)
    const groupMissingTeams = groups.filter(m => !m.home_team_id || !m.away_team_id)
    const unresolvedKo = knockouts.filter(m => !m.home_team_id || !m.away_team_id)
    const koResolutionDeadline = Date.now() + 12 * 60 * 60 * 1000
    const unresolvedKoDue = unresolvedKo.filter(m => {
      const kickoff = m.kickoff_time ? new Date(m.kickoff_time).getTime() : 0
      return kickoff && kickoff <= koResolutionDeadline
    })
    const completedMissingScore = all.filter(m => m.status === 'completed' && (m.home_score == null || m.away_score == null))
    const liveMissingMinute = all.filter(m => m.status === 'live' && m.live_minute == null)
    const apiMissingIds = all.filter(m => !m.external_match_id && !m.use_manual_override)
    const staleLive = health?.liveMatches > 0 && (!health?.syncOk || health?.syncAge == null)

    return {
      all, groups, knockouts, missingCore, missingVenue, groupMissingTeams,
      unresolvedKo, unresolvedKoDue, completedMissingScore, liveMissingMinute, apiMissingIds, staleLive,
    }
  }, [matches, health])

  const checks = useMemo(() => {
    const totalOk = metrics.all.length === 104
    const groupOk = metrics.groups.length === 72
    const koOk = metrics.knockouts.length === 32
    const fixtureIssues = metrics.missingCore.length + metrics.missingVenue.length + metrics.groupMissingTeams.length
    const syncStatus = metrics.staleLive ? 'error' : health?.syncOk ? 'ok' : 'warning'

    return [
      {
        icon: '⚽', title: 'Tournament fixtures', value: `${metrics.all.length}/104`,
        status: totalOk && groupOk && koOk ? 'ok' : 'error',
        detail: `${metrics.groups.length}/72 group matches and ${metrics.knockouts.length}/32 knockout matches are present.`,
        action: 'matches', actionLabel: 'Open matches →',
      },
      {
        icon: '🧩', title: 'Fixture completeness', value: fixtureIssues,
        status: fixtureIssues === 0 ? 'ok' : metrics.missingCore.length || metrics.groupMissingTeams.length ? 'error' : 'warning',
        detail: `${metrics.missingCore.length} missing core details · ${metrics.missingVenue.length} without venue · ${metrics.groupMissingTeams.length} group fixtures missing teams.`,
        action: 'matches', actionLabel: 'Review fixtures →',
      },
      {
        icon: '🔄', title: 'Live score sync', value: health?.syncAge == null ? '—' : `${health.syncAge}m`,
        status: syncStatus,
        detail: metrics.staleLive
          ? `${health?.liveMatches || 0} live match(es), but the last successful sync is stale or unavailable.`
          : `Last successful sync: ${compactDate(health?.lastSync)}.`,
      },
      {
        icon: '🎯', title: 'Prediction scoring', value: runningChecks ? '…' : audit.unscoredPredictions,
        status: runningChecks ? 'info' : audit.unscoredPredictions === 0 ? 'ok' : 'error',
        detail: runningChecks ? 'Checking completed matches for predictions without awarded points.' : `${audit.unscoredPredictions} saved prediction(s) on completed matches still have no points value.`,
        action: audit.unscoredPredictions ? 'points' : null, actionLabel: 'Open points →',
      },
      {
        icon: '📊', title: 'Group standings', value: runningChecks ? '…' : (audit.standingsRows ?? '—'),
        status: runningChecks ? 'info' : audit.standingsRows === 48 ? 'ok' : audit.standingsRows == null ? 'error' : 'warning',
        detail: audit.standingsRows == null ? 'The standings table could not be checked.' : `${audit.standingsRows}/48 team rows are currently stored.`,
      },
      {
        icon: '🏆', title: 'Knockout readiness', value: metrics.unresolvedKo.length,
        status: metrics.knockouts.length !== 32
          ? 'error'
          : metrics.unresolvedKoDue.length
            ? 'warning'
            : metrics.unresolvedKo.length
              ? 'progress'
              : 'ok',
        detail: metrics.knockouts.length !== 32
          ? `${metrics.knockouts.length}/32 knockout fixtures are present.`
          : metrics.unresolvedKoDue.length
            ? `${metrics.unresolvedKoDue.length} unresolved knockout fixture(s) kick off within 12 hours and should be checked.`
            : metrics.unresolvedKo.length
              ? `${metrics.unresolvedKo.length} fixture(s) are awaiting qualifiers. This is expected tournament progress.`
              : 'Every knockout fixture currently has both real teams assigned.',
        action: metrics.unresolvedKo.length ? { area: 'matches', filter: 'unresolved-ko' } : null,
        actionLabel: 'View knockout fixtures →',
      },
      {
        icon: '👥', title: 'Users and leagues', value: `${users?.length || health?.totalUsers || 0}`,
        status: 'info',
        detail: `${users?.length || health?.totalUsers || 0} loaded users · ${leagues?.length || 0} leagues available to administer.`,
        action: 'users', actionLabel: 'Open users →',
      },
      {
        icon: '🛡️', title: 'Diagnostic queries', value: runningChecks ? '…' : audit.queryErrors.length,
        status: runningChecks ? 'info' : audit.queryErrors.length === 0 ? 'ok' : 'error',
        detail: audit.queryErrors.length ? audit.queryErrors[0] : 'Health checks completed without a Supabase schema/query error.',
      },
    ]
  }, [metrics, health, audit, runningChecks, users, leagues])

  const issues = useMemo(() => {
    const list = []
    if (metrics.completedMissingScore.length) list.push({ status: 'error', title: `${metrics.completedMissingScore.length} completed match(es) have no complete score`, detail: 'A completed match must have both home and away scores before points can be trusted.', action: { area: 'matches', filter: 'completed-missing-score' } })
    if (metrics.liveMissingMinute.length) list.push({ status: 'warning', title: `${metrics.liveMissingMinute.length} live match(es) have no minute`, detail: 'The score can still update, but the live display will show LIVE rather than the match minute.', action: { area: 'matches', filter: 'live-missing-minute' } })
    if (metrics.missingVenue.length) list.push({ status: 'warning', title: `${metrics.missingVenue.length} fixture(s) have no venue`, detail: 'Venue and city are required for consistent fixture cards and kickoff weather.', action: { area: 'matches', filter: 'missing-venue' } })
    if (metrics.apiMissingIds.length) list.push({ status: 'warning', title: `${metrics.apiMissingIds.length} API-managed fixture(s) have no external match ID`, detail: 'Name/time matching may still work, but a stored provider ID is more reliable.', action: { area: 'matches', filter: 'missing-external-id' } })
    if (audit.unscoredPredictions) list.push({ status: 'error', title: `${audit.unscoredPredictions} prediction(s) need scoring`, detail: 'Run a safe full points recalculation after confirming completed match results.', action: 'points' })
    if (audit.queryErrors.length) list.push({ status: 'error', title: 'A health query failed', detail: audit.queryErrors.join(' · '), action: 'tournament' })
    if (!list.length) list.push({ status: 'ok', title: 'No urgent data issues detected', detail: 'Fixtures, live sync and scoring checks currently look healthy.' })
    return list
  }, [metrics, audit])

  const overallStatus = checks.some(c => c.status === 'error') ? 'error' : checks.some(c => c.status === 'warning') ? 'warning' : 'ok'
  const overallMeta = STATUS_META[overallStatus]

  const openArea = target => {
    const key = typeof target === 'string' ? target : target?.area
    const filter = typeof target === 'object' ? target?.filter : null
    if (filter && typeof window !== 'undefined') {
      window.sessionStorage.setItem('wc26_admin_match_health_filter', filter)
    }
    if (key === 'matches') { setPrimarySection?.('matches'); setActiveTab?.('matches') }
    else if (key === 'users') { setPrimarySection?.('users'); setActiveTab?.('users') }
    else if (key === 'points') { setPrimarySection?.('users'); setActiveTab?.('points') }
    else if (key === 'tournament') { setPrimarySection?.('tournament'); setActiveTab?.('settings') }
  }

  const syncStandings = async () => {
    setSaving(prev => ({ ...prev, standings: true }))
    try {
      const data = await callAdminFunction('/.netlify/functions/sync-standings', { method: 'POST' })
      setActionResult(`✅ Standings synced: ${data.updated || 0} rows updated, ${data.skipped || 0} skipped${data.note ? ` · ${data.note}` : ''}`)
      await loadAll()
      await runDiagnostics()
    } catch (error) {
      setActionResult(`❌ Standings sync failed: ${error.message}`)
    } finally {
      setSaving(prev => ({ ...prev, standings: false }))
    }
  }

  const refreshEverything = async () => {
    setRunningChecks(true)
    await loadAll()
    await runDiagnostics()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <section style={{
        borderRadius: '20px', padding: '20px', color: 'white',
        background: 'linear-gradient(135deg, var(--scottish-navy), #1558b0)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', width: '210px', height: '210px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', right: '-75px', top: '-95px' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.64)' }}>Admin site health</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'flex-end', marginTop: '7px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '25px', lineHeight: 1.1 }}>Tournament control status</h2>
              <p style={{ margin: '7px 0 0', fontSize: '11px', lineHeight: 1.45, color: 'rgba(255,255,255,0.72)', maxWidth: '620px' }}>
                Automated checks across fixtures, live syncing, standings, scoring and knockout readiness.
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: overallStatus === 'ok' ? '#63e6a0' : overallStatus === 'warning' ? '#ffd166' : '#ff8a80' }}>{overallMeta.icon}</div>
              <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{overallMeta.label}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '15px' }}>
            <span style={{ padding: '6px 9px', borderRadius: '999px', background: 'rgba(255,255,255,0.10)', fontSize: '10px', fontWeight: 800 }}>{health?.liveMatches || 0} live</span>
            <span style={{ padding: '6px 9px', borderRadius: '999px', background: 'rgba(255,255,255,0.10)', fontSize: '10px', fontWeight: 800 }}>{health?.completedMatches || 0} completed</span>
            <span style={{ padding: '6px 9px', borderRadius: '999px', background: 'rgba(255,255,255,0.10)', fontSize: '10px', fontWeight: 800 }}>Checked {compactDate(audit.checkedAt)}</span>
          </div>
        </div>
      </section>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '9px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 900 }}>System checks</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Green is healthy, amber is worth reviewing and red needs action.</div>
          </div>
          <button onClick={refreshEverything} disabled={runningChecks} className="btn btn-sm" style={{ flexShrink: 0 }}>
            {runningChecks ? 'Checking…' : '↻ Run checks'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '10px' }}>
          {checks.map(check => <CheckCard key={check.title} check={check} onOpen={openArea} />)}
        </div>
      </section>

      <section className="card" style={{ padding: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 900 }}>Attention queue</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>The most useful issues to investigate first.</div>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '15px' }}>{issues.filter(i => i.status !== 'ok').length}</span>
        </div>
        <div>{issues.map((issue, index) => <IssueRow key={`${issue.title}-${index}`} issue={issue} onOpen={openArea} />)}</div>
      </section>

      <section className="card" style={{ padding: '15px' }}>
        <div style={{ fontSize: '14px', fontWeight: 900, marginBottom: '10px' }}>Safe quick actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '8px' }}>
          <button onClick={syncScoresNow} disabled={saving.sync} className="btn btn-primary">
            {saving.sync ? 'Syncing scores…' : '🔄 Sync scores'}
          </button>
          <button onClick={syncStandings} disabled={saving.standings} className="btn btn-secondary">
            {saving.standings ? 'Syncing standings…' : '📊 Sync standings'}
          </button>
          <button onClick={recalcAllPoints} disabled={saving.recalc} className="btn btn-secondary">
            {saving.recalc ? 'Recalculating…' : '🎯 Recalculate points'}
          </button>
          <button onClick={refreshEverything} disabled={runningChecks} className="btn btn-secondary">
            {runningChecks ? 'Refreshing…' : '↻ Refresh all data'}
          </button>
        </div>
        <details style={{ marginTop: '10px' }}>
          <summary style={{ cursor: 'pointer', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>Maintenance tools</summary>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '8px', marginTop: '9px' }}>
            <button onClick={prepopulateMatchIds} disabled={saving.prepopulate} className="btn btn-secondary">
              {saving.prepopulate ? 'Running…' : '🔗 Populate API match IDs'}
            </button>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
            Maintenance actions are kept separate because they should not normally be needed during routine matchday administration.
          </div>
        </details>
      </section>

      <section className="card" style={{ padding: '15px' }}>
        <div style={{ fontSize: '14px', fontWeight: 900, marginBottom: '9px' }}>Live operations</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px' }}>
          {[
            ['Last score sync', compactDate(health?.lastSync)],
            ['Sync age', health?.syncAge == null ? 'Unknown' : `${health.syncAge} minutes`],
            ['Live API', settings?.live_api_enabled === 'true' ? 'Enabled' : 'Disabled'],
            ['Points maintenance', settings?.points_maintenance === 'true' ? 'Active' : 'Off'],
          ].map(([label, value]) => (
            <div key={label} style={{ padding: '11px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 900 }}>{label}</div>
              <div style={{ fontSize: '13px', fontWeight: 900, marginTop: '4px' }}>{value}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
