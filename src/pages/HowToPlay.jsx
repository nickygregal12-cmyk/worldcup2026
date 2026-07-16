import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DATES } from '../lib/tournamentDates.js'
import WorldCupLogo from '../components/WorldCupLogo.jsx'

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
      { label: 'Correct group finishing position (per team)', pts: '+2pts', highlight: true },
      { label: 'Perfect group — all 4 positions correct', pts: '+5pts bonus', highlight: true },
    ]
  },
  {
    section: '🏆 Knockout Bracket',
    desc: 'Pick which teams advance through each round before the bracket deadline. Points awarded for each team that actually makes it — regardless of which specific match they play.',
    rows: [
      { label: 'Team reaches Round of 32 (32 teams)', pts: '5pts' },
      { label: 'Team reaches Round of 16 (16 teams)', pts: '8pts' },
      { label: 'Team reaches Quarter-finals (8 teams)', pts: '12pts' },
      { label: 'Team reaches Semi-finals (4 teams)', pts: '16pts' },
      { label: 'Team reaches the Final (2 teams)', pts: '20pts' },
      { label: 'Pick the World Cup Winner correctly', pts: '25pts', highlight: true },
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
    detail: 'Your bracket is based on your group predictions — so as each group locks at first kickoff, those bracket slots lock too. The bracket becomes fully frozen once every group slot has locked.',
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
    a: 'Once the first match in a group kicks off, all remaining matches in that group lock immediately — even ones scheduled days later. This stops anyone using live results (like watching Mexico lose 2-0 then adjusting their other Group A picks). Your Tournament Bracket locks progressively as each group begins.',
  },

  {
    q: 'How does the knockout bracket work?',
    a: 'You pick which teams you think will advance through each round — Round of 32, Round of 16, Quarter-finals, Semi-finals, and the Final. Points are awarded for every team that actually reaches that round in real life, regardless of which match they play. The bracket is based on your predicted group standings and locks progressively as each group kicks off — fully frozen once every group slot has locked.',
  },
  {
    q: 'How do jokers work?',
    a: 'A joker doubles your points for that prediction if you get it right. You have 8 jokers for the group stage and 5 for the KO Predictor. Jokers must be applied before the match kicks off. If your joker prediction is wrong, you score 0 — same as a normal wrong prediction.',
  },
  {
    q: 'Do I get bonus points for predicting group standings?',
    a: 'Yes — once all matches in a group are completed, you earn +2pts for every team you correctly predicted to finish in that position (1st, 2nd, 3rd or 4th). If you get all 4 positions right in a group you also get a +5pt perfect group bonus. Maximum 13pts per group, 156pts across all 12 groups.',
  },
  {
    q: 'What is the daily question?',
    a: 'Each day at 1pm BST a fun question appears on the Home page — things like "Will there be a red card today?" or "Will Scotland beat Haiti?". Tap to answer before the match. After answering you see how the community voted. Daily questions are just for fun — they do not affect your leaderboard score. You do build a personal answer streak and correct/wrong tally on your profile, but these are separate from the main game.',
  },
  {
    q: 'What is the KO Predictor?',
    a: 'The KO Predictor is completely separate from the Knockout Bracket. For every match, predict the score after 90 minutes, the team that will advance, the method of advancement when required, and the first-goal band. An exact 90-minute score earns 10pts, a correct 90-minute result earns 5pts, the correct advancing team can earn +5pts where it is not already rewarded by the normal-time result, the correct method earns +3pts for extra time or +5pts for penalties when the advancing team is also correct, and the first-goal band earns +3pts. A joker doubles the complete total.',
  },
  {
    q: 'How does the leaderboard work?',
    a: 'Ranked by total points across group predictions, knockout bracket, and awards. Ties are broken by exact scores first, then username. The KO Predictor has its own separate leaderboard.',
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
  const [faqSearch, setFaqSearch] = useState('')
  const [faqCategory, setFaqCategory] = useState('All')

  const faqCategories = ['All', 'Predictions', 'Scoring', 'Knockouts', 'Leagues', 'Account']
  const categoriseFaq = (question) => {
    const q = question.toLowerCase()
    if (q.includes('league')) return 'Leagues'
    if (q.includes('knockout') || q.includes('ko predictor')) return 'Knockouts'
    if (q.includes('account') || q.includes('miss a prediction')) return 'Account'
    if (q.includes('score') || q.includes('points') || q.includes('joker') || q.includes('award')) return 'Scoring'
    return 'Predictions'
  }
  const filteredFaqs = useMemo(() => FAQS.map((faq, originalIndex) => ({ ...faq, originalIndex, category: categoriseFaq(faq.q) })).filter(faq => {
    const matchesCategory = faqCategory === 'All' || faq.category === faqCategory
    const query = faqSearch.trim().toLowerCase()
    const matchesSearch = !query || faq.q.toLowerCase().includes(query) || faq.a.toLowerCase().includes(query)
    return matchesCategory && matchesSearch
  }), [faqCategory, faqSearch])

  const jumpTo = (value) => {
    if (!value) return
    document.getElementById(value)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,20,60,0.88) 0%, rgba(0,50,120,0.85) 100%), url(/howtoplay-bg.jpg) center bottom/cover no-repeat',
        padding: '28px 20px 32px', color: 'white', position: 'relative', overflow: 'hidden',
      }}>
        <WorldCupLogo variant="watermark" size={170} opacity={0.1} style={{ right: '-18px' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
        <Link to="/" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}>
          ← Back
        </Link>
        <div style={{ fontSize: '28px', fontWeight: '900', marginBottom: '6px' }}>How to Play</div>
        <div style={{ fontSize: '14px', opacity: 0.8 }}>Everything you need to know about WC26 Predictor</div>
        </div>
      </div>

      <div className="howto-jump" aria-label="How to play sections">
        <label htmlFor="howto-section">Jump to section</label>
        <select id="howto-section" defaultValue="" onChange={e => jumpTo(e.target.value)}>
          <option value="" disabled>Select a section…</option>
          <option value="points-system">Points system</option>
          <option value="lock-dates">Lock dates</option>
          <option value="ko-predictor-rules">KO Match Predictor</option>
          <option value="faq">FAQ</option>
        </select>
      </div>

      <div className="container howto-content" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Points System */}
        <div id="points-system" className="howto-anchor" style={{ fontWeight: '800', fontSize: '18px', marginTop: '4px' }}>📊 Points System</div>

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
        <div id="lock-dates" className="howto-anchor" style={{ fontWeight: '800', fontSize: '18px', marginTop: '8px' }}>🔒 Lock Dates</div>
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

        {/* KO Predictor — after locks since it's a future game */}
        <div id="ko-predictor-rules" className="howto-anchor" style={{ fontWeight: '800', fontSize: '18px', marginTop: '8px' }}>🔥 KO Match Predictor</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', marginTop: '4px', padding: '10px 14px', background: 'rgba(230,81,0,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(230,81,0,0.15)' }}>
          A separate game from the Tournament Bracket. It opens once all 32 knockout teams are confirmed from real results. Everyone starts at 0 points, regardless of their group-stage score.
        </div>
        <div className="card" style={{ marginBottom: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              {[
                { label: 'Exact 90-minute score', pts: '10pts' },
                { label: 'Correct 90-minute result', pts: '5pts' },
                { label: 'Correct team to advance', pts: '+5pts' },
                { label: 'Correct method of advancement', pts: '+3pts', highlight: true },
                { label: 'Correct first-goal band', pts: '+3pts' },
                { label: 'Joker doubles the complete total', pts: '2×', highlight: true },
                { label: 'KO Predictor jokers available', pts: '5 total' },
              ].map(({ label, pts, highlight }) => (
                <tr key={label} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '8px 4px', color: highlight ? '#e65100' : 'var(--text-primary)', fontWeight: highlight ? '600' : '400' }}>{label}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '700', color: '#e65100', whiteSpace: 'nowrap' }}>{pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.55, margin: '-1px 4px 12px' }}>
          The method bonus applies only when the selected advancing team is also correct. A normal-time winner is not rewarded twice for the same prediction.
        </div>

        {/* FAQ */}
        <div id="faq" className="howto-anchor" style={{ fontWeight: '800', fontSize: '18px', marginTop: '8px' }}>❓ FAQ</div>

        <div className="card faq-tools">
          <label className="label" htmlFor="faq-search">Search questions</label>
          <input id="faq-search" className="input" type="search" placeholder="Search scoring, leagues, knockouts…" value={faqSearch} onChange={e => setFaqSearch(e.target.value)} />
          <div className="faq-category-row" aria-label="FAQ categories">
            {faqCategories.map(category => (
              <button key={category} type="button" className={`faq-category ${faqCategory === category ? 'active' : ''}`} onClick={() => setFaqCategory(category)}>{category}</button>
            ))}
          </div>
        </div>

        {filteredFaqs.map((faq) => (
          <div key={faq.originalIndex} className="card faq-card">
            <button type="button" className="faq-question" aria-expanded={openFaq === faq.originalIndex} onClick={() => setOpenFaq(openFaq === faq.originalIndex ? null : faq.originalIndex)}>
              <span>{faq.q}</span>
              <span aria-hidden="true" className={openFaq === faq.originalIndex ? 'faq-chevron open' : 'faq-chevron'}>⌄</span>
            </button>
            {openFaq === faq.originalIndex && (
              <div className="faq-answer">{faq.a}</div>
            )}
          </div>
        ))}
        {filteredFaqs.length === 0 && <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No questions match that search.</div>}

        {/* CTA */}
        <div className="card" style={{ background: 'var(--scottish-navy)', color: 'white', textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '22px', marginBottom: '8px' }}>🏴󠁧󠁢󠁳󠁣󠁴󠁿</div>
          <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '8px' }}>Ready to predict?</div>
          <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '16px' }}>
            {new Date() >= DATES.TOURNAMENT_START
              ? 'Tournament is underway — predict upcoming matches!'
              : 'Tournament kicks off Thu 11 Jun · 20:00 BST'}
          </div>
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
