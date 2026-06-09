import { useState } from 'react'
import { Link } from 'react-router-dom'

const SCORING = [
  {
    section: '⚽ Group Stage Predictions',
    desc: 'Predict the exact score for all 72 group stage matches. Once the first match in a group kicks off, all remaining matches in that group lock too.',
    rows: [
      { label: 'Correct result (win/draw/loss)', pts: '3pts' },
      { label: 'Exact score', pts: '5pts' },
      { label: 'Joker doubles points if correct', pts: '2×', highlight: true },
      { label: 'Wrong or missed prediction', pts: '0pts' },
      { label: 'Group stage jokers available', pts: '8 total' },
    ]
  },
  {
    section: '🏆 Knockout Bracket',
    desc: 'Pick which teams advance through each round before Matchday 1 ends. Points awarded for each team that actually makes it — regardless of which specific match they play.',
    rows: [
      { label: 'Team reaches Round of 32 (32 teams)', pts: '5pts' },
      { label: 'Team reaches Round of 16 (16 teams)', pts: '8pts' },
      { label: 'Team reaches Quarter-finals (8 teams)', pts: '12pts' },
      { label: 'Team reaches Semi-finals (4 teams)', pts: '16pts' },
      { label: 'Team reaches the Final (2 teams)', pts: '20pts' },
      { label: 'Correct tournament winner bonus', pts: '+25pts', highlight: true },
      { label: 'Maximum if all picks correct', pts: '513pts' },
    ]
  },
  {
    section: '🥇 Award Predictions',
    desc: 'Predict the individual award winners and total goals scored in the tournament. These lock when the tournament begins (Thu 11 Jun, 20:00 BST).',
    rows: [
      { label: 'Golden Boot — top scorer', pts: '15pts' },
      { label: 'Golden Glove — best goalkeeper', pts: '10pts' },
      { label: 'Player of the Tournament', pts: '10pts' },
      { label: 'Total goals — exact', pts: '15pts' },
      { label: 'Total goals — within 5', pts: '5pts' },
      { label: 'Total goals — within 10', pts: '3pts' },
    ]
  },
  {
    section: '🃏 Joker Rules',
    desc: 'Use jokers on group stage predictions you\'re most confident about to double your points.',
    rows: [
      { label: 'Jokers available for group stage', pts: '8 total' },
      { label: 'Joker on correct result = 6pts', pts: '2× pts', highlight: true },
      { label: 'Joker on exact score = 10pts', pts: '2× pts', highlight: true },
      { label: 'Joker on wrong prediction', pts: '0pts' },
      { label: 'One joker max per match', pts: '—' },
    ]
  },
  {
    section: '🔥 KO Predictor — A Completely Separate Game',
    desc: 'A fresh game starting 28 Jun. Predict scores for all 32 knockout matches including how they end. Separate leaderboard, fresh start — everyone begins at 0.',
    rows: [
      { label: 'Correct winner only', pts: '5pts' },
      { label: 'Correct winner + exact score', pts: '10pts' },
      { label: 'Predicted ET correctly (match went to ET)', pts: '+3pts', highlight: true },
      { label: 'Predicted Penalties correctly (match went to PENS)', pts: '+5pts', highlight: true },
      { label: 'Got winner right but wrong on ET/PENS', pts: '3pts ⚠️' },
      { label: 'First goal time band correct', pts: '+3pts' },
      { label: 'KO Predictor jokers available', pts: '5 total' },
    ]
  },
]

const LOCKS = [
  {
    icon: '⚽',
    title: 'Group predictions',
    time: 'When the first match in each group kicks off',
    detail: 'Once any match in a group starts, all picks in that group lock — including matches scheduled for later dates. This stops anyone using live results to adjust their remaining picks in the same group.',
    color: 'var(--accent-green)',
  },
  {
    icon: '🏆',
    title: 'Knockout bracket',
    time: 'Locks progressively as groups kick off',
    detail: 'Your bracket is based on your group predictions — so as each group locks at first kickoff, those bracket slots lock too. The whole bracket is fully frozen by Wed 18 Jun before Matchday 2 starts.',
    color: 'var(--scottish-navy)',
  },
  {
    icon: '🥇',
    title: 'Award predictions',
    time: 'Thu 11 Jun · 20:00 BST',
    detail: 'Golden Boot, Golden Glove, Player of the Tournament and total goals all lock when the tournament kicks off.',
    color: '#b8860b',
  },
  {
    icon: '🔥',
    title: 'KO Predictor',
    time: 'Each match locks at kickoff',
    detail: 'The KO Predictor is a separate game starting 28 Jun. Each knockout match locks individually at its own kickoff.',
    color: '#7c3aed',
  },
]

