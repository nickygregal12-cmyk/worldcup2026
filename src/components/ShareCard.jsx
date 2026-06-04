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

    const standings = calcPredictedStandings(matches || [], predMap)

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
        backgroundColor: '#003087',
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
      {/* The card to be captured */}
      <div ref={cardRef} style={{
        width: '320px',
        background: 'linear-gradient(160deg, #001f5b 0%, #003087 50%, #001540 100%)',
        borderRadius: '16px',
        padding: '20px',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>
              FIFA World Cup 2026
            </div>
            <div style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '-0.02em' }}>
              🏴󠁧󠁢󠁳󠁣󠁴󠁿 My Predictions
            </div>
          </div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.5)' }}>
            {displayName}
          </div>
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
                      padding: '6px 4px',
                      textAlign: 'center',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginBottom: '3px' }}>GRP {g}</div>
                      {winner ? (
                        <>
                          <div style={{ fontSize: '20px', lineHeight: 1, marginBottom: '2px' }}>{winner.team?.flag_emoji}</div>
                          <div style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.9)', lineHeight: 1.2 }}>{(winner.team?.short_code || winner.team?.name || '').substring(0, 6)}</div>
                        </>
                      ) : (
                        <div style={{ fontSize: '16px', opacity: 0.3 }}>🏳️</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Tournament winner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(184,134,11,0.3), rgba(255,215,0,0.15))',
              border: '1px solid rgba(255,215,0,0.3)',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '10px',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span style={{ fontSize: '24px' }}>🏆</span>
              <div>
                <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,215,0,0.7)', marginBottom: '2px' }}>
                  My World Cup Winner
                </div>
                <div style={{ fontSize: '15px', fontWeight: '900' }}>
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
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>
                wc26predictor1.netlify.app
              </div>
            </div>
          </>
        )}
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
