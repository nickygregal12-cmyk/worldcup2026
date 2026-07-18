// Stage GODMODE-1 — Admin Tournament Simulator RPC wrappers (Migration 022).
// Every function is owner-gated and provisional-tournament-gated server-side;
// these wrappers only shape the calls and fail loud on errors.

import { parseExternal } from '../contracts/externalValidation.js'
import { adminRecordSchema, mutationResultSchema } from '../contracts/externalSchemas.js'
import { normaliseSimulatorStatus } from './adminSimulatorModel.js'

function throwForError(label, error) {
  if (!error) return
  const wrapped = new Error(`${label}: ${error.message}`)
  wrapped.code = error.code ?? null
  throw wrapped
}

export async function loadSimulatorStatus(client, tournamentId) {
  const response = await client.rpc('admin_simulator_status', {
    p_tournament_id: tournamentId,
  })
  throwForError('Simulator status failed', response.error)
  return normaliseSimulatorStatus(parseExternal(adminRecordSchema, response.data ?? {}, 'Simulator status response'))
}

export async function applySimulatorTime(client, tournamentId, expectedRevision, { targetAt, phaseKey, note }) {
  const response = await client.rpc('admin_simulator_set_time', {
    p_tournament_id: tournamentId,
    p_expected_revision: expectedRevision,
    p_target_at: targetAt,
    p_phase_key: phaseKey,
    p_note: note,
  })
  throwForError('Simulator time scrub failed', response.error)
  return parseExternal(mutationResultSchema, response.data ?? null, 'Simulator time response')
}

export async function resetSimulatorTime(client, tournamentId, expectedRevision, note) {
  const response = await client.rpc('admin_simulator_set_time', {
    p_tournament_id: tournamentId,
    p_expected_revision: expectedRevision,
    p_target_at: null,
    p_phase_key: null,
    p_note: note,
  })
  throwForError('Simulator return to real time failed', response.error)
  return parseExternal(mutationResultSchema, response.data ?? null, 'Simulator reset response')
}

export async function scriptSimulatorScore(client, tournamentId, { matchId, homeGoals, awayGoals, note }) {
  const response = await client.rpc('admin_simulator_script_score', {
    p_tournament_id: tournamentId,
    p_match_id: matchId,
    p_home_goals: homeGoals,
    p_away_goals: awayGoals,
    p_note: note,
  })
  throwForError('Simulator score script failed', response.error)
  return parseExternal(mutationResultSchema, response.data ?? null, 'Simulator score script response')
}

export async function clearSimulatorScoreScript(client, tournamentId, matchId, note) {
  const response = await client.rpc('admin_simulator_clear_score_script', {
    p_tournament_id: tournamentId,
    p_match_id: matchId,
    p_note: note,
  })
  throwForError('Simulator score script clear failed', response.error)
  return parseExternal(mutationResultSchema, response.data ?? null, 'Simulator score script clear response')
}

export async function seedSimulatorWorld(client, tournamentId, note) {
  const response = await client.rpc('admin_simulator_seed_world', {
    p_tournament_id: tournamentId,
    p_note: note,
  })
  throwForError('Simulator world seed failed', response.error)
  return parseExternal(mutationResultSchema, response.data ?? null, 'Simulator seed response')
}

export async function teardownSimulatorWorld(client, tournamentId, confirmation, note) {
  const response = await client.rpc('admin_simulator_teardown_world', {
    p_tournament_id: tournamentId,
    p_confirmation: confirmation,
    p_note: note,
  })
  throwForError('Simulator world teardown failed', response.error)
  return parseExternal(mutationResultSchema, response.data ?? null, 'Simulator teardown response')
}
