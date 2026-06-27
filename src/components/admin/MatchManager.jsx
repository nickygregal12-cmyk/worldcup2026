export default function MatchManager({ admin }) {
  const {
    matches, filteredMatches, matchSearch, setMatchSearch,
    matchStatusFilter, setMatchStatusFilter, stageFilter, setStageFilter,
    setFixtureEditorMatch, editingMatch, setEditingMatch, scores, setScores,
    saving, saveMatchResult, setMatchLive, resetMatchOverride, loadMatches, fmt,
    setActionResult,
  } = admin

  const stageOptions = [
    ['all', 'All stages'], ['group', 'Groups'], ['r32', 'R32'], ['r16', 'R16'],
    ['qf', 'QF'], ['sf', 'SF'], ['3rd', '3rd'], ['final', 'Final'],
  ]

  return (
    <div>
      <div className="card" style={{ padding: '14px', marginBottom: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(150px,220px)', gap: '8px' }}>
          <input className="input" value={matchSearch} onChange={e => setMatchSearch(e.target.value)} placeholder="Search match, team, stadium or city…" />
          <select className="input" value={matchStatusFilter} onChange={e => setMatchStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="live">Live</option>
            <option value="completed">Completed</option>
            <option value="postponed">Postponed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
          {stageOptions.map(([value, label]) => (
            <button key={value} onClick={() => setStageFilter(value)} className="btn btn-sm" style={{
              background: stageFilter === value ? 'var(--scottish-navy)' : 'var(--bg-card)',
              color: stageFilter === value ? 'white' : 'var(--text-secondary)',
              border: '1px solid var(--border-light)',
            }}>{label}</button>
          ))}
          <button onClick={loadMatches} className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}>↻ Refresh</button>
        </div>
      </div>

      <div style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 2px 10px' }}>
        Showing {filteredMatches.length} of {matches.length} fixtures
      </div>

      {!matches.length ? (
        <div className="card" style={{ textAlign: 'center', padding: '30px 18px' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚠️</div>
          <div style={{ fontWeight: 900, marginBottom: '5px' }}>Fixtures did not load</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            The fixture query is now isolated from venue fields, so a venue schema change cannot blank this screen.
          </div>
          <button className="btn btn-primary" onClick={loadMatches}>Retry loading fixtures</button>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '28px 18px', color: 'var(--text-muted)' }}>
          No fixtures match the selected filters.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '10px' }}>
          {filteredMatches.map(match => {
            const isEditing = editingMatch === match.id
            const s = scores[match.id] || { home: match.home_score ?? '', away: match.away_score ?? '' }
            const venueName = match.venue?.name || match.venue?.stadium_name || match.venue?.city || 'Venue not set'
            return (
              <div key={match.id} className="card" style={{ padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                      Match {match.match_number} · {match.stage === 'group' ? `Group ${match.group?.name || '—'}` : match.stage?.toUpperCase()}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{fmt(match.kickoff_time)} · {venueName}</div>
                  </div>
                  <span className={`badge ${match.status === 'completed' ? 'badge-green' : match.status === 'live' ? 'badge-red' : 'badge-gray'}`}>{match.status}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '10px', alignItems: 'center', padding: '14px 0 12px' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px' }}>{match.home_team?.flag_emoji || '🏳️'}</div><b style={{ fontSize: '13px' }}>{match.home_team?.short_code || 'TBC'}</b></div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '20px' }}>
                    {['live','completed'].includes(match.status) ? `${match.home_score ?? 0}–${match.away_score ?? 0}` : 'vs'}
                  </div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px' }}>{match.away_team?.flag_emoji || '🏳️'}</div><b style={{ fontSize: '13px' }}>{match.away_team?.short_code || 'TBC'}</b></div>
                </div>

                {isEditing && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '10px', marginBottom: '10px' }}>
                    <input className="input" type="number" min="0" max="30" value={s.home} onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...s, home: e.target.value } }))} style={{ width: '72px', textAlign: 'center', fontWeight: 900 }} />
                    <span>–</span>
                    <input className="input" type="number" min="0" max="30" value={s.away} onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...s, away: e.target.value } }))} style={{ width: '72px', textAlign: 'center', fontWeight: 900 }} />
                    <button className="btn btn-primary btn-sm" disabled={saving[match.id]} onClick={() => saveMatchResult(match)}>Save result</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingMatch(null)}>Cancel</button>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setFixtureEditorMatch(match)}>Edit match</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setEditingMatch(isEditing ? null : match.id); setScores(prev => ({ ...prev, [match.id]: { home: match.home_score ?? '', away: match.away_score ?? '' } })) }}>{isEditing ? 'Close score' : 'Enter result'}</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setMatchLive(match)}>{match.status === 'live' ? 'Update live' : 'Mark live'}</button>
                  {match.use_manual_override ? <button className="btn btn-secondary btn-sm" onClick={() => resetMatchOverride(match)}>Return to API control</button> : <button className="btn btn-secondary btn-sm" onClick={() => setFixtureEditorMatch(match)}>Set manual control</button>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
