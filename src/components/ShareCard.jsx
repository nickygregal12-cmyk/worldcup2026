import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'
import { calcPredictedStandings } from '../lib/bracketUtils.js'

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

export default function ShareCard({ onClose }) {
  const { user, profile } = useAuthStore()
  const cardRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [groupWinners, setGroupWinners] = useState([])
  const [tournamentWinner, setTournamentWinner] = useState(null)
  const [goldenBoot, setGoldenBoot] = useState(null)

  useEffect(() => { loadData() }, [user])

  const loadData = async () => {
    if (!user) return
    setLoading(true)

    // Fetch groups separately since FK join may not be registered in Supabase schema
    const { data: groups } = await supabase.from('groups').select('id, name')
    const groupMap = {}
    groups?.forEach(g => { groupMap[g.id] = g.name })

    // Load group matches — no group join needed
    const { data: matchesRaw } = await supabase
      .from('matches')
      .select('*, home_team:home_team_id(id,name,flag_emoji,short_code), away_team:away_team_id(id,name,flag_emoji,short_code)')
      .eq('stage', 'group')
      .order('kickoff_time', { ascending: true })

    // Attach group name manually
    const matches = (matchesRaw || []).map(m => ({
      ...m,
      group: { name: groupMap[m.group_id] || null }
    }))

    const { data: preds } = await supabase
      .from('predictions')
      .select('match_id, home_score, away_score')
      .eq('user_id', user.id)

    const predMap = {}
    preds?.forEach(p => { predMap[p.match_id] = { home: p.home_score, away: p.away_score } })

    const standings = calcPredictedStandings(matches || [], predMap, true)

    // Get winner of each group
    const winners = GROUPS.map(g => {
      const groupTeams = Object.values(standings[g] || {})
      if (!groupTeams.length) return null
      const sorted = groupTeams.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf)
      return sorted[0] || null
    })
    setGroupWinners(winners)

    // Load tournament winner (Final pick match_number 104)
    const { data: koData } = await supabase
      .from('knockout_picks')
      .select('winner_team_id, match_number')
      .eq('user_id', user.id)
      .eq('match_number', 104)
      .maybeSingle()

    if (koData?.winner_team_id) {
      const { data: team } = await supabase
        .from('teams')
        .select('name, flag_emoji')
        .eq('id', koData.winner_team_id)
        .single()
      setTournamentWinner(team)
    }

    // Load Golden Boot pick
    const { data: awardData } = await supabase
      .from('award_predictions')
      .select('predicted_player_name, predicted_team_id')
      .eq('user_id', user.id)
      .eq('award_type', 'golden_boot')
      .maybeSingle()

    if (awardData?.predicted_player_name) {
      let flag = ''
      if (awardData.predicted_team_id) {
        const { data: team } = await supabase
          .from('teams').select('flag_emoji').eq('id', awardData.predicted_team_id).single()
        flag = team?.flag_emoji || ''
      }
      setGoldenBoot({ name: awardData.predicted_player_name, flag })
    }

    setLoading(false)
  }

  const handleShare = async () => {
    if (!cardRef.current) return
    setSharing(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null, // transparent — keeps the gold frame's rounded corners clean
        useCORS: true,
        logging: false,
      })
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'wc26-predictions.png', { type: 'image/png' })
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'My WC26 Predictions',
            text: 'Check out my World Cup 2026 predictions!',
            files: [file],
          })
        } else {
          // Fallback — download the image
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'wc26-predictions.png'
          a.click()
          URL.revokeObjectURL(url)
        }
        setSharing(false)
      }, 'image/png')
    } catch (e) {
      console.error('Share failed:', e)
      setSharing(false)
    }
  }

  const displayName = profile?.display_name || profile?.username || 'Me'

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', flexDirection: 'column', gap: '16px',
    }}>
      {/* The card to be captured — gold foil frame wraps the navy card */}
      <div ref={cardRef} style={{
        width: '320px',
        borderRadius: '18px',
        padding: '2px',
        background: 'linear-gradient(140deg, #d4af37 0%, #f5e7a3 25%, #b8860b 50%, #f5e7a3 75%, #d4af37 100%)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
      }}>
      <div style={{
        background: 'linear-gradient(160deg, #001f5b 0%, #003087 55%, #001540 100%)',
        borderRadius: '16px',
        padding: '20px',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Static diagonal sheen (html2canvas-safe — no animation) */}
        <div style={{
          position: 'absolute', top: '-50%', left: '-20%', width: '60%', height: '200%',
          background: 'linear-gradient(75deg, transparent 0%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 55%, transparent 100%)',
          transform: 'rotate(8deg)', pointerEvents: 'none',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: '2px' }}>
              FIFA World Cup 2026
            </div>
            <div style={{ fontSize: '19px', fontWeight: '900', letterSpacing: '-0.02em' }}>
              My Predictions
            </div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
              🏴󠁧󠁢󠁳󠁣󠁴󠁿 {displayName}
            </div>
          </div>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #f5e7a3, #b8860b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.5)',
            flexShrink: 0,
          }}>🏆</div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>Loading...</div>
        ) : (
          <>
            {/* Group winners grid */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                Group Winners
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {GROUPS.map((g, i) => {
                  const winner = groupWinners[i]
                  return (
                    <div key={g} style={{
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      padding: '7px 4px',
                      textAlign: 'center',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}>
                      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.45)', fontWeight: '700', marginBottom: '3px' }}>{g}</div>
                      {winner ? (
                        <>
                          <div style={{ fontSize: '24px', lineHeight: 1, marginBottom: '2px' }}>{winner.team?.flag_emoji}</div>
                          <div style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.9)', lineHeight: 1.2 }}>{(winner.team?.short_code || winner.team?.name || '').substring(0, 6)}</div>
                        </>
                      ) : (
                        <div style={{ fontSize: '18px', opacity: 0.3 }}>🏳️</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Tournament winner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.35), rgba(255,215,0,0.12))',
              border: '1px solid rgba(255,215,0,0.45)',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '10px',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <span style={{ fontSize: '28px' }}>🏆</span>
              <div>
                <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,215,0,0.75)', marginBottom: '2px' }}>
                  My World Cup Winner
                </div>
                <div style={{ fontSize: '17px', fontWeight: '900' }}>
                  {tournamentWinner
                    ? `${tournamentWinner.flag_emoji} ${tournamentWinner.name}`
                    : <span style={{ opacity: 0.4 }}>Not picked yet</span>}
                </div>
              </div>
            </div>

            {/* Golden Boot */}
            {goldenBoot && (
              <div style={{
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '8px',
                padding: '8px 12px',
                marginBottom: '12px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <span style={{ fontSize: '16px' }}>👟</span>
                <div>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Golden Boot</div>
                  <div style={{ fontSize: '12px', fontWeight: '700' }}>{goldenBoot.flag} {goldenBoot.name}</div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', fontWeight: '600', letterSpacing: '0.04em' }}>
                ⚽ wc26predictor1.netlify.app
              </div>
            </div>
          </>
        )}
      </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={handleShare} disabled={sharing || loading}
          style={{
            padding: '12px 24px', borderRadius: '50px',
            background: sharing ? 'rgba(255,255,255,0.3)' : 'white',
            color: '#003087', fontWeight: '800', fontSize: '14px',
            border: 'none', cursor: sharing ? 'wait' : 'pointer',
          }}>
          {sharing ? '⏳ Preparing...' : '📤 Share'}
        </button>
        <button onClick={onClose}
          style={{
            padding: '12px 20px', borderRadius: '50px',
            background: 'rgba(255,255,255,0.15)', color: 'white',
            fontWeight: '700', fontSize: '14px', border: '1px solid rgba(255,255,255,0.3)',
            cursor: 'pointer',
          }}>
          Close
        </button>
      </div>
    </div>
  )
}
