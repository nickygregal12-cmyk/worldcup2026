import { useState } from 'react'
import { Link } from 'react-router-dom'

const SCORING = [
  {
    section: '⚽ Group Stage Predictions',
    desc: 'Predict the exact score for all 72 group stage matches. Picks lock at kickoff.',
    rows: [
      { label: 'Correct result (win/draw/loss)', pts: '3pts' },
      { label: 'Exact score', pts: '5pts' },
      { label: 'Wrong or missed prediction', pts: '0pts' },
    ]
  },
  {
    section: '🏆 Knockout Picks',
    desc: 'Pick which teams you think will advance through each round. Points are awarded for each team that actually makes it — regardless of which specific match they play.',
    rows: [
      { label: 'Team you predicted to qualify reaches R32 · 32 teams = max 160pts', pts: '5pts' },
      { label: 'Team you picked in R32 advances to R16 · 16 teams = max 128pts', pts: '8pts' },
      { label: 'Team you picked in R16 advances to QF · 8 teams = max 96pts', pts: '12pts' },
      { label: 'Team you picked in QF advances to SF · 4 teams = max 64pts', pts: '16pts' },
      { label: 'Team you picked in SF reaches the Final · 2 teams = max 40pts', pts: '20pts' },
      { label: 'Correct tournament winner bonus', pts: '+25pts', highlight: true },
      { label: 'Max if all picks correct including winner', pts: '513pts' },
    ]
  },
  {
    section: '🥇 Award Predictions',
    desc: 'Predict the individual award winners and tournament goal totals.',
    rows: [
      { label: 'Golden Boot (top scorer)', pts: '15pts' },
      { label: 'Golden Glove (best goalkeeper)', pts: '10pts' },
      { label: 'Player of the Tournament', pts: '10pts' },
      { label: 'Total goals — exact', pts: '15pts' },
      { label: 'Total goals — within 5', pts: '5pts' },
      { label: 'Total goals — within 10', pts: '3pts' },
    ]
  },
  {
    section: '📊 Group Position Points',
    desc: 'Awarded automatically when all 6 matches in a group are complete.',
    rows: [
      { label: 'Correct team position (per position)', pts: '2pts' },
      { label: 'All 4 positions correct (bonus)', pts: '+5pts', highlight: true },
      { label: 'Perfect group max', pts: '13pts' },
    ]
  },
  {
    section: '🃏 Joker Rules',
    desc: 'Use jokers on predictions you\'re most confident about to double your points.',
    rows: [
      { label: 'Group stage jokers available', pts: '8 total' },
      { label: 'Joker on correct result = 6pts (3pts × 2)', pts: '2× pts', highlight: true },
      { label: 'Joker on exact score = 10pts (5pts × 2)', pts: '2× pts', highlight: true },
      { label: 'Joker on wrong prediction', pts: '0pts' },
    ]
  },
  {
    section: '🔥 KO Predictor — Your Second Chance',
    desc: 'A fresh game starting 27 Jun. Predict scores for all 32 knockout matches. Separate leaderboard, fresh start — everyone is equal.',
    rows: [
      { label: 'Correct result', pts: '5pts' },
      { label: 'Exact score', pts: '10pts' },
      { label: 'Correct after extra time (+3)', pts: '+3pts' },
      { label: 'Correct penalty shootout winner (+5)', pts: '+5pts' },
      { label: 'KO Predictor jokers available', pts: '5 total' },
    ]
  },
]

