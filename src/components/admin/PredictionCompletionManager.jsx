import { useEffect, useMemo, useState } from 'react'

const STAGE_LABELS = {
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-finals',
  sf: 'Semi-finals',
  '3rd': 'Third-place play-off',
  final: 'Final',
}

const KO_STAGE_ORDER = ['r32', 'r16', 'qf', 'sf', '3rd', 'final']

function statusFor(done, total) {
  if (!done) return 'not_started'
  if (done >= total) return 'complete'
  return 'incomplete'
}

function statusLabel(status) {
  if (status === 'complete') return 'Complete'
  if (status === 'incomplete') return 'Incomplete'
  return 'Not started'
}

function statusColours(status) {
  if (status === 'complete') return { bg: 'rgba(0,122,51,0.10)', fg: 'var(--accent-green)' }
  if (status === 'incomplete') return { bg: 'rgba(245,158,11,0.12)', fg: '#a16207' }
  return { bg: 'var(--bg-secondary)', fg: 'var(--text-muted)' }
}

function SummaryCard({ title, complete, incomplete, notStarted, totalUsers, subtitle }) {
  return (
    <div className="card" style={{ padding: '16px', minWidth: 0 }}>
      <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '7px' }}>
        <span style={{ fontSize: '27px', lineHeight: 1, fontWeight: 900, color: 'var(--accent-green)' }}>{complete}</span>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 700 }}>/ {totalUsers} complete</span>
      </div>
      {subtitle && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>{subtitle}</div>}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
        <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '4px 8px', borderRadius: '999px', background: 'rgba(245,158,11,0.12)', color: '#a16207' }}>{incomplete} incomplete</span>
        <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '4px 8px', borderRadius: '999px', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>{notStarted} not started</span>
      </div>
    </div>
  )
}

