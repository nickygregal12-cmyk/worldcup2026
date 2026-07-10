import fs from 'node:fs'

const failures = []
const requireText = (file, fragments) => {
  const text = fs.readFileSync(file, 'utf8')
  for (const fragment of fragments) {
    if (!text.includes(fragment)) failures.push(`${file} is missing: ${fragment}`)
  }
}
const forbidText = (file, fragments) => {
  const text = fs.readFileSync(file, 'utf8')
  for (const fragment of fragments) {
    if (text.includes(fragment)) failures.push(`${file} still contains superseded value: ${fragment}`)
  }
}

// Contract migrated at Stage DP-SCORING: Top Scorer 30, tiered group-goals
// 25/15/5, Highest-Scoring Team removed entirely.
requireText('src/contracts/tournamentPickContract.js', [
  "'total_goals'",
  "'top_scorer'",
  "competition: 'original'",
  "lock: 'global_tournament_lock'",
  'jokerAllowed: false',
  "playerSelectorActivationStage: '17A'",
  'EXACT: 25',
  'WITHIN_5: 15',
  'WITHIN_10: 5',
  ']: 30',
])
forbidText('src/contracts/tournamentPickContract.js', ['highest_scoring_team', 'HIGHEST_SCORING_TEAM'])

requireText('docs/STAGE-13F-I-TOURNAMENT-PICK-CONTRACT.md', [
  'Total group-stage goals',
  '25 / 15 / 5 points',
  'Top scorer',
  '30 points',
  'Original Predictor only',
  'Stage 17A',
])
forbidText('docs/STAGE-13F-I-TOURNAMENT-PICK-CONTRACT.md', ['20 points', 'Highest-scoring team'])

requireText('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md', [
  'Tournament-pick contract',
  '13F-J',
  'Stage 13F-K',
  '`74c8dd3`',
])

if (failures.length) {
  console.error('Euro Stage 13F-I tournament-pick contract audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Euro Stage 13F-I tournament-pick contract audit passed.')
console.log('Picks: total group-stage goals (tiered 25/15/5, auto-calculated) and top scorer (30).')
console.log('Scoring: official joint top-scorer winners receive the full 30; Highest-Scoring Team removed.')
console.log('Boundary: Original Predictor only, one global lock, no joker and no KO Predictor points.')
console.log('Delivery: player selector waits for Stage 17A; scoring-value alignment landed in Stage DP-SCORING.')
