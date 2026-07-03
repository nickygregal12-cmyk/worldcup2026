import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import TeamLabel from './TeamLabel.jsx'
import ScoreInput from './ScoreInput.jsx'
import PredictionStateBadge from './PredictionStateBadge.jsx'
import { useEffect, useId, useRef } from 'react'
import Icon from './Icon.jsx'
import PlayerIdentity from './PlayerIdentity.jsx'

export function Button({ children, variant = 'primary', size = 'medium', icon = null, loading = false, className = '', disabled, ...props }) {
  return (
    <button className={`ui-button ui-button--${variant} ui-button--${size} ${className}`.trim()} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <Icon name="loader" size={18} className="ui-icon--spin" /> : icon && <Icon name={icon} size={18} />}
      <span>{children}</span>
    </button>
  )
}

export function LinkButton({ children, href, variant = 'primary', size = 'medium', icon = null, className = '', ...props }) {
  return (
    <a className={`ui-button ui-button--${variant} ui-button--${size} ${className}`.trim()} href={href} {...props}>
      {icon && <Icon name={icon} size={18} />}
      <span>{children}</span>
    </a>
  )
}

export function Card({ children, className = '', as: Component = 'section', ...props }) {
  return <Component className={`ui-card ${className}`.trim()} {...props}>{children}</Component>
}

const BADGE_ICON = Object.freeze({ safe: 'check', success: 'check', warning: 'alert', danger: 'alert', info: 'info', neutral: 'info' })

export function Badge({ children, tone = 'neutral', className = '', icon = BADGE_ICON[tone] ?? 'info' }) {
  return <span className={`ui-badge ui-badge--${tone} ${className}`.trim()}><Icon name={icon} size={14} /><span>{children}</span></span>
}

export function ProgressBar({ value, max, label }) {
  const displayMax = Math.max(0, Number(max) || 0)
  const calculationMax = Math.max(1, displayMax)
  const safeValue = Math.min(displayMax, Math.max(0, Number(value) || 0))
  const percent = Math.round((safeValue / calculationMax) * 100)
  return (
    <div className="ui-progress" aria-label={label} role="progressbar" aria-valuemin="0" aria-valuemax={calculationMax} aria-valuenow={safeValue}>
      <div className="ui-progress__track"><span style={{ width: `${percent}%` }} /></div>
      <span className="ui-progress__value">{safeValue}/{displayMax}</span>
    </div>
  )
}

export function StatusBar({ tone = 'info', title, children, action = null, icon = null }) {
  return (
    <div className={`ui-status ui-status--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={icon ?? (tone === 'danger' || tone === 'warning' ? 'alert' : 'info')} size={20} />
      <div><strong>{title}</strong>{children && <span>{children}</span>}</div>
      {action}
    </div>
  )
}

export function Tabs({ label, value, options, onChange }) {
  return (
    <div className="ui-tabs" role="tablist" aria-label={label}>
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={option.value === value ? 'is-active' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function TextField({ label, hint, id: providedId, className = '', ...props }) {
  const generatedId = useId()
  const id = providedId ?? generatedId
  return (
    <label className={`ui-field ${className}`.trim()} htmlFor={id}>
      <span>{label}</span>
      <input id={id} {...props} />
      {hint && <small>{hint}</small>}
    </label>
  )
}

function focusableElements(node) {
  return [...node.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
}

export function Dialog({ open, title, onClose, children, labelledBy, className = '' }) {
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)
  const generatedTitleId = useId()
  const titleId = labelledBy ?? generatedTitleId

  useEffect(() => {
    if (!open) return undefined
    previousFocusRef.current = document.activeElement
    const dialog = dialogRef.current
    const focusables = focusableElements(dialog)
    ;(focusables[0] ?? dialog)?.focus()

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusableElements(dialog)
      if (items.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.classList.add('has-dialog-open')
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.classList.remove('has-dialog-open')
      previousFocusRef.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="ui-dialog-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section
        ref={dialogRef}
        className={`ui-dialog ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex="-1"
      >
        <header className="ui-dialog__header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="ui-icon-button" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
        </header>
        {children}
      </section>
    </div>
  )
}


export function SelectField({ label, hint, id: providedId, value, options, onChange, className = '', placeholder = null, ...props }) {
  const generatedId = useId()
  const id = providedId ?? generatedId
  return (
    <label className={`ui-field ui-select-field ${className}`.trim()} htmlFor={id} data-design-system-select="true">
      <span>{label}</span>
      <select id={id} value={value ?? ''} onChange={event => onChange(event.target.value)} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>
        ))}
      </select>
      {hint && <small>{hint}</small>}
    </label>
  )
}

export function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'warning', busy = false, onConfirm, onCancel }) {
  return (
    <Dialog open={open} title={title} onClose={onCancel} className={`ui-confirm-dialog ui-confirm-dialog--${tone}`}>
      <div className="ui-confirm-dialog__body">{children}</div>
      <footer className="ui-confirm-dialog__actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
        <Button type="button" variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={busy}>{confirmLabel}</Button>
      </footer>
    </Dialog>
  )
}

export { Icon, PlayerIdentity, TeamLabel, ScoreInput, PredictionStateBadge }
