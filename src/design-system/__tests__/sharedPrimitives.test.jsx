import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ConfirmDialog, SelectField } from '../index.jsx'

describe('shared design-system primitives', () => {
  it('renders a labelled design-system selector', () => {
    const html = renderToStaticMarkup(
      <SelectField
        label="League"
        value="a"
        onChange={() => {}}
        options={[{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }]}
      />,
    )
    expect(html).toContain('data-design-system-select="true"')
    expect(html).toContain('Alpha')
    expect(html).toContain('<select')
  })

  it('renders a shared confirmation dialog for destructive actions', () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog open title="Sign out?" confirmLabel="Sign out" cancelLabel="Stay signed in" tone="danger" onConfirm={() => {}} onCancel={() => {}}>
        Your browser draft stays on this device.
      </ConfirmDialog>,
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('Sign out?')
    expect(html).toContain('Your browser draft stays on this device.')
    expect(html).toContain('Stay signed in')
  })
})
