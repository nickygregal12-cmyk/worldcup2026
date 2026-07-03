import { normaliseTimeControl } from './timePhaseModel.js'

function fail(label, error) {
  if (error) throw new Error(`${label}: ${error.message}`)
}

export async function loadTournamentTimeControl(client, tournamentId) {
  const response = await client.rpc('get_tournament_time_control', { p_tournament_id: tournamentId })
  fail('Time-control load failed', response.error)
  return normaliseTimeControl(response.data ?? null)
}

export async function setTournamentTimeControl(client, tournamentId, control, values) {
  const response = await client.rpc('admin_set_tournament_time_control', {
    p_tournament_id: tournamentId,
    p_expected_revision: control.revision,
    p_simulated_at: values.simulatedAt,
    p_phase_key: values.phaseKey,
    p_note: values.note,
  })
  fail('Time-control update failed', response.error)
  return response.data
}

export async function resetTournamentTimeControl(client, tournamentId, control, note) {
  const response = await client.rpc('admin_reset_tournament_time_control', {
    p_tournament_id: tournamentId,
    p_expected_revision: control.revision,
    p_note: note,
  })
  fail('Time-control reset failed', response.error)
  return response.data
}