export default function PredictionCompletionManager({ admin }) {
  const { supabase, setEditingUserPreds, loadUserPredictions, setActionResult } = admin
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [targets, setTargets] = useState({ groups: 72, bracket: 31, ko: {} })
  const [search, setSearch] = useState('')
  const [area, setArea] = useState('all')
  const [status, setStatus] = useState('all')
  const [includeBanned, setIncludeBanned] = useState(false)

  const fetchAll = async (table, select, apply = query => query) => {
    const output = []
    for (let from = 0; ; from += 1000) {
      const query = apply(supabase.from(table).select(select).range(from, from + 999))
      const { data, error } = await query
      if (error) throw error
      output.push(...(data || []))
      if (!data || data.length < 1000) break
    }
    return output
  }

  const loadCompletion = async () => {
    setLoading(true)
    try {
      const [profiles, matches, groupPredictions, bracketPicks, koPredictions] = await Promise.all([
        fetchAll('profiles', 'id,username,display_name,email,is_banned,created_at'),
        fetchAll('matches', 'id,match_number,stage,home_team_id,away_team_id'),
        fetchAll('predictions', 'user_id,match_id,home_score,away_score'),
        fetchAll('knockout_picks', 'user_id,match_number,winner_team_id'),
        fetchAll('ko_predictions', 'user_id,match_id,home_score,away_score,outcome_type,winner_team_id,first_goal_band'),
      ])

      const groupMatchIds = new Set(matches.filter(m => m.stage === 'group').map(m => m.id))
      const mainBracketNumbers = new Set(
        matches
          .filter(m => m.stage !== 'group' && m.stage !== '3rd')
          .map(m => Number(m.match_number))
          .filter(Number.isFinite)
      )
      const koMatchStage = new Map(matches.filter(m => m.stage !== 'group').map(m => [m.id, m.stage]))
      const koTargets = {}
      KO_STAGE_ORDER.forEach(stageKey => {
        koTargets[stageKey] = matches.filter(m => m.stage === stageKey).length
      })

      const groupByUser = {}
      groupPredictions.forEach(p => {
        if (!groupMatchIds.has(p.match_id) || p.home_score == null || p.away_score == null) return
        if (!groupByUser[p.user_id]) groupByUser[p.user_id] = new Set()
        groupByUser[p.user_id].add(p.match_id)
      })

      const bracketByUser = {}
      bracketPicks.forEach(p => {
        const matchNumber = Number(p.match_number)
        if (!mainBracketNumbers.has(matchNumber) || !p.winner_team_id) return
        if (!bracketByUser[p.user_id]) bracketByUser[p.user_id] = new Set()
        bracketByUser[p.user_id].add(matchNumber)
      })

      const koByUser = {}
      koPredictions.forEach(p => {
        const stageKey = koMatchStage.get(p.match_id)
        if (!stageKey || p.home_score == null || p.away_score == null) return
        if (!koByUser[p.user_id]) koByUser[p.user_id] = {}
        if (!koByUser[p.user_id][stageKey]) koByUser[p.user_id][stageKey] = new Set()
        koByUser[p.user_id][stageKey].add(p.match_id)
      })

      const groupTarget = groupMatchIds.size || 72
      const bracketTarget = mainBracketNumbers.size || 31

      const nextRows = profiles.map(profile => {
        const groupDone = groupByUser[profile.id]?.size || 0
        const bracketDone = bracketByUser[profile.id]?.size || 0
        const koStages = {}
        KO_STAGE_ORDER.forEach(stageKey => {
          const total = koTargets[stageKey] || 0
          const done = koByUser[profile.id]?.[stageKey]?.size || 0
          koStages[stageKey] = {
            done,
            total,
            missing: Math.max(0, total - done),
            status: total > 0 ? statusFor(done, total) : 'not_started',
          }
        })
        const koTotal = Object.values(koStages).reduce((sum, item) => sum + item.total, 0)
        const koDone = Object.values(koStages).reduce((sum, item) => sum + item.done, 0)
        return {
          ...profile,
          groups: { done: groupDone, total: groupTarget, missing: Math.max(0, groupTarget - groupDone), status: statusFor(groupDone, groupTarget) },
          bracket: { done: bracketDone, total: bracketTarget, missing: Math.max(0, bracketTarget - bracketDone), status: statusFor(bracketDone, bracketTarget) },
          ko: { done: koDone, total: koTotal, missing: Math.max(0, koTotal - koDone), status: statusFor(koDone, koTotal), stages: koStages },
        }
      }).sort((a, b) => String(a.display_name || a.username || '').localeCompare(String(b.display_name || b.username || '')))

      setTargets({ groups: groupTarget, bracket: bracketTarget, ko: koTargets })
      setRows(nextRows)
      setActionResult(`Prediction completion loaded for ${nextRows.length} users.`)
    } catch (error) {
      console.error('Prediction completion load failed:', error)
      setActionResult(`Prediction completion failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCompletion() }, [])

  const relevantStatus = row => {
    if (area === 'groups') return row.groups.status
    if (area === 'bracket') return row.bracket.status
    if (area.startsWith('ko:')) return row.ko.stages[area.split(':')[1]]?.status || 'not_started'
    if (area === 'ko') return row.ko.status
    if ([row.groups.status, row.bracket.status, row.ko.status].includes('incomplete')) return 'incomplete'
    if ([row.groups.status, row.bracket.status, row.ko.status].every(value => value === 'complete')) return 'complete'
    return 'not_started'
  }

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter(row => {
      if (!includeBanned && row.is_banned) return false
      if (term && ![row.display_name, row.username, row.email].some(value => String(value || '').toLowerCase().includes(term))) return false
      if (status !== 'all' && relevantStatus(row) !== status) return false
      return true
    })
  }, [rows, search, status, area, includeBanned])

  const activeUsers = rows.filter(row => includeBanned || !row.is_banned)
  const summaryFor = getter => {
    const values = activeUsers.map(getter)
    return {
      complete: values.filter(item => item?.status === 'complete').length,
      incomplete: values.filter(item => item?.status === 'incomplete').length,
      notStarted: values.filter(item => item?.status === 'not_started').length,
    }
  }

  const groupsSummary = summaryFor(row => row.groups)
  const bracketSummary = summaryFor(row => row.bracket)
  const koSummary = summaryFor(row => row.ko)

  const openUser = row => {
    setEditingUserPreds(row.id)
    loadUserPredictions(row.id)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '52px' }}><div className="spinner" /></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 900 }}>Prediction completion</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>See who has completed each competition and exactly how many picks are missing.</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadCompletion}>↻ Refresh</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: '10px', marginBottom: '14px' }}>
        <SummaryCard title="Group matches" {...groupsSummary} totalUsers={activeUsers.length} subtitle={`${targets.groups} required per user`} />
        <SummaryCard title="Tournament bracket" {...bracketSummary} totalUsers={activeUsers.length} subtitle={`${targets.bracket} winner picks required`} />
        <SummaryCard title="KO Predictor · all stages" {...koSummary} totalUsers={activeUsers.length} subtitle={`${Object.values(targets.ko).reduce((a, b) => a + b, 0)} score picks across the tournament`} />
      </div>

      <div className="card" style={{ padding: '14px', marginBottom: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px,1fr) repeat(2,minmax(150px,auto))', gap: '8px' }}>
          <input className="input" placeholder="Search name, username or email…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input" value={area} onChange={e => setArea(e.target.value)}>
            <option value="all">All competitions</option>
            <option value="groups">Group matches</option>
            <option value="bracket">Tournament bracket</option>
            <option value="ko">KO Predictor · total</option>
            {KO_STAGE_ORDER.map(stageKey => <option key={stageKey} value={`ko:${stageKey}`}>KO Predictor · {STAGE_LABELS[stageKey]}</option>)}
          </select>
          <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="complete">Complete</option>
            <option value="incomplete">Incomplete</option>
            <option value="not_started">Not started</option>
          </select>
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <input type="checkbox" checked={includeBanned} onChange={e => setIncludeBanned(e.target.checked)} /> Include banned users
        </label>
      </div>

      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '9px' }}>{visibleRows.length} users shown</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
        {visibleRows.map(row => (
          <div key={row.id} className="card" style={{ padding: '14px', opacity: row.is_banned ? 0.65 : 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '10px', alignItems: 'start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.display_name || row.username} <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>@{row.username}</span></div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{row.email || 'No email shown'}{row.is_banned ? ' · Banned' : ''}</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => openUser(row)}>Inspect</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '8px', marginTop: '12px' }}>
              {[['Groups', row.groups], ['Bracket', row.bracket], ['KO Predictor', row.ko]].map(([label, item]) => {
                const colours = statusColours(item.status)
                return (
                  <div key={label} style={{ padding: '10px 11px', borderRadius: '10px', background: colours.bg, border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 900, color: 'var(--text-muted)' }}>{label}</span>
                      <span style={{ fontSize: '10px', fontWeight: 900, color: colours.fg }}>{statusLabel(item.status)}</span>
                    </div>
                    <div style={{ marginTop: '5px', fontSize: '16px', fontWeight: 900 }}>{item.done}/{item.total}</div>
                    <div style={{ fontSize: '10.5px', color: item.missing ? '#b3261e' : 'var(--accent-green)', fontWeight: 700 }}>{item.missing ? `${item.missing} missing` : 'All saved'}</div>
                  </div>
                )
              })}
            </div>

            <details style={{ marginTop: '10px' }}>
              <summary style={{ cursor: 'pointer', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>KO Predictor stage breakdown</summary>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: '7px', marginTop: '9px' }}>
                {KO_STAGE_ORDER.map(stageKey => {
                  const item = row.ko.stages[stageKey]
                  const colours = statusColours(item.status)
                  return (
                    <div key={stageKey} style={{ padding: '8px 9px', borderRadius: '9px', background: colours.bg }}>
                      <div style={{ fontSize: '10px', fontWeight: 900, color: colours.fg }}>{STAGE_LABELS[stageKey]}</div>
                      <div style={{ fontSize: '12px', fontWeight: 800, marginTop: '3px' }}>{item.done}/{item.total}{item.missing ? ` · ${item.missing} missing` : ''}</div>
                    </div>
                  )
                })}
              </div>
            </details>
          </div>
        ))}
      </div>
    </div>
  )
}