const FAQS = [
  {
    q: 'When do group predictions lock?',
    a: 'Once the first match in a group kicks off, all remaining matches in that group lock immediately — even ones scheduled days later. This stops anyone using live results (like watching Mexico lose 2-0 then adjusting their other Group A picks). Your knockout bracket also locks separately on Wed 18 Jun before Matchday 2 starts.',
  },

  {
    q: 'How does the knockout bracket work?',
    a: 'You pick which teams you think will advance through each round — Round of 32, Round of 16, Quarter-finals, Semi-finals, and the Final. Points are awarded for every team that actually reaches that round in real life, regardless of which match they play. The bracket is based on your predicted group standings and locks progressively as each group kicks off — fully frozen by Wed 18 Jun before Matchday 2 starts.',
  },
  {
    q: 'How do jokers work?',
    a: 'A joker doubles your points for that prediction if you get it right. You have 8 jokers for the group stage and 5 for the KO Predictor. Jokers must be applied before the match kicks off. If your joker prediction is wrong, you score 0 — same as a normal wrong prediction.',
  },
  {
    q: 'What is the KO Predictor?',
    a: 'The KO Predictor is completely separate from the Knockout Bracket — do not confuse the two! The Knockout Bracket is where you predict which teams advance each round (based on your group predictions). The KO Predictor opens once all 32 knockout teams are confirmed from real results. You predict scores for all 32 knockout matches with a completely fresh start — everyone begins on 0 points regardless of their group stage performance. It has its own separate leaderboard. For each match you also predict whether it ends in 90 minutes, extra time, or penalties — getting the right winner earns 5pts, with a bonus if you also called ET or pens correctly. If you picked the right winner but wrong outcome (e.g. said 90 mins but it went to ET) you get 3pts instead.',
  },
  {
    q: 'How does the leaderboard work?',
    a: 'Ranked by total points across group predictions, knockout bracket, and awards. Ties are broken by exact scores first, then correct results. The KO Predictor has its own separate leaderboard.',
  },
  {
    q: 'What are leagues?',
    a: 'Leagues let you compete against specific friends or colleagues. Create a league, share your invite code, and see a private leaderboard just for your group. You can be in multiple leagues at once. League admins can also add offline players (people without accounts) and enter their picks manually.',
  },
  {
    q: 'What happens if I miss a prediction?',
    a: 'You score 0 points for that match. There\'s no penalty — you just miss out on the points. You can still make predictions for future matches at any time before they kick off.',
  },
  {
    q: 'How are award predictions scored?',
    a: 'Golden Boot, Golden Glove, and Player of the Tournament are simple pick-the-winner predictions — awarded at the end of the tournament once FIFA confirms the winners. Total goals is scored based on how close your prediction is to the actual number of goals scored across all 104 matches.',
  },
  {
    q: 'Can I join a league after the tournament starts?',
    a: 'Yes — you can join leagues at any time. Your points from matches already played still count, so you\'ll slot into the leaderboard at whatever score you\'ve already accumulated.',
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

        {/* Lock dates */}
        <div style={{ fontWeight: '800', fontSize: '18px', marginTop: '8px' }}>🔒 Lock Dates</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '-4px', marginBottom: '4px' }}>
          Different parts of the game lock at different times — here's everything you need to know.
        </div>

        {LOCKS.map((lock, i) => (
          <div key={i} className="card" style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
              background: `${lock.color}18`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '20px', flexShrink: 0,
            }}>
              {lock.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '2px' }}>{lock.title}</div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: lock.color, marginBottom: '6px' }}>
                🔒 {lock.time}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{lock.detail}</div>
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
          <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '16px' }}>Tournament kicks off Thu 11 Jun · 20:00 BST</div>
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
