import { useCallback, useEffect, useState } from 'react'
import { Activity, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Button } from '../design-system/index.jsx'
import { loadRuntimeHealth } from './healthService.js'
import { captureException, getObservabilityState } from './observability.js'

function formatCheckedAt(value) {
  if (!value) return 'Not checked'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Not checked'
    : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function HealthCheck({ label, check }) {
  const healthy = check?.status === 'ok'
  const Icon = healthy ? ShieldCheck : ShieldAlert
  return (
    <div className={`runtime-health-check ${healthy ? 'is-healthy' : 'is-degraded'}`}>
      <Icon aria-hidden="true" size={20} />
      <div>
        <strong>{label}</strong>
        <span>{check?.detail ?? 'No health detail was returned.'}</span>
      </div>
    </div>
  )
}

export default function RuntimeHealthPanel({ loader = loadRuntimeHealth }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [testEventId, setTestEventId] = useState(null)
  const reportingEnabled = getObservabilityState().enabled

  const refresh = useCallback(async () => {
    setState(previous => ({ status: 'loading', data: previous.data, error: null }))
    try {
      const data = await loader()
      setState({ status: 'ready', data, error: null })
    } catch (error) {
      setState({
        status: 'error',
        data: error?.health ?? null,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }, [loader])

  useEffect(() => {
    let active = true
    loader()
      .then(data => { if (active) setState({ status: 'ready', data, error: null }) })
      .catch(error => {
        if (!active) return
        setState({
          status: 'error',
          data: error?.health ?? null,
          error: error instanceof Error ? error.message : String(error),
        })
      })
    return () => { active = false }
  }, [loader])

  const degraded = state.status === 'error' || state.data?.status === 'degraded'

  return (
    <article className="foundation-results-card foundation-results-card--wide runtime-health-card" aria-live="polite">
      <div className="runtime-health-card__heading">
        <div>
          <span className="foundation-kicker">Deployment observability</span>
          <h3><Activity aria-hidden="true" size={22} /> Runtime heartbeat</h3>
        </div>
        <Button
          type="button"
          variant="secondary"
          icon="refresh"
          loading={state.status === 'loading'}
          onClick={refresh}
        >{state.status === 'loading' ? 'Checking…' : 'Check now'}</Button>
      </div>

      {state.status === 'loading' && !state.data && <p>Checking the deployed application and Euro staging read path…</p>}
      {state.error && <p className="foundation-alert foundation-alert--danger">{state.error}</p>}

      {state.data && (
        <>
          <div className={`runtime-health-status ${degraded ? 'is-degraded' : 'is-healthy'}`}>
            <strong>{degraded ? 'Degraded' : 'Healthy'}</strong>
            <span>{state.data.environment} · {state.data.release || 'unversioned release'}</span>
          </div>
          <div className="runtime-health-grid">
            <HealthCheck label="Application runtime" check={state.data.checks.application} />
            <HealthCheck label="Euro staging read" check={state.data.checks.database} />
          </div>
          <small>Last checked {formatCheckedAt(state.data.checked_at)}. No prediction or result data is written by this check.</small>
        </>
      )}

      <div className="runtime-health-test">
        <div>
          <strong>Sentry browser reporting</strong>
          <span>{reportingEnabled ? 'Configured for this deployed build.' : 'Not configured for this deployed build.'}</span>
          {testEventId && <small>Test event reference: <code>{testEventId}</code></small>}
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={!reportingEnabled}
          onClick={() => setTestEventId(captureException(new Error('Stage 14 owner observability test'), { tags: { source: 'admin-observability-test' } }))}
        >Send Sentry test event</Button>
      </div>
    </article>
  )
}
