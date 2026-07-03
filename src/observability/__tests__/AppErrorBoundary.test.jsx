import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppErrorBoundary from '../AppErrorBoundary.jsx'
import Stage14ErrorFixture from '../Stage14ErrorFixture.jsx'
import { clearStage14ErrorFlag } from '../stage14ErrorFlag.js'

const originalWindow = globalThis.window

afterEach(() => {
  globalThis.window = originalWindow
})

describe('application error boundary', () => {
  it('renders its children before a failure', () => {
    const boundary = new AppErrorBoundary({ children: <p>Application ready</p> })
    expect(renderToStaticMarkup(boundary.render())).toContain('Application ready')
  })

  it('renders a recovery screen after a root failure', () => {
    const boundary = new AppErrorBoundary({ children: <p>Application ready</p> })
    boundary.state = { error: new Error('Broken render'), eventId: 'a'.repeat(32) }
    const html = renderToStaticMarkup(boundary.render())
    expect(html).toContain('Euro 2028 Predictor hit a problem')
    expect(html).toContain('Try this screen again')
    expect(html).toContain('Reload the app')
    expect(html).toContain('ui-button--primary')
    expect(html).toContain('ui-button--secondary')
    expect(html).not.toContain('foundation-button')
    expect(html).not.toContain('Broken render')
  })

  it('keeps the local fixture active until a recovery action clears it', () => {
    const replaceState = vi.fn()
    globalThis.window = {
      location: {
        href: 'http://127.0.0.1:5173/?stage14_error=1',
      },
      history: { replaceState },
    }

    expect(() => Stage14ErrorFixture()).toThrow('Stage 14 local error-boundary fixture')
    expect(replaceState).not.toHaveBeenCalled()

    clearStage14ErrorFlag()
    expect(replaceState).toHaveBeenCalledWith({}, '', '/')
  })
})
