import { useState, useRef } from 'react'
import html2canvas from 'html2canvas'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

const SHARE_OPTIONS = [
  { id: 'group', label: 'Group Stage', icon: '⚽' },
  { id: 'knockout', label: 'Knockout', icon: '🏆' },
  { id: 'standings', label: 'My Standings', icon: '📊' },
]

export default function ShareBracket({ onClose }) {
  const { user, profile } = useAuthStore()
  const [activeOption, setActiveOption] = useState('group')
  const [generating, setGenerating] = useState(false)
  const [imageUrl, setImageUrl] = useState(null)
  const [predictions, setPredictions] = useState(null)
  const [matches, setMatches] = useState([])
  const previewRef = useRef(null)

  const loadData = async () => {
    if (predictions) return

    const [matchRes, predRes] = await Promise.all([
      supabase.from('matches')
        .select('*, home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code), group:group_id(name)')
        .eq('stage', 'group')
        .order('kickoff_time', { ascending: true }),
      supabase.from('predictions')
        .select('*, match:match_id(match_number)')
        .eq('user_id', user.id)
    ])

    setMatches(matchRes.data || [])
    const predMap = {}
    predRes.data?.forEach(p => { predMap[p.match_id] = p })
    setPredictions(predMap)
  }

  const generateImage = async () => {
    setGenerating(true)
    await loadData()

    setTimeout(async () => {
      try {
        const canvas = await html2canvas(previewRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          allowTaint: true,
        })
        const url = canvas.toDataURL('image/png')
        setImageUrl(url)
      } catch (e) {
        console.error('Screenshot error:', e)
      }
      setGenerating(false)
    }, 500)
  }

  const shareToWhatsApp = () => {
    const text = `Check out my WC26 predictions! 🏆⚽ https://wc26predictor1.netlify.app`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const shareToX = () => {
    const text = `My FIFA World Cup 2026 predictions are in! ⚽🏆 Make yours at wc26predictor1.netlify.app`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
  }

  const shareToInstagram = () => {
    if (imageUrl) {
      const link = document.createElement('a')
      link.download = 'wc26-predictions.png'
      link.href = imageUrl
      link.click()
      alert('Image saved! Open Instagram and share it from your camera roll 📸')
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText('https://wc26predictor1.netlify.app')
    alert('Link copied!')
  }

  const downloadImage = () => {
    if (!imageUrl) return
    const link = document.createElement('a')
    link.download = `wc26-predictions-${activeOption}.png`
    link.href = imageUrl
    link.click()
  }

  const nativeShare = async () => {
    if (!imageUrl) return
    try {
      const blob = await fetch(imageUrl).then(r => r.blob())
      const file = new File([blob], 'wc26-predictions.png', { type: 'image/png' })
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'My WC26 Predictions',
          text: 'Check out my FIFA World Cup 2026 predictions!',
          files: [file],
          url: 'https://wc26predictor1.netlify.app',
        })
      } else {
        downloadImage()
      }
    } catch (e) {
      downloadImage()
    }
  }

  const groupsByLetter = ['A','B','C','D','E','F','G','H','I','J','K','L']

  const getGroupPredictions = (groupLetter) => {
    return matches
      .filter(m => m.group?.name === groupLetter)
      .map(m => ({
        match: m,
        pred: predictions?.[m.id],
      }))
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.7)',
      zIndex: 500,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
    }} onClick={onClose}>
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '24px 24px 0 0',
          padding: '24px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800' }}>📤 Share Predictions</h2>
          <button onClick={onClose} style={{
            width: '32px', height: '32px',
            borderRadius: '50%',
            background: 'var(--bg-tertiary)',
            border: 'none', cursor: 'pointer',
            fontSize: '16px',
          }}>✕</button>
        </div>

        {/* Toggle options */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {SHARE_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => { setActiveOption(opt.id); setImageUrl(null) }}
              style={{
                flex: 1,
                padding: '10px 8px',
                borderRadius: 'var(--radius-md)',
                border: activeOption === opt.id ? '2px solid var(--primary)' : '2px solid var(--border-light)',
                background: activeOption === opt.id ? 'var(--primary)' : 'var(--bg-secondary)',
                color: activeOption === opt.id ? 'var(--text-inverse)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '18px', marginBottom: '2px' }}>{opt.icon}</div>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Preview area */}
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          marginBottom: '16px',
          overflow: 'hidden',
        }}>
          <div ref={previewRef} style={{
            background: 'white',
            borderRadius: '12px',
            padding: '16px',
            fontFamily: 'sans-serif',
          }}>
            {/* Watermark header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '12px', paddingBottom: '10px',
              borderBottom: '2px solid #00c853',
            }}>
              <div>
                <div style={{ fontWeight: '900', fontSize: '16px', color: '#0a0a0a' }}>
                  ⚽ WC26 Predictor
                </div>
                <div style={{ fontSize: '11px', color: '#8a8a8a' }}>
                  {profile?.username}'s predictions
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#8a8a8a', textAlign: 'right' }}>
                wc26predictor1.netlify.app
              </div>
            </div>

            {/* Content based on active option */}
            {activeOption === 'group' && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0a0a0a', marginBottom: '10px' }}>
                  Group Stage Predictions
                </div>
                {predictions ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {groupsByLetter.slice(0, 6).map(g => {
                      const groupPreds = getGroupPredictions(g)
                      const count = groupPreds.filter(p => p.pred).length
                      return (
                        <div key={g} style={{
                          background: '#f8f9fa',
                          borderRadius: '8px',
                          padding: '8px',
                        }}>
                          <div style={{ fontWeight: '700', fontSize: '11px', color: '#0a0a0a', marginBottom: '4px' }}>
                            Group {g} — {count}/{groupPreds.length} predicted
                          </div>
                          {groupPreds.slice(0, 2).map(({ match, pred }) => (
                            <div key={match.id} style={{
                              display: 'flex', alignItems: 'center', gap: '4px',
                              fontSize: '11px', color: '#4a4a4a', marginBottom: '2px',
                            }}>
                              <span>{match.home_team?.flag_emoji}</span>
                              <span style={{ fontWeight: '700', color: '#0a0a0a' }}>
                                {pred ? `${pred.home_score}-${pred.away_score}` : '?-?'}
                              </span>
                              <span>{match.away_team?.flag_emoji}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#8a8a8a', padding: '20px', fontSize: '13px' }}>
                    Click Generate to preview
                  </div>
                )}
              </div>
            )}

            {activeOption === 'standings' && (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏅</div>
                <div style={{ fontWeight: '900', fontSize: '28px', color: '#0a0a0a' }}>
                  {profile?.total_points || 0}
                </div>
                <div style={{ fontSize: '13px', color: '#8a8a8a', marginBottom: '12px' }}>Total Points</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: '700', fontSize: '18px' }}>{profile?.streak_current || 0}</div>
                    <div style={{ fontSize: '11px', color: '#8a8a8a' }}>🔥 Streak</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: '700', fontSize: '18px' }}>{profile?.perfect_rounds || 0}</div>
                    <div style={{ fontSize: '11px', color: '#8a8a8a' }}>🎯 Perfect</div>
                  </div>
                </div>
              </div>
            )}

            {activeOption === 'knockout' && (
              <div style={{ textAlign: 'center', padding: '16px', color: '#8a8a8a', fontSize: '13px' }}>
                Knockout predictions available from 28 June
              </div>
            )}

            {/* Footer */}
            <div style={{
              marginTop: '12px', paddingTop: '8px',
              borderTop: '1px solid #e8e8e8',
              fontSize: '10px', color: '#8a8a8a',
              textAlign: 'center',
            }}>
              Make your predictions at wc26predictor1.netlify.app
            </div>
          </div>
        </div>

        {/* Generated image preview */}
        {imageUrl && (
          <div style={{ marginBottom: '16px' }}>
            <img src={imageUrl} style={{ width: '100%', borderRadius: 'var(--radius-md)' }} alt="Share preview" />
          </div>
        )}

        {/* Generate button */}
        {!imageUrl && (
          <button
            onClick={generateImage}
            disabled={generating}
            className="btn btn-primary btn-full"
            style={{ marginBottom: '12px' }}
          >
            {generating ? (
              <><div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Generating...</>
            ) : '✨ Generate Image'}
          </button>
        )}

        {/* Share buttons */}
        {imageUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={nativeShare}
              className="btn btn-primary btn-full"
            >
              📤 Share Image
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
              <button onClick={shareToWhatsApp} style={{
                padding: '10px 8px', borderRadius: 'var(--radius-md)',
                background: '#25D366', color: 'white', border: 'none',
                cursor: 'pointer', fontSize: '11px', fontWeight: '700',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              }}>
                <span style={{ fontSize: '20px' }}>💬</span>
                WhatsApp
              </button>
              <button onClick={shareToX} style={{
                padding: '10px 8px', borderRadius: 'var(--radius-md)',
                background: '#000', color: 'white', border: 'none',
                cursor: 'pointer', fontSize: '11px', fontWeight: '700',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              }}>
                <span style={{ fontSize: '20px' }}>𝕏</span>
                X / Twitter
              </button>
              <button onClick={shareToInstagram} style={{
                padding: '10px 8px', borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                color: 'white', border: 'none',
                cursor: 'pointer', fontSize: '11px', fontWeight: '700',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              }}>
                <span style={{ fontSize: '20px' }}>📸</span>
                Instagram
              </button>
              <button onClick={copyLink} style={{
                padding: '10px 8px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-light)',
                cursor: 'pointer', fontSize: '11px', fontWeight: '700',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              }}>
                <span style={{ fontSize: '20px' }}>🔗</span>
                Copy Link
              </button>
            </div>
            <button
              onClick={() => { setImageUrl(null) }}
              className="btn btn-secondary btn-full"
            >
              Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
