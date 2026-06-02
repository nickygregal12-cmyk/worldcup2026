import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SCORING = [
  {
    section: '⚽ Group Stage',
    items: [
      { label: 'Correct result (win/draw/loss)', pts: '3pts' },
      { label: 'Exact score', pts: '5pts' },
      { label: 'Joker (correct result)', pts: '2x pts', highlight: true },
      { label: 'Missed prediction', pts: '0pts' },
    ]
  },
  {
    section: '🏆 Knockout Picks',
    desc: 'Pick which teams advance through each round. Points awarded as teams progress — it doesn\'t matter which route they take.',
    items: [
      { label: 'Team reaches Round of 16', pts: '5pts' },
      { label: 'Team reaches Quarter-finals', pts: '8pts' },
      { label: 'Team reaches Semi-finals', pts: '12pts' },
      { label: 'Team reaches the Final', pts: '16pts' },
      { label: 'Correct tournament winner', pts: '25pts' },
      { label: 'Joker on winner pick (correct)', pts: '2x pts', highlight: true },
    ]
  },
  {
    section: '🏅 Award Predictions',
    desc: 'Predict before the tournament starts. Locks at kickoff on 11 Jun.',
    items: [
      { label: 'Golden Boot (top scorer)', pts: '15pts' },
      { label: 'Golden Glove (best goalkeeper)', pts: '10pts' },
      { label: 'Player of the Tournament', pts: '10pts' },
    ]
  },
  {
    section: '🃏 Joker Rules',
    desc: 'Use jokers on predictions you\'re most confident about to double your points.',
    items: [
      { label: 'Group stage jokers available', pts: '5 total' },
      { label: 'Knockout jokers available', pts: '3 total' },
      { label: 'If your joker prediction is correct', pts: '2x pts' },
      { label: 'If your joker prediction is wrong', pts: '0pts' },
      { label: 'Unused jokers', pts: '0pts' },
    ]
  },
]

const FAQS = [
  {
    q: 'When do predictions lock?',
    a: 'Group stage predictions lock at the kickoff time of each individual match — so you can still predict later games even after earlier ones have started. Knockout picks lock when the group stage ends on 27 June. Award predictions lock at the tournament kickoff on 11 June.',
  },
  {
    q: 'What happens if I miss a prediction?',
    a: 'You simply score 0 points for that match. Missed predictions never hurt your score — you just miss the opportunity.',
  },
  {
    q: 'Can I change my predictions?',
    a: 'Yes — you can update any prediction right up until it locks at kickoff. Once a match has kicked off, that prediction is final.',
  },
  {
    q: 'How do knockout picks work?',
    a: 'You pick which teams you think will reach each round — Round of 16, Quarter-finals, Semi-finals, Final, and the Winner. Points are awarded as teams actually progress, regardless of which route they took. So if you pick Brazil to reach the Quarter-finals, it doesn\'t matter which teams they beat to get there.',
  },
  {
    q: 'How do jokers work?',
    a: 'A joker doubles your points for that prediction if you get it right. You have 8 jokers for the group stage only. Knockout picks don't have jokers. Use them wisely — if your joker prediction is wrong, you score 0 (same as a normal wrong prediction). Jokers are not returned if wrong.',
  },
  {
    q: 'What is the Last 32?',
    a: 'The Last 32 is a fresh mini-game that launches once the group stage ends on 28 June. It\'s a completely separate game — new leagues, new leaderboard, starting from 0 points. You pick scores for every knockout match, just like the group stage. It gives everyone a second chance regardless of how the group stage went.',
  },
  {
    q: 'How do leagues work?',
    a: 'Create a private league and share your invite code with friends. Everyone\'s predictions are scored the same way, but you see a separate leaderboard just for your league. You can join multiple leagues. There\'s also a Global League everyone is automatically entered into.',
  },
  {
    q: 'What are the award predictions?',
    a: 'Before the tournament starts you can predict the Golden Boot (top scorer), Golden Glove (best goalkeeper), and Player of the Tournament. These lock at kickoff on 11 June and are scored once the tournament ends.',
  },
  {
    q: 'What time zone are kick-off times shown in?',
    a: 'All times are shown in UK time (BST — British Summer Time, UTC+1). This applies to kick-off times, prediction deadlines, and countdown timers.',
  },
  {
    q: 'How is the leaderboard ranked?',
    a: 'By total points. If two players have the same points, the player with more exact score predictions ranks higher. Further ties are broken by the number of correct results.',
  },
]

export default function HowToPlay() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0a0a0a, #1a2a1a)',
        padding: '20px', color: 'white',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '14px', marginBottom: '12px', padding: 0 }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '4px' }}>How to Play</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
          Everything you need to know about WC26 Predictor
        </p>
      </div>

      <div className="container" style={{ padding: '16px' }}>

        {/* Scoring */}
        <div style={{ marginBottom: '8px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px', marginTop: '8px' }}>
            📊 Points System
          </h2>

          {SCORING.map(section => (
            <div key={section.section} className="card" style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: section.desc ? '6px' : '12px' }}>
                {section.section}
              </div>
              {section.desc && (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: '1.5' }}>
                  {section.desc}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {section.items.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: i < section.items.length - 1 ? '1px solid var(--border-light)' : 'none',
                      background: item.highlight ? 'transparent' : 'transparent',
                    }}
                  >
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      {item.label}
                    </span>
                    <span style={{
                      fontSize: '14px', fontWeight: '800',
                      color: item.highlight ? 'var(--accent-gold)' : 'var(--text-primary)',
                      background: item.highlight ? 'var(--accent-gold-light)' : 'transparent',
                      padding: item.highlight ? '2px 8px' : '0',
                      borderRadius: 'var(--radius-full)',
                      flexShrink: 0, marginLeft: '8px',
                    }}>
                      {item.pts}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* FAQs */}
        <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px', marginTop: '8px' }}>
          ❓ Frequently Asked Questions
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="card"
              style={{ cursor: 'pointer', padding: '0', overflow: 'hidden' }}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px',
              }}>
                <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)', flex: 1, paddingRight: '12px' }}>
                  {faq.q}
                </span>
                <span style={{
                  fontSize: '18px', color: 'var(--text-muted)', flexShrink: 0,
                  transform: openFaq === i ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}>
                  ↓
                </span>
              </div>
              {openFaq === i && (
                <div style={{
                  padding: '0 16px 14px',
                  fontSize: '14px', color: 'var(--text-secondary)',
                  lineHeight: '1.6',
                  borderTop: '1px solid var(--border-light)',
                  paddingTop: '12px',
                }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Still confused */}
        <div className="card" style={{ textAlign: 'center', padding: '24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
          <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>Still have questions?</div>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            The best way to learn is to dive in — predictions take seconds and you can change them right up until kickoff!
          </div>
        </div>
      </div>
    </div>
  )
}
