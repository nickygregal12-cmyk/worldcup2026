import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ConfirmDialog, SelectField } from '../index.jsx'

describe('shared design-system primitives', () => {
  it('renders a custom listbox selector with no native select element', () => {
    const html = renderToStaticMarkup(
      <SelectField
        label="League"
        value="a"
        onChange={() => {}}
        options={[{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }]}
      />,
    )
    expect(html).toContain('data-design-system-select="true"')
    // Trigger is a combobox button; the selected label shows; the OS picker is gone.
    expect(html).toContain('role="combobox"')
    expect(html).toContain('aria-haspopup="listbox"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('Alpha')
    expect(html).not.toContain('<select')
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
