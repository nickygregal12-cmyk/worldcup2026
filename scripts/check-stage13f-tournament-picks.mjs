import fs from 'node:fs'

const failures = []
const requireText = (file, fragments) => {
  const text = fs.readFileSync(file, 'utf8')
  for (const fragment of fragments) {
    if (!text.includes(fragment)) failures.push(`${file} is missing: ${fragment}`)
  }
}

requireText('src/contracts/tournamentPickContract.js', [
  "'total_goals'",
  "'top_scorer'",
  "'highest_scoring_team'",
  "competition: 'original'",
  "lock: 'global_tournament_lock'",
  'jokerAllowed: false',
  'playerSelectorActivationStage: \'17A\'',
])
requireText('docs/STAGE-13F-I-TOURNAMENT-PICK-CONTRACT.md', [
  '20 points',
  'nearest absolute distance',
  'joint winner',
  'Original Predictor only',
  'Stage 17A',
  'no database migration',
])
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
console.log('Picks: total goals, top scorer and highest-scoring team.')
console.log('Scoring: 20 points each; nearest total-goals ties and official joint winners receive full points.')
console.log('Boundary: Original Predictor only, one global lock, no joker and no KO Predictor points.')
console.log('Delivery: player selector waits for Stage 17A; no database migration in Stage 13F-I.')
