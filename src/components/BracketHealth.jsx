import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { ALL_STAGES, getMD1LockTime } from '../lib/bracketUtils.js'

/**
 * BracketHealth — admin card showing which users have incomplete
 * main-bracket picks (knockout_picks), split into:
 *   • FILLABLE gaps — feeding groups haven't kicked off yet (chase these!)
 *   • LOST slots    — frozen empty when their feeding group kicked off
 *
 * Mirrors the progressive lock logic in Knockout.jsx:
 *  - R32 slots freeze when ANY match in a feeding group kicks off
 *  - W-slot matches (R16+) effectively freeze at the MD1 full lock
 *  - Any match freezes at its own kickoff
 */

const TOTAL_PICKS = ALL_STAGES.reduce((n, s) => n + (s.matches?.length || 0), 0) // 31

const STAGE_SHORT = { r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', final: 'Final' }

function slotGroups(slot) {
  if (!slot) return []
  const direct = slot.match(/^[123]([A-L])$/)
  if (direct) return [direct[1]]
  const bt3 = slot.match(/^BT3_([A-L]+)$/)
  if (bt3) return bt3[1].split('')
  return []
}

function fmtFreeze(date) {
  if (!date) return ''
  return date.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function BracketHealth() {
  const [loading, setLoading] = useState(true)
  const [picks, setPicks] = useState([])          // [{user_id, match_number}]
  const [profiles, setProfiles] = useState([])    // [{id, username, is_banned}]
  const [groupMatches, setGroupMatches] = useState([]) // shaped for getMD1LockTime
  const [expanded, setExpanded] = useState(null)
  const [copied, setCopied] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const load = async () => {
    setLoading(true)
    const [pickRes, profRes, matchRes, groupRes] = await Promise.all([
      supabase.from('knockout_picks').select('user_id, match_number'),
      supabase.from('profiles').select('id, username, is_banned'),
      supabase.from('matches').select('kickoff_time, group_id, stage').eq('stage', 'group'),
      supabase.from('groups').select('id, name'),
    ])
    const groupMap = {}
    ;(groupRes.data || []).forEach(g => { groupMap[g.id] = g.name })
    setPicks(pickRes.data || [])
    setProfiles((profRes.data || []).filter(p => !p.is_banned))
    setGroupMatches((matchRes.data || []).map(m => ({
      kickoff_time: m.kickoff_time,
      group: { name: groupMap[m.group_id] || null },
    })))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Classify every matchDef: { match_number, stage, frozen, freezeAt }
  const slotInfo = useMemo(() => {
    if (!groupMatches.length) return {}
    const now = new Date()
    const md1Lock = getMD1LockTime(groupMatches)

    // earliest kickoff per group (= when its slots freeze)
    const groupFirstKickoff = {}
    groupMatches.forEach(m => {
      const g = m.group?.name
      if (!g || !m.kickoff_time) return
      const k = new Date(m.kickoff_time)
      if (!groupFirstKickoff[g] || k < groupFirstKickoff[g]) groupFirstKickoff[g] = k
    })

    const info = {}
    ALL_STAGES.forEach(stage => {
      (stage.matches || []).forEach(def => {
        const feeding = [...slotGroups(def.home_slot), ...slotGroups(def.away_slot)]
        let freezeAt
        if (feeding.length) {
          // R32-style: freezes at the FIRST kickoff among feeding groups
          const times = feeding.map(g => groupFirstKickoff[g]).filter(Boolean)
          freezeAt = times.length ? new Date(Math.min(...times.map(d => d.getTime()))) : md1Lock
        } else {
          // W-slot match: effectively freezes at the MD1 full lock
          freezeAt = md1Lock
        }
        const ownKick = new Date(def.kickoff)
        if (ownKick < freezeAt) freezeAt = ownKick
        info[def.match_number] = {
          match_number: def.match_number,
          stage: stage.key,
          frozen: now >= freezeAt,
          freezeAt,
        }
      })
    })
    return info
  }, [groupMatches])

  // Per-user gap analysis
  const analysis = useMemo(() => {
    const allDefs = Object.values(slotInfo)
    if (!allDefs.length || !profiles.length) return null
    const pickSet = new Set(picks.map(p => `${p.user_id}:${p.match_number}`))

    const rows = profiles.map(u => {
      const missing = allDefs.filter(d => !pickSet.has(`${u.id}:${d.match_number}`))
      const fillable = missing.filter(d => !d.frozen)
      const lost = missing.filter(d => d.frozen)
      return { ...u, missing, fillable, lost, total: TOTAL_PICKS - missing.length }
    })

    const incomplete = rows
      .filter(r => r.missing.length > 0)
      .sort((a, b) => b.fillable.length - a.fillable.length || b.lost.length - a.lost.length)

    return {
      complete: rows.length - incomplete.length,
      totalUsers: rows.length,
      incomplete,
      chaseable: incomplete.filter(r => r.fillable.length > 0),
    }
  }, [slotInfo, picks, profiles])

  const md1Lock = useMemo(() => groupMatches.length ? getMD1LockTime(groupMatches) : null, [groupMatches])

  const copyChaseList = async () => {
    if (!analysis) return
    const lines = analysis.chaseable.map(r =>
      `• ${r.username} — ${r.fillable.length === TOTAL_PICKS ? 'no bracket yet!' : `${r.fillable.length} pick${r.fillable.length > 1 ? 's' : ''} to fill`}`
    )
    const text = [
      '⚠️ Bracket check! These brackets still have empty knockout picks — slots lock for good as each group kicks off:',
      ...lines,
      '👉 wc26predictor1.netlify.app — Knockout tab',
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  // Group a user's missing picks by stage for display: "R32 ×3 · QF ×1"
  const summariseMissing = (defs) => {
    const byStage = {}
    defs.forEach(d => { byStage[d.stage] = (byStage[d.stage] || 0) + 1 })
    return ALL_STAGES.map(s => s.key).filter(k => byStage[k]).map(k => `${STAGE_SHORT[k]} ×${byStage[k]}`).join(' · ')
  }

  return (
    <div className="card" style={{ marginBottom: '16px', border: '1px solid var(--scottish-navy-light)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setCollapsed(c => !c)}>
        <div style={{ fontWeight: '700', fontSize: '15px' }}>🩺 Bracket Health</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {analysis && (
            <span className={`badge ${analysis.incomplete.length === 0 ? 'badge-green' : 'badge-gray'}`}>
              {analysis.complete}/{analysis.totalUsers} complete
            </span>
          )}
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{collapsed ? '▸' : '▾'}</span>
        </div>
      </div>

      {!collapsed && (
        <div style={{ marginTop: '12px' }}>
          {loading && <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading bracket data…</div>}

          {!loading && analysis && (
            <>
              {picks.length === 0 && analysis.totalUsers > 0 && (
                <div style={{ fontSize: '12px', color: '#e65100', fontWeight: '600', marginBottom: '10px', padding: '8px 10px', background: 'rgba(230,81,0,0.08)', borderRadius: 'var(--radius-sm)' }}>
                  ⚠️ Zero picks loaded. If users definitely have brackets, an RLS policy on knockout_picks is
                  blocking admin reads — run the policy SQL to fix.
                </div>
              )}
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
                Empty slots freeze <strong>for good</strong> when any match in their feeding group kicks off.
                Full bracket lock: <strong>{md1Lock ? fmtFreeze(md1Lock) : '—'}</strong>.
              </div>

              {analysis.incomplete.length === 0 && (
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-green)' }}>
                  ✅ Every active user has a complete 31-pick bracket
                </div>
              )}

              {analysis.incomplete.length > 0 && (
                <>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <button onClick={copyChaseList} className="btn btn-primary btn-sm"
                      disabled={analysis.chaseable.length === 0}>
                      {copied ? '✅ Copied!' : `📋 Copy chase list (${analysis.chaseable.length})`}
                    </button>
                    <button onClick={load} className="btn btn-secondary btn-sm">🔃 Refresh</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {analysis.incomplete.map(r => (
                      <div key={r.id} style={{
                        padding: '10px 12px', borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-secondary)',
                        border: `1px solid ${r.fillable.length > 0 ? 'rgba(230,81,0,0.4)' : 'var(--border-light)'}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                          onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                          <div style={{ fontWeight: '700', fontSize: '13px' }}>
                            {r.username}
                            {r.total === 0 && <span style={{ marginLeft: '6px', fontSize: '10px', background: '#e53935', color: 'white', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>NO BRACKET</span>}
                          </div>
                          <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: '700' }}>
                            {r.fillable.length > 0 && <span style={{ color: 'var(--accent-orange)' }}>🟠 {r.fillable.length} fillable</span>}
                            {r.fillable.length > 0 && r.lost.length > 0 && <span style={{ color: 'var(--text-muted)' }}> · </span>}
                            {r.lost.length > 0 && <span style={{ color: 'var(--text-muted)' }}>🔒 {r.lost.length} lost</span>}
                          </div>
                        </div>

                        {expanded === r.id && (
                          <div style={{ marginTop: '8px', fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                            {r.fillable.length > 0 && (
                              <div>
                                <strong style={{ color: 'var(--accent-orange)' }}>Still fillable:</strong> {summariseMissing(r.fillable)}
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  Next freeze: {fmtFreeze(new Date(Math.min(...r.fillable.map(d => d.freezeAt.getTime()))))}
                                  {' — '}matches {r.fillable.slice(0, 12).map(d => `#${d.match_number}`).join(', ')}{r.fillable.length > 12 ? '…' : ''}
                                </div>
                              </div>
                            )}
                            {r.lost.length > 0 && (
                              <div style={{ marginTop: '4px' }}>
                                <strong style={{ color: 'var(--text-muted)' }}>Locked empty (no points possible):</strong> {summariseMissing(r.lost)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
