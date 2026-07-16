import test from 'node:test'
import assert from 'node:assert/strict'
import { matchGoalTotal, tournamentGoalTotal } from '../src/lib/goalTotals.js'

test('uses the 90-minute score for a normal match', () => {
  assert.equal(matchGoalTotal({ home_score: 2, away_score: 1, outcome_type: '90mins' }), 3)
})

test('includes extra-time goals', () => {
  assert.equal(matchGoalTotal({
    home_score: 1,
    away_score: 1,
    outcome_type: 'et',
    aet_home_score: 2,
    aet_away_score: 1,
  }), 3)
})

test('includes extra-time goals but excludes penalty shootout kicks', () => {
  assert.equal(matchGoalTotal({
    home_score: 0,
    away_score: 0,
    outcome_type: 'penalties',
    aet_home_score: 1,
    aet_away_score: 1,
    home_score_pens: 5,
    away_score_pens: 4,
  }), 2)
})

test('adds a mixed tournament goal total correctly', () => {
  assert.equal(tournamentGoalTotal([
    { home_score: 3, away_score: 0, outcome_type: '90mins' },
    { home_score: 1, away_score: 1, outcome_type: 'et', aet_home_score: 2, aet_away_score: 1 },
    { home_score: 0, away_score: 0, outcome_type: 'penalties', aet_home_score: 1, aet_away_score: 1 },
  ]), 8)
})
