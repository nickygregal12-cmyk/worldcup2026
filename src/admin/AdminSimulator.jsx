import { useCallback, useEffect, useMemo, useState } from 'react'
import { ENVIRONMENT } from '../config/environment.js'
import { SelectField } from '../design-system/index.jsx'
import { TIME_PHASE_PRESETS } from '../timePhase/timePhaseModel.js'
import {
  SIMULATOR_TEARDOWN_CONFIRMATION,
  EMPTY_SIMULATOR_STATUS,
  isValidScriptedGoals,
  parseUtcInstant,
} from './adminSimulatorModel.js'
import {
  applySimulatorTime,
  clearSimulatorScoreScript,
  loadSimulatorStatus,
  resetSimulatorTime,
  scriptSimulatorScore,
  seedSimulatorWorld,
  teardownSimulatorWorld,
} from './adminSimulatorService.js'

function presetValue(iso) {
  return iso.slice(0, 16)
}

function formatInstant(value) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/London',
  }).format(new Date(value))
}

function GoalsInput({ label, value, onChange, disabled = false }) {
  return (
    <label className="foundation-admin-score-field">
      <span>{label}</span>
      <input
        type="number"
        min="0"
        max="20"
        step="1"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  )
}

export default function AdminSimulator({ client, tournamentId, adminRole, matches, runAction, onClockChanged }) {
  const [status, setStatus] = useState({ state: 'loading', data: EMPTY_SIMULATOR_STATUS, error: null })
  const [timeDraft, setTimeDraft] = useState({
    phaseKey: TIME_PHASE_PRESETS[0].key,
    customAt: presetValue(TIME_PHASE_PRESETS[0].at),
    note: '',
  })
  const [scriptDraft, setScriptDraft] = useState({ matchId: '', home: '', away: '', note: '' })
  const [worldNote, setWorldNote] = useState('')

  const owner = adminRole === 'owner'
  const environmentAllowed = ENVIRONMENT.appEnv === 'staging' && ENVIRONMENT.enableTimeTravel

  const refreshStatus = useCallback(async () => {
    try {
      const data = await loadSimulatorStatus(client, tournamentId)
      setStatus({ state: 'ready', data, error: null })
    } catch (error) {
      setStatus({ state: 'error', data: EMPTY_SIMULATOR_STATUS, error: error instanceof Error ? error.message : String(error) })
    }
  }, [client, tournamentId])

  useEffect(() => {
    void Promise.resolve().then(refreshStatus)
  }, [refreshStatus])

  const groupMatches = useMemo(
    () => matches.filter(match => match.matchNumber >= 1 && match.matchNumber <= 36),
    [matches],
  )

  // Every simulator write refreshes this section's status and the shared
  // application clock (the global simulated-time banner follows the latter).
  const runSimulatorAction = (work, successMessage, confirmation) => runAction(
    async () => {
      await work()
      await refreshStatus()
      await onClockChanged?.()
    },
    successMessage,
    confirmation,
  )

  const choosePreset = key => {
    const preset = TIME_PHASE_PRESETS.find(item => item.key === key)
    setTimeDraft(previous => ({
      ...previous,
      phaseKey: key,
      customAt: preset ? presetValue(preset.at) : previous.customAt,
    }))
  }

  const data = status.data
  const clock = data.clock
  const scriptGoalsValid = isValidScriptedGoals(scriptDraft.home) && isValidScriptedGoals(scriptDraft.away)

  return (
    <div className="foundation-control-room">
      <div className="foundation-admin-workspace">
        <article className="foundation-results-card foundation-results-card--wide">
          <span className="foundation-kicker">Staging only · owner controlled</span>
          <h3>Simulator status</h3>
          <p>
            The simulator drives the scenario-runner operations in-app: timeline scrubbing, per-match
            score scripting and synthetic world seed/teardown. Simulated results are recorded as
            system results on the provisional staging tournament only and never become official records.
          </p>
          {!environmentAllowed && (
            <p className="foundation-empty-copy">Disabled: this build must use VITE_APP_ENV=staging and VITE_ENABLE_TIME_TRAVEL=true.</p>
          )}
          {status.state === 'error' && <p className="foundation-empty-copy" role="alert">{status.error}</p>}
          <div className="foundation-feature-controls">
            <div className="foundation-feature-control">
              <div>
                <strong>{clock.isEnabled ? 'Simulation active' : 'Real time active'}</strong>
                <span>{clock.isEnabled ? `${formatInstant(clock.simulatedAt)} · ${String(clock.phaseKey ?? 'custom').replaceAll('_', ' ')}` : 'No simulated clock is applied.'}</span>
                <small>Clock revision {clock.revision}</small>
              </div>
            </div>
            <div className={data.worldSeeded ? 'foundation-feature-control' : 'foundation-feature-control foundation-feature-control--disabled'}>
              <div>
                <strong>{data.worldSeeded ? 'Synthetic world seeded' : 'No synthetic world'}</strong>
                <span>{data.counts.syntheticUsers} synthetic players · {data.counts.leagues} leagues · {data.counts.matchPredictions} predictions</span>
                <small>{data.counts.confirmedResults} confirmed results · {data.counts.liveMatches} live · {data.counts.scoreScripts} scripted scores</small>
              </div>
            </div>
          </div>
        </article>

        <article className="foundation-results-card foundation-results-card--wide">
          <span className="foundation-kicker">Timeline scrubbing</span>
          <h3>Move the tournament to any instant</h3>
          <p>
            Applying an instant records the derived world through the real result, resolver and
            scoring functions: finished group matches gain deterministic results, one match may be
            live, the rest stay scheduled, and knockout fixtures resolve once the group stage is
            complete. Scrubbing is idempotent and works in both directions.
          </p>
          {!owner && <p className="foundation-empty-copy">Only a tournament owner can scrub the timeline.</p>}
          {owner && (
            <>
              <div className="foundation-admin-form-grid">
                <SelectField
                  label="Scenario preset"
                  value={timeDraft.phaseKey}
                  onChange={choosePreset}
                  options={TIME_PHASE_PRESETS.map(item => ({ value: item.key, label: item.label }))}
                />
                <label>
                  <span>Simulated instant (UTC, for example 2028-06-14T20:00)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="2028-06-14T20:00"
                    value={timeDraft.customAt}
                    onChange={event => setTimeDraft(previous => ({ ...previous, customAt: event.target.value, phaseKey: 'custom' }))}
                  />
                </label>
              </div>
              <label className="foundation-admin-note">
                <span>Audit note</span>
                <textarea
                  value={timeDraft.note}
                  maxLength="500"
                  onChange={event => setTimeDraft(previous => ({ ...previous, note: event.target.value }))}
                  placeholder="Explain the scenario being simulated or why real time is being restored."
                />
              </label>
              <div className="foundation-feature-control__action">
                <button
                  type="button"
                  className="ui-button ui-button--primary"
                  disabled={!environmentAllowed || !parseUtcInstant(timeDraft.customAt) || timeDraft.note.trim().length < 5}
                  onClick={() => runSimulatorAction(
                    () => applySimulatorTime(client, tournamentId, clock.revision, {
                      targetAt: parseUtcInstant(timeDraft.customAt).toISOString(),
                      phaseKey: timeDraft.phaseKey,
                      note: timeDraft.note,
                    }),
                    'Simulated instant applied. The world now reflects the scrubbed timeline.',
                    {
                      title: 'Scrub the tournament timeline?',
                      message: 'This records simulated system results for every group match the scrubbed clock says has finished, reruns scoring, and moves the shared application clock.',
                      confirmLabel: 'Apply simulated instant',
                      tone: 'warning',
                    },
                  )}
                >Apply simulated instant</button>
                <button
                  type="button"
                  className="ui-button ui-button--secondary"
                  disabled={!environmentAllowed || !clock.isEnabled || timeDraft.note.trim().length < 5}
                  onClick={() => runSimulatorAction(
                    () => resetSimulatorTime(client, tournamentId, clock.revision, timeDraft.note),
                    'Real time restored. Every simulated result was unwound.',
                    {
                      title: 'Return to real time?',
                      message: 'This unwinds every simulated result back to the pre-tournament state, reruns scoring, and disables the simulated clock.',
                      confirmLabel: 'Return to real time',
                      tone: 'danger',
                    },
                  )}
                >Return to real time</button>
              </div>
            </>
          )}
        </article>

        <article className="foundation-results-card foundation-results-card--wide">
          <span className="foundation-kicker">Score scripting</span>
          <h3>Script a group-match score</h3>
          <p>
            A scripted score replaces the deterministic default for one group match. While the
            simulated clock is active the world is re-reconciled immediately; clearing a script
            restores the deterministic default the same way.
          </p>
          {!owner && <p className="foundation-empty-copy">Only a tournament owner can script scores.</p>}
          {owner && (
            <>
              <div className="foundation-admin-form-grid">
                <SelectField
                  label="Group match"
                  value={scriptDraft.matchId}
                  onChange={matchId => setScriptDraft(previous => ({ ...previous, matchId }))}
                  options={groupMatches.map(match => ({
                    value: match.matchId,
                    label: `${match.matchNumber}. ${match.homeTeamLabel} v ${match.awayTeamLabel}`,
                  }))}
                />
                <div className="foundation-admin-score-grid">
                  <GoalsInput label="Home goals" value={scriptDraft.home} onChange={home => setScriptDraft(previous => ({ ...previous, home }))} />
                  <GoalsInput label="Away goals" value={scriptDraft.away} onChange={away => setScriptDraft(previous => ({ ...previous, away }))} />
                </div>
              </div>
              <label className="foundation-admin-note">
                <span>Audit note</span>
                <textarea
                  value={scriptDraft.note}
                  maxLength="500"
                  onChange={event => setScriptDraft(previous => ({ ...previous, note: event.target.value }))}
                  placeholder="Explain the scripted scenario, for example an engineered tiebreak."
                />
              </label>
              <div className="foundation-feature-control__action">
                <button
                  type="button"
                  className="ui-button ui-button--primary"
                  disabled={!environmentAllowed || !scriptDraft.matchId || !scriptGoalsValid || scriptDraft.note.trim().length < 5}
                  onClick={() => runSimulatorAction(
                    () => scriptSimulatorScore(client, tournamentId, {
                      matchId: scriptDraft.matchId,
                      homeGoals: Number(scriptDraft.home),
                      awayGoals: Number(scriptDraft.away),
                      note: scriptDraft.note,
                    }),
                    'Scripted score saved. It applies whenever the simulated clock finishes that match.',
                  )}
                >Save scripted score</button>
              </div>
            </>
          )}
          <div className="foundation-grace-list">
            {data.scoreScripts.length === 0 && <p className="foundation-empty-copy">No scripted scores are active.</p>}
            {data.scoreScripts.map(script => {
              const match = groupMatches.find(item => item.matchId === script.matchId)
              return (
                <div key={script.matchId}>
                  <div>
                    <strong>Match {script.matchNumber}: scripted {script.homeGoals}-{script.awayGoals}</strong>
                    <span>{match ? `${match.homeTeamLabel} v ${match.awayTeamLabel}` : 'Group match'}</span>
                  </div>
                  {owner && (
                    <div className="foundation-feature-control__action">
                      <button
                        type="button"
                        className="ui-button ui-button--secondary ui-button--small"
                        disabled={!environmentAllowed}
                        onClick={() => runSimulatorAction(
                          () => clearSimulatorScoreScript(client, tournamentId, script.matchId, `Clear scripted score for match ${script.matchNumber}`),
                          `Scripted score for match ${script.matchNumber} cleared.`,
                        )}
                      >Clear</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </article>

        <article className="foundation-results-card foundation-results-card--wide">
          <span className="foundation-kicker">Synthetic world</span>
          <h3>Seed or tear down the 19-persona world</h3>
          <p>
            Seeding creates the nineteen dual-marker synthetic players with complete predictions,
            brackets and leagues so leaderboards, leagues, Home, head-to-head and Match Centre can be
            exercised under simulated inputs. Teardown removes only dual-marker synthetic data, unwinds
            every simulated result and disables the simulated clock.
          </p>
          {!owner && <p className="foundation-empty-copy">Only a tournament owner can seed or tear down the synthetic world.</p>}
          {owner && (
            <>
              <label className="foundation-admin-note">
                <span>Audit note</span>
                <textarea
                  value={worldNote}
                  maxLength="500"
                  onChange={event => setWorldNote(event.target.value)}
                  placeholder="Explain why the synthetic world is being seeded or removed."
                />
              </label>
              <div className="foundation-feature-control__action">
                <button
                  type="button"
                  className="ui-button ui-button--primary"
                  disabled={!environmentAllowed || worldNote.trim().length < 5}
                  onClick={() => runSimulatorAction(
                    () => seedSimulatorWorld(client, tournamentId, worldNote),
                    'Synthetic world seeded: nineteen personas with predictions, brackets and leagues.',
                    {
                      title: 'Seed the synthetic world?',
                      message: 'This creates the nineteen dual-marker synthetic players with predictions, brackets and leagues. Re-seeding tops up whatever is missing.',
                      confirmLabel: 'Seed synthetic world',
                      tone: 'warning',
                    },
                  )}
                >Seed synthetic world</button>
                <button
                  type="button"
                  className="foundation-danger-button"
                  disabled={!environmentAllowed || !data.worldSeeded || worldNote.trim().length < 5}
                  onClick={() => runSimulatorAction(
                    () => teardownSimulatorWorld(client, tournamentId, SIMULATOR_TEARDOWN_CONFIRMATION, worldNote),
                    'Synthetic world removed with zero residue. Real time restored.',
                    {
                      title: 'Tear down the synthetic world?',
                      message: 'This deletes every dual-marker synthetic player, their predictions, points and leagues, clears scripted scores, unwinds simulated results and disables the simulated clock. Real accounts and official data are untouched.',
                      confirmLabel: 'Tear down synthetic world',
                      tone: 'danger',
                    },
                  )}
                >Tear down synthetic world</button>
              </div>
            </>
          )}
        </article>
      </div>
    </div>
  )
}
