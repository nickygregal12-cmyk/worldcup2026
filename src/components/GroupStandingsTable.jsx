/**
 * Shared group standings table component
 * Used in Predictions (single group + all-groups By Date view) and Knockout page
 * Consistent layout: # | Flag | Team | P | Pts (bold) | GD
 */

// Standard row layout constants
const COL = {
  rank:  { width: '16px' },
  flag:  { fontSize: '18px' },
  name:  { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  p:     { width: '16px', textAlign: 'center' },
  pts:   { width: '28px', textAlign: 'center' },
  gd:    { width: '30px', textAlign: 'right' },
}

export function StandingsRow({ entry, position, qualifies, qualifies3rd, dimmed }) {
  const bg = qualifies
    ? 'var(--accent-green-light)'
    : qualifies3rd
    ? 'var(--accent-gold-light)'
    : dimmed
    ? 'transparent'
    : 'var(--bg-secondary)'

  const border = qualifies
    ? '1px solid rgba(0,122,51,0.15)'
    : qualifies3rd
    ? '1px solid rgba(184,134,11,0.2)'
    : '1px solid transparent'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '6px 8px', borderRadius: 'var(--radius-sm)', marginBottom: '2px',
      background: bg, border,
    }}>
      <span style={{ ...COL.rank, fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>
        {position}
      </span>
      <span style={COL.flag}>{entry.team?.flag_emoji}</span>
      <span style={{ ...COL.name, fontSize: '12px', fontWeight: '600' }}>
        {entry.team?.short_code || entry.team?.name}
      </span>
      <span style={{ ...COL.p, fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        {entry.played ?? '–'}
      </span>
      {/* Pts — large and bold, clearly the main number */}
      <span style={{ ...COL.pts, fontSize: '15px', fontWeight: '900', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
        {entry.pts}
      </span>
      <span style={{ ...COL.gd, fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        {entry.gd > 0 ? '+' : ''}{entry.gd}
      </span>
    </div>
  )
}

export function StandingsHeader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px 5px', borderBottom: '1px solid var(--border-light)', marginBottom: '4px' }}>
      <span style={{ ...COL.rank, fontSize: '10px', color: 'var(--text-muted)' }}>#</span>
      <span style={{ fontSize: '10px', color: 'var(--text-muted)', flex: 1 }}>Team</span>
      <span style={{ ...COL.p, fontSize: '10px', color: 'var(--text-muted)' }}>P</span>
      <span style={{ ...COL.pts, fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>Pts</span>
      <span style={{ ...COL.gd, fontSize: '10px', color: 'var(--text-muted)' }}>GD</span>
    </div>
  )
}

export function StandingsLegend({ allPredicted, labelAll = false }) {
  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-light)', fontSize: '10px', color: 'var(--text-muted)' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} />
        Advances
      </span>
      {allPredicted ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-gold)', display: 'inline-block' }} />
          {labelAll ? 'Best 3rd (top 8 qualify)' : 'Possible 3rd'}
        </span>
      ) : (
        <span style={{ fontStyle: 'italic' }}>Predict all 6 games to see 3rd place</span>
      )}
    </div>
  )
}