const FAQS = [
  {
    q: 'When do predictions lock?',
    a: 'Group stage predictions lock at the kickoff time of each individual match. So you can update your prediction for a 9pm match right up until 9pm, even if earlier matches in that group have already started.',
  },
  {
    q: 'How do jokers work?',
    a: 'A joker doubles your points for that prediction if you get it right. You have 8 jokers for the group stage and 5 for the KO Predictor. Use them wisely — if your joker prediction is wrong, you score 0 (same as a normal wrong prediction).',
  },
  {
    q: 'What is the KO Predictor?',
    a: 'The KO Predictor is a second game that launches on 27 Jun once all group stage teams are confirmed. You predict scores for all 32 knockout matches with a completely fresh start — everyone begins on 0 points regardless of their group stage performance.',
  },
  {
    q: 'How does the leaderboard work?',
    a: 'Ranked by total points. Ties are broken first by exact scores, then by correct results. The KO Predictor has its own separate leaderboard.',
  },
  {
    q: 'Can I change my predictions?',
    a: 'Yes — you can change any prediction right up until that match kicks off. Once the match starts, your prediction is locked.',
  },
  {
    q: 'What are leagues?',
    a: 'Leagues let you compete against specific friends. Create a league, share your invite code, and see a private leaderboard just for your group. You can be in multiple leagues at once.',
  },
  {
    q: 'What happens if I miss a prediction?',
    a: 'You score 0 points for that match. There\'s no penalty for missing predictions — you just miss out on the points.',
  },
  {
    q: 'How are award predictions scored?',
    a: 'You pick the Golden Boot, Golden Glove, and Player of the Tournament winners before the tournament starts. You also predict total goals — scored based on how close you get.',
  },
]

export default function HowToPlay() {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,20,60,0.88) 0%, rgba(0,50,120,0.85) 100%), url(/howtoplay-bg.jpg) center bottom/cover no-repeat',
        padding: '28px 20px 32px', color: 'white',
      }}>
        <Link to="/" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}>
          ← Back
        </Link>
        <div style={{ fontSize: '28px', fontWeight: '900', marginBottom: '6px' }}>How to Play</div>
        <div style={{ fontSize: '14px', opacity: 0.8 }}>Everything you need to know about WC26 Predictor</div>
      </div>

      <div className="container" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Points System */}
        <div style={{ fontWeight: '800', fontSize: '18px', marginTop: '4px' }}>📊 Points System</div>

        {SCORING.map((section, i) => (
          <div key={i} className="card">
            <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '4px' }}>{section.section}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: '1.5' }}>{section.desc}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {section.rows.map((row, j) => (
                <div key={j} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: j < section.rows.length - 1 ? '1px solid var(--border-light)' : 'none',
                }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{row.label}</span>
                  <span style={{
                    fontWeight: '800', fontSize: '14px', fontFamily: 'var(--font-mono)',
                    color: row.highlight ? 'var(--accent-gold)' : 'var(--text-primary)',
                    background: row.highlight ? 'var(--accent-gold-light)' : 'transparent',
                    padding: row.highlight ? '2px 8px' : '0',
                    borderRadius: row.highlight ? 'var(--radius-full)' : '0',
                  }}>{row.pts}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* FAQ */}
        <div style={{ fontWeight: '800', fontSize: '18px', marginTop: '8px' }}>❓ FAQ</div>

        {FAQS.map((faq, i) => (
          <div key={i} className="card" style={{ cursor: 'pointer' }} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontWeight: '700', fontSize: '14px' }}>{faq.q}</div>
              <div style={{ fontSize: '18px', color: 'var(--text-muted)', flexShrink: 0, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(180deg)' : 'none' }}>⌄</div>
            </div>
            {openFaq === i && (
              <div style={{ marginTop: '10px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
                {faq.a}
              </div>
            )}
          </div>
        ))}

        {/* CTA */}
        <div className="card" style={{ background: 'var(--scottish-navy)', color: 'white', textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '22px', marginBottom: '8px' }}>🏴󠁧󠁢󠁳󠁣󠁴󠁿</div>
          <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '8px' }}>Ready to predict?</div>
          <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '16px' }}>Tournament kicks off 11 Jun · All picks lock at kickoff</div>
          <Link to="/predictions" style={{
            display: 'inline-block', background: 'white', color: 'var(--scottish-navy)',
            padding: '12px 28px', borderRadius: 'var(--radius-full)',
            fontWeight: '800', fontSize: '14px', textDecoration: 'none',
          }}>
            Make your predictions →
          </Link>
        </div>

        <div style={{ height: '16px' }} />
      </div>
    </div>
  )
}
