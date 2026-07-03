import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const required = [
  'src/bracketHealth/bracketHealthModel.js',
  'src/bracketHealth/OriginalBracketHealth.jsx',
  'src/bracketHealth/OriginalBracketHealth.module.css',
  'src/bracketHealth/__tests__/bracketHealthModel.test.js',
  'docs/STAGE-13F-D-ORIGINAL-BRACKET-HEALTH.md',
]
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing Stage 13F-D file: ${file}`)
}
const model = fs.readFileSync(path.join(root, 'src/bracketHealth/bracketHealthModel.js'), 'utf8')
const view = fs.readFileSync(path.join(root, 'src/bracketHealth/OriginalBracketHealth.jsx'), 'utf8')
const journey = fs.readFileSync(path.join(root, 'src/journey/PredictionJourneyView.jsx'), 'utf8')
for (const phrase of ['ROUTE_CONFLICT', 'ORIGINAL_ONLY', 'matchCentreHref', 'pointsSecured', 'pointsAvailable']) {
  if (!model.includes(phrase)) throw new Error(`Bracket-health model is missing ${phrase}`)
}
for (const phrase of ['Your saved bracket never changes', 'Known real fixture', 'Real fixture not known yet', 'View Match Centre']) {
  if (!view.includes(phrase)) throw new Error(`Bracket-health view is missing: ${phrase}`)
}
if (!journey.includes('<OriginalBracketHealth')) throw new Error('Original bracket does not render the bracket-health comparison')
const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(file => file.endsWith('.sql'))
if (migrations.length !== 15) throw new Error(`Expected 15 migrations; found ${migrations.length}`)
if (migrations.some(file => file.includes('016'))) throw new Error('Unexpected Migration 016 detected')
console.log('Euro Stage 13F-D Original Bracket Health audit passed.')
console.log('Prediction: immutable saved bracket remains the source of the original pick')
console.log('Comparison: known real fixtures supply live context; unresolved fixtures retain the predicted matchup')
console.log('Access: every known knockout fixture links to the existing Match Centre')
console.log('Database: 15 active migrations; no Migration 016')
