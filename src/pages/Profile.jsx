import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore, useAppStore } from '../store/index.js'
import ShareCard from '../components/ShareCard.jsx'

const AVATARS = ['⚽','🏆','🥅','🧤','👟','🎯','🔥','⚡','🦁','🐯','🦅','🏴󠁧󠁢󠁳󠁣󠁴󠁿']

export default function Profile() {
  const { user, profile, loadProfile, setProfile, logout, isAdmin } = useAuthStore()
  const { darkMode, toggleDarkMode } = useAppStore()
  const navigate = useNavigate()
  const [badges, setBadges] = useState([])
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [clearDone, setClearDone] = useState(false)
  const [activeTab, setActiveTab] = useState('stats') // stats | history
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [showShareCard, setShowShareCard] = useState(false)
  const [importPreview, setImportPreview] = useState(null)
  const [importLoading, setImportLoading] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState('')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    loadBadges()
    setDisplayName(profile?.display_name || profile?.username || '')
    setSelectedAvatar(profile?.avatar_emoji || '⚽')
  }, [user, profile])

  const loadBadges = async () => {
    const { data } = await supabase
      .from('user_badges')
      .select('*, badge:badge_code(code, name, description, icon)')
      .eq('user_id', user.id)
    setBadges(data || [])
  }

  const loadHistory = async () => {
    if (history.length > 0) return
    setHistoryLoading(true)
    const { data } = await supabase
      .from('predictions')
      .select(`
        id, home_score, away_score, points_awarded, is_confident,
        match:match_id(id, kickoff_time, home_score, away_score, status,
          home_team:home_team_id(name, flag_emoji, short_code),
          away_team:away_team_id(name, flag_emoji, short_code))
      `)
      .eq('user_id', user.id)
      .eq('match.status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50)
    setHistory((data || []).filter(p => p.match?.status === 'completed'))
    setHistoryLoading(false)
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'history') loadHistory()
  }

  const saveProfile = async () => {
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', user.id)
    await loadProfile(user.id)
    setEditing(false)
    setSaving(false)
  }

  const saveAvatar = async (emoji) => {
    setSelectedAvatar(emoji)
    setShowAvatarPicker(false)
    setProfile({ ...profile, avatar_emoji: emoji })
    await supabase.from('profiles').update({ avatar_emoji: emoji }).eq('id', user.id)
  }

  const toggleFuturePredictions = async () => {
    const newVal = !profile.show_future_predictions
    setProfile({ ...profile, show_future_predictions: newVal })
    await supabase.from('profiles').update({ show_future_predictions: newVal }).eq('id', user.id)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleClearAll = async () => {
    if (!user || clearing) return
    setClearing(true)
    await Promise.all([
      supabase.from('predictions').delete().eq('user_id', user.id),
      supabase.from('award_predictions').delete().eq('user_id', user.id),
      supabase.from('tournament_predictions').delete().eq('user_id', user.id),
      supabase.from('knockout_picks').delete().eq('user_id', user.id),
    ])
    await supabase.from('profiles').update({ knockout_picks_count: 0, jokers_group_remaining: 8 }).eq('id', user.id)
    setClearing(false)
    setShowClearConfirm(false)
    setClearDone(true)
    setTimeout(() => setClearDone(false), 3000)
  }

  const getResultColour = (pred, match) => {
    if (!match || match.status !== 'completed') return 'var(--text-muted)'
    const predResult = pred.home_score > pred.away_score ? 'H' : pred.home_score < pred.away_score ? 'A' : 'D'
    const actualResult = match.home_score > match.away_score ? 'H' : match.home_score < match.away_score ? 'A' : 'D'
    if (pred.home_score === match.home_score && pred.away_score === match.away_score) return 'var(--accent-green)'
    if (predResult === actualResult) return 'var(--accent-orange)'
    return '#e53935'
  }

  const accuracy = profile?.prediction_accuracy || 0

  if (!profile) return <div className="loading-screen"><div className="spinner" /></div>

  // Team name aliases for import
  const TEAM_ALIASES = {
    'holland': 'Netherlands', 'the netherlands': 'Netherlands',
    'korea republic': 'South Korea', 'republic of korea': 'South Korea',
    'cabo verde': 'Cape Verde', 'cape verde islands': 'Cape Verde',
    "cote d'ivoire": 'Ivory Coast', 'ivory coast': 'Ivory Coast',
    'usa': 'United States', 'united states of america': 'United States',
    'turkey': 'Türkiye', 'bosnia': 'Bosnia-Herzegovina',
    'bosnia and herzegovina': 'Bosnia-Herzegovina',
    'czech republic': 'Czechia', 'dr congo': 'DR Congo',
  }
  const normaliseTeam = (name) => {
    if (!name) return ''
    const lower = name.toLowerCase().trim()
    return TEAM_ALIASES[lower] || name.trim()
  }

  const handleExportPredictions = async () => {
    if (!user) return
    const XLSX = await import('xlsx')
    const { data: matches } = await supabase
      .from('matches')
      .select('id, kickoff_time, home_team:home_team_id(name, short_code), away_team:away_team_id(name, short_code), group:group_id(name)')
      .eq('stage', 'group').order('kickoff_time')
    const { data: preds } = await supabase
      .from('predictions').select('match_id, home_score, away_score, is_confident').eq('user_id', user.id)
    const predMap = {}
    preds?.forEach(p => { predMap[p.match_id] = p })

    const rows = [['Match', 'Group', 'Date', 'Home Team', 'Away Team', 'Home Score', 'Away Score', 'Joker']]
    matches?.forEach((m, i) => {
      const pred = predMap[m.id]
      const date = new Date(m.kickoff_time).toLocaleDateString('en-GB')
      rows.push([
        `M${i + 1}`,
        m.group?.name || '',
        date,
        m.home_team?.name || '',
        m.away_team?.name || '',
        pred?.home_score ?? '',
        pred?.away_score ?? '',
        pred?.is_confident ? 'X' : '',
      ])
    })

    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Predictions')
    // Browser-safe download
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wc26-predictions-${profile?.display_name || 'export'}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportPredictions = async (file) => {
    if (!user) return
    setImportLoading(true)
    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

      let headerRow = -1, homeScoreCol = -1, awayScoreCol = -1, jokerCol = -1, homeTeamCol = -1, awayTeamCol = -1
      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const row = rows[i].map(c => String(c).toLowerCase().trim())

        // Standard format
        if (row.some(c => c.includes('home') && c.includes('score'))) {
          headerRow = i
          row.forEach((c, j) => {
            if (c.includes('home') && c.includes('score')) homeScoreCol = j
            if (c.includes('away') && c.includes('score')) awayScoreCol = j
            if (c.includes('joker')) jokerCol = j
            if (c.includes('home') && !c.includes('score')) homeTeamCol = j
            if (c.includes('away') && !c.includes('score')) awayTeamCol = j
          })
          break
        }

        // WC26 Entry Sheet template format: Match # | Group | Date | NY Time | Country | blank | Score | blank | blank | Country | Joker
        if (row.some(c => c.includes('match') && (c.includes('#') || c.includes('no') || c === 'match'))) {
          headerRow = i
          const countryIndices = []
          row.forEach((c, j) => { if (c === 'country') countryIndices.push(j) })
          if (countryIndices.length >= 2) {
            homeTeamCol = countryIndices[0]
            awayTeamCol = countryIndices[1]
            homeScoreCol = homeTeamCol + 1
            awayScoreCol = awayTeamCol - 1
            jokerCol = awayTeamCol + 1
          } else {
            homeTeamCol = 4; homeScoreCol = 5; awayScoreCol = 7; awayTeamCol = 9; jokerCol = 10
          }
          break
        }
      }

      // Last resort: detect by numeric first column (match number rows)
      if (headerRow === -1 || homeScoreCol === -1) {
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
          if (!isNaN(parseInt(String(rows[i][0]))) && rows[i].length > 8) {
            headerRow = i - 1
            homeTeamCol = 4; homeScoreCol = 5; awayScoreCol = 7; awayTeamCol = 9; jokerCol = 10
            break
          }
        }
      }

      if (headerRow === -1 || homeScoreCol === -1) {
        alert('Could not detect spreadsheet format. Supported: "Home Score"/"Away Score" headers, or the WC26 Entry Sheet template.')
        setImportLoading(false)
        return
      }

      const { data: allMatches } = await supabase
        .from('matches').select('id, home_team:home_team_id(name, short_code), away_team:away_team_id(name, short_code)')
        .eq('stage', 'group').order('kickoff_time')

      const predictions = []
      const unmatched = []
      let jokersFound = 0

      for (let i = headerRow + 1; i < rows.length; i++) {
        const row = rows[i]
        const homeScore = parseInt(String(row[homeScoreCol]).trim())
        const awayScore = parseInt(String(row[awayScoreCol]).trim())
        if (isNaN(homeScore) || isNaN(awayScore)) continue
        const isJoker = jokerCol >= 0 && String(row[jokerCol]).trim().toUpperCase() === 'X'
        if (isJoker) jokersFound++

        let match = null
        if (homeTeamCol >= 0 && awayTeamCol >= 0) {
          const homeTeam = normaliseTeam(String(row[homeTeamCol]))
          const awayTeam = normaliseTeam(String(row[awayTeamCol]))
          match = allMatches.find(m =>
            m.home_team?.name?.toLowerCase() === homeTeam.toLowerCase() &&
            m.away_team?.name?.toLowerCase() === awayTeam.toLowerCase()
          )
          if (!match) unmatched.push(`${homeTeam} vs ${awayTeam}`)
        } else {
          match = allMatches[predictions.length]
        }

        if (match) {
          predictions.push({ match_id: match.id, home_score: homeScore, away_score: awayScore, is_confident: isJoker })
        }
      }

      setImportPreview({ predictions, unmatched, jokersFound })
    } catch (e) {
      alert(`Import failed: ${e.message}`)
    }
    setImportLoading(false)
  }

  const confirmImport = async () => {
    if (!importPreview || !user) return
    setImportLoading(true)
    const toSave = importPreview.predictions.map(p => ({
      user_id: user.id, match_id: p.match_id, home_score: p.home_score,
      away_score: p.away_score, is_confident: p.is_confident, bracket_type: 'main',
    }))
    const { error } = await supabase.from('predictions').upsert(toSave, { onConflict: 'user_id,match_id,bracket_type' })
    if (error) { alert(`Save failed: ${error.message}`) }
    else { setImportPreview(null); alert(`✅ ${toSave.length} predictions imported successfully!`) }
    setImportLoading(false)
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,20,60,0.88) 0%, rgba(0,50,120,0.85) 100%), url(/hero-bg.jpg) center/cover no-repeat',
        padding: '32px 20px 24px',
        color: 'white',
        textAlign: 'center',
      }}>
        {/* Avatar */}
        <div
          onClick={() => setShowAvatarPicker(true)}
          style={{
            width: '72px', height: '72px',
            borderRadius: '50%',
            background: 'var(--accent-green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px',
            margin: '0 auto 12px',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          {selectedAvatar || profile.username?.[0]?.toUpperCase()}
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            background: 'white', borderRadius: '50%',
            width: '20px', height: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px',
          }}>✏️</div>
        </div>

        {editing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <input
              className="input"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveProfile(); if (e.key === 'Escape') setEditing(false) }}
              autoFocus
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.4)', color: 'white', textAlign: 'center', fontWeight: '800', fontSize: '18px', maxWidth: '200px' }}
            />
            <button onClick={saveProfile} disabled={saving}
              style={{ background: 'var(--accent-green)', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', padding: '6px 12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
              {saving ? '...' : '✓'}
            </button>
            <button onClick={() => setEditing(false)}
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', padding: '6px 12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
              ✕
            </button>
          </div>
        ) : (
          <div onClick={() => setEditing(true)} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
            <span style={{ fontWeight: '800', fontSize: '22px' }}>{profile.display_name || profile.username}</span>
            <span style={{ fontSize: '13px', opacity: 0.5 }}>✏️</span>
          </div>
        )}
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginTop: '4px' }}>@{profile.username}</div>

        {/* Accuracy bar */}
        {accuracy > 0 && (
          <div style={{ marginTop: '12px', maxWidth: '200px', margin: '12px auto 0' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
              Prediction accuracy: {accuracy}%
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px' }}>
              <div style={{ height: '100%', width: `${accuracy}%`, background: 'var(--accent-green)', borderRadius: '2px', transition: 'width 0.5s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', display: 'flex', padding: '8px 16px', gap: '8px' }}>
        {[{ key: 'stats', label: '📊 Stats' }, { key: 'history', label: '📋 History' }].map(tab => (
          <button key={tab.key} onClick={() => handleTabChange(tab.key)} style={{
            flex: 1, padding: '8px 12px',
            fontSize: '13px', fontWeight: '700',
            color: activeTab === tab.key ? 'white' : 'var(--text-muted)',
            background: activeTab === tab.key ? 'var(--scottish-navy)' : 'var(--bg-secondary)',
            borderRadius: 'var(--radius-full)',
            border: 'none', cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="container" style={{ padding: '16px' }}>

        {activeTab === 'stats' && (
          <>
            {/* Stats grid */}
            <div className="card" style={{ marginBottom: '16px', overflow: 'hidden' }}>
              <div style={{ height: '4px', background: 'var(--scottish-navy)', margin: '-16px -16px 14px' }} />
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--scottish-navy)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                🌍 Tournament Predictor
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {[
                  { label: 'Total Points', value: profile.total_points || 0, icon: '🏅' },
                  { label: 'Accuracy', value: `${accuracy}%`, icon: '🎯', desc: 'Correct results' },
                  { label: 'Current Streak', value: profile.streak_current || 0, icon: '🔥', desc: 'Correct in a row' },
                  { label: 'Best Streak', value: profile.streak_best || 0, icon: '⚡', desc: 'Personal best' },
                  { label: 'Exact Scores', value: profile.exact_scores || 0, icon: '💎', desc: 'Perfect predictions' },
                  { label: 'Jokers Left', value: profile.jokers_group_remaining ?? 8, icon: '🃏', desc: 'Double points remaining' },
                ].map(({ label, value, icon, desc }) => (
                  <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', marginBottom: '4px' }}>{icon}</div>
                    <div style={{ fontWeight: '800', fontSize: '24px', fontFamily: 'var(--font-mono)' }}>{value}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>{label}</div>
                    {desc && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', opacity: 0.7, lineHeight: '1.3' }}>{desc}</div>}
                  </div>
                ))}
              </div>

              {/* KO stats */}
              {(profile.ko_points > 0 || profile.ko_jokers_remaining !== undefined) && (
                <>
                  <div style={{ height: '1px', background: 'var(--border-light)', margin: '14px 0 12px' }} />
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#e65100', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                    🔥 KO Predictor
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {[
                      { label: 'KO Points', value: profile.ko_points || 0, icon: '🔥' },
                      { label: 'KO Exact', value: profile.ko_exact_scores || 0, icon: '🎯', desc: 'Perfect KO scores' },
                      { label: 'KO Streak', value: profile.ko_streak_current || 0, icon: '⚡', desc: 'Current KO streak' },
                      { label: 'KO Jokers', value: profile.ko_jokers_remaining ?? 5, icon: '🃏', desc: 'KO jokers left' },
                    ].map(({ label, value, icon, desc }) => (
                      <div key={label} style={{ background: '#fff3e0', borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'center', border: '1px solid rgba(230,81,0,0.15)' }}>
                        <div style={{ fontSize: '22px', marginBottom: '4px' }}>{icon}</div>
                        <div style={{ fontWeight: '800', fontSize: '24px', fontFamily: 'var(--font-mono)', color: '#e65100' }}>{value}</div>
                        <div style={{ fontSize: '11px', color: '#e65100', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px', opacity: 0.8 }}>{label}</div>
                        {desc && <div style={{ fontSize: '10px', color: '#e65100', marginTop: '2px', opacity: 0.6, lineHeight: '1.3' }}>{desc}</div>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Badges */}
            <div className="card" style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>🏆 Badges</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>Earn badges by hitting milestones</div>

              {/* All available badges — earned in colour, locked greyed out */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {[
                  { code: 'first_prediction', icon: '⚽', name: 'First Kick', desc: 'Make your first prediction', check: () => (profile?.total_predictions || 0) >= 1 },
                  { code: 'all_groups', icon: '📋', name: 'Full House', desc: 'Predict all 72 group matches', check: () => (profile?.total_predictions || 0) >= 72 },
                  { code: 'knockout_done', icon: '🏆', name: 'Bracket Builder', desc: 'Complete your knockout picks', check: () => (profile?.knockout_picks_count || 0) >= 16 },
                  { code: 'awards_done', icon: '🥇', name: 'Award Season', desc: 'Complete all award predictions', check: () => (profile?.awards_done || 0) >= 4 },
                  { code: 'exact_score', icon: '🎯', name: 'Sniper', desc: 'Get your first exact score', check: () => (profile?.exact_scores || 0) >= 1 },
                  { code: 'five_exact', icon: '💎', name: 'Diamond Eye', desc: 'Get 5 exact scores', check: () => (profile?.exact_scores || 0) >= 5 },
                  { code: 'streak_5', icon: '🔥', name: 'On Fire', desc: '5 correct results in a row', check: () => (profile?.streak_best || 0) >= 5 },
                  { code: 'streak_10', icon: '⚡', name: 'Lightning', desc: '10 correct results in a row', check: () => (profile?.streak_best || 0) >= 10 },
                  { code: 'joker_used', icon: '🃏', name: 'Wild Card', desc: 'Use your first joker', check: () => (profile?.jokers_group_remaining || 8) < 8 },
                  { code: 'top_3', icon: '🏅', name: 'Podium', desc: 'Reach top 3 on leaderboard', check: () => false }, // checked server-side
                  { code: 'ko_predictor', icon: '🔥', name: 'KO Warrior', desc: 'Make 10+ KO Predictor picks', check: () => (profile?.ko_points || 0) > 0 },
                  { code: 'perfect_group', icon: '🌟', name: 'Group Genius', desc: 'Predict an entire group correctly', check: () => false },
                ].map(badge => {
                  const earned = badges.find(b => b.badge?.code === badge.code) || badge.check()
                  return (
                    <div key={badge.code} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', borderRadius: 'var(--radius-md)',
                      background: earned ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                      border: earned ? '1px solid var(--border-medium)' : '1px solid var(--border-light)',
                      opacity: earned ? 1 : 0.5,
                    }}>
                      <div style={{ fontSize: '24px', filter: earned ? 'none' : 'grayscale(1)' }}>{badge.icon}</div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '700' }}>{badge.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.3' }}>{badge.desc}</div>
                      </div>
                      {earned && <div style={{ marginLeft: 'auto', fontSize: '14px' }}>✅</div>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Settings */}
            <div className="card" style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '14px' }}>⚙️ Settings</div>

              <div style={{ marginBottom: '16px' }}>
                <label className="label">Display Name</label>
                {editing ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} />
                    <button onClick={saveProfile} disabled={saving} className="btn btn-primary btn-sm">
                      {saving ? '...' : 'Save'}
                    </button>
                    <button onClick={() => setEditing(false)} className="btn btn-secondary btn-sm">Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px' }}>{profile.display_name || profile.username}</span>
                    <button onClick={() => setEditing(true)} className="btn btn-secondary btn-sm">Edit</button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid var(--border-light)' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>Dark Mode</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{darkMode ? 'On' : 'Off'}</div>
                </div>
                <button onClick={toggleDarkMode} style={{ width: '48px', height: '28px', borderRadius: 'var(--radius-full)', background: darkMode ? 'var(--accent-green)' : 'var(--border-medium)', position: 'relative', border: 'none', cursor: 'pointer' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '4px', left: darkMode ? '24px' : '4px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid var(--border-light)' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>🔮 Show Future Predictions</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {profile.show_future_predictions ? 'Others can see your upcoming picks' : 'Future picks are private'}
                  </div>
                </div>
                <button onClick={toggleFuturePredictions} style={{ width: '48px', height: '28px', borderRadius: 'var(--radius-full)', background: profile.show_future_predictions ? 'var(--accent-green)' : 'var(--border-medium)', position: 'relative', border: 'none', cursor: 'pointer' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '4px', left: profile.show_future_predictions ? '24px' : '4px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
            </div>

            {isAdmin && (
              <Link to="/admin" className="btn btn-full" style={{
                marginBottom: '12px', display: 'block', textAlign: 'center',
                background: 'var(--accent-orange)', color: 'white',
                padding: '12px', borderRadius: 'var(--radius-lg)',
                fontWeight: '700', fontSize: '14px', textDecoration: 'none',
              }}>
                ⚙️ Admin Panel
              </Link>
            )}

            {/* Danger zone */}
            <div className="card" style={{ marginBottom: '12px', border: '1px solid rgba(229,57,53,0.2)' }}>
              <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Danger Zone
              </div>
              {clearDone ? (
                <div style={{ padding: '10px 14px', background: 'var(--accent-green-light)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--accent-green)', fontWeight: '600' }}>
                  ✓ All predictions cleared — you can start fresh!
                </div>
              ) : (
                <button onClick={() => setShowClearConfirm(true)} className="btn btn-full"
                  style={{ background: 'none', border: '1px solid #e53935', color: '#e53935', fontWeight: '600' }}>
                  🗑️ Clear all predictions & start again
                </button>
              )}
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                Removes all group, award and goals predictions
              </div>
            </div>

            <button onClick={() => setShowShareCard(true)}
              className="btn btn-full" style={{ marginBottom: '12px', background: 'var(--scottish-navy)', color: 'white', fontWeight: '700' }}>
              📤 Share my predictions
            </button>
            <button onClick={handleExportPredictions}
              className="btn btn-full" style={{ marginBottom: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: '700', border: '1px solid var(--border-medium)' }}>
              📥 Export my predictions (Excel)
            </button>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>
                📊 Import predictions from Excel
              </label>
              <input type="file" accept=".xlsx,.xls,.csv"
                onChange={e => { if (e.target.files[0]) handleImportPredictions(e.target.files[0]) }}
                style={{ fontSize: '12px', width: '100%', marginBottom: '4px' }} />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                💡 Fill in the template from another predictor and import here. Your existing predictions will be overwritten.
              </div>
            </div>
            <button onClick={handleLogout} className="btn btn-secondary btn-full" style={{ marginBottom: '24px' }}>
              Sign out
            </button>
          </>
        )}

        {activeTab === 'history' && (
          <div className="card" style={{ padding: '8px' }}>
            {historyLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
                <div className="spinner" />
              </div>
            ) : history.length === 0 ? (
              <div className="empty-state" style={{ padding: '48px 24px' }}>
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-title">No completed matches yet</div>
                <div className="empty-state-desc">Your prediction results will appear here once matches are played</div>
              </div>
            ) : (
              history.map(pred => {
                const match = pred.match
                if (!match) return null
                const colour = getResultColour(pred, match)
                const isExact = pred.home_score === match.home_score && pred.away_score === match.away_score
                return (
                  <div key={pred.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 8px', borderBottom: '1px solid var(--border-light)',
                    borderLeft: `3px solid ${colour}`,
                    paddingLeft: '12px', marginBottom: '2px',
                    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '2px' }}>
                        {match.home_team?.flag_emoji} {match.home_team?.short_code} vs {match.away_team?.short_code} {match.away_team?.flag_emoji}
                        {pred.is_confident && <span style={{ marginLeft: '4px', fontSize: '10px' }}>🃏</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Your pick: {pred.home_score}–{pred.away_score} · Actual: {match.home_score}–{match.away_score}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', fontSize: '16px', fontFamily: 'var(--font-mono)', color: colour }}>
                        +{pred.points_awarded || 0}
                      </div>
                      {isExact && <div style={{ fontSize: '9px', color: 'var(--accent-green)', fontWeight: '700' }}>EXACT</div>}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {showShareCard && <ShareCard onClose={() => setShowShareCard(false)} />}

      {/* Import preview modal */}
      {importPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
            <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '12px' }}>📋 Import Preview</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <div>✅ <strong>{importPreview.predictions.length}</strong> predictions found</div>
              <div>🃏 <strong>{importPreview.jokersFound}</strong> jokers</div>
              {importPreview.unmatched.length > 0 && (
                <div style={{ padding: '8px', background: 'var(--accent-red-light)', borderRadius: 'var(--radius-md)', fontSize: '12px' }}>
                  ⚠️ <strong>{importPreview.unmatched.length} unmatched:</strong> {importPreview.unmatched.join(', ')}
                </div>
              )}
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>⚠️ This will overwrite your existing predictions</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={confirmImport} disabled={importLoading} className="btn btn-primary" style={{ flex: 1 }}>
                {importLoading ? '⏳ Saving...' : '✅ Confirm Import'}
              </button>
              <button onClick={() => setImportPreview(null)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar picker modal */}
      {showAvatarPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '320px', width: '100%' }}>
            <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '16px' }}>Choose your avatar</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
              {AVATARS.map(emoji => (
                <button key={emoji} onClick={() => saveAvatar(emoji)} style={{
                  fontSize: '28px', padding: '10px',
                  background: selectedAvatar === emoji ? 'var(--accent-green-light)' : 'var(--bg-secondary)',
                  border: selectedAvatar === emoji ? '2px solid var(--accent-green)' : '2px solid transparent',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                }}>
                  {emoji}
                </button>
              ))}
            </div>
            <button onClick={() => setShowAvatarPicker(false)} className="btn btn-secondary btn-full">Cancel</button>
          </div>
        </div>
      )}

      {/* Clear all confirm modal */}
      {showClearConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '340px', width: '100%' }}>
            <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '8px' }}>🗑️ Clear everything?</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              This will delete all your group predictions, knockout picks, award picks and goals predictions. This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleClearAll} disabled={clearing}
                className="btn btn-primary" style={{ background: '#e53935', flex: 1 }}>
                {clearing ? 'Clearing...' : 'Yes, clear everything'}
              </button>
              <button onClick={() => setShowClearConfirm(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
