import React, { Component } from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { Button } from '../design-system/index.jsx'
import { captureException, getObservabilityState } from './observability.js'
import { clearStage14ErrorFlag } from './stage14ErrorFlag.js'

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, eventId: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    const eventId = captureException(error, {
      componentStack: info?.componentStack,
      tags: { boundary: 'application-root' },
    })
    this.setState({ eventId })
  }

  handleRetry = () => {
    clearStage14ErrorFlag()
    this.setState({ error: null, eventId: null })
  }

  handleReload = () => {
    clearStage14ErrorFlag()
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    const monitored = getObservabilityState().enabled
    return (
      <main className="bootstrap-screen bootstrap-screen--error" role="alert">
        <section className="foundation-card observability-error-card">
          <span className="foundation-badge foundation-badge--danger">Application error</span>
          <h1>Euro 2028 Predictor hit a problem</h1>
          <p>Your predictions have not been deliberately changed. Try reopening this screen or reload the app.</p>
          {monitored && this.state.eventId && <p className="observability-error-reference">Reference: <code>{this.state.eventId}</code></p>}
          <div className="observability-error-actions">
            <Button type="button" variant="primary" onClick={this.handleRetry}>Try this screen again</Button>
            <Button type="button" variant="secondary" onClick={this.handleReload}>Reload the app</Button>
          </div>
        </section>
      </main>
    )
  }
}
