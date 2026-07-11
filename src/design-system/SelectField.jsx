import { useEffect, useId, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { initialActiveIndex, isOpenKey, listKeyAction, typeAheadIndex } from './selectFieldNav.js'
import styles from './SelectField.module.css'

// Custom-rendered listbox (button trigger + popover option list). Replaces the
// native select element so the OS wheel/picker never appears. The design programme
// specifies no custom-select/listbox/popover pattern (only the Modal §12
// focus-trap/Escape/backdrop convention and the 48px target rule), so the
// keyboard model here follows the standard ARIA listbox practice and the modal
// focus-return rule; both are flagged as design-programme gaps in the report.
//
// API is unchanged from the old native SelectField: onChange receives the
// string value; options are { value, label, disabled? }; placeholder renders a
// selectable empty-value option; disabled disables the trigger. Option labels
// may carry the Original/KO competition prefix the Leagues fix flattened into
// them; no optgroup rendering is required to preserve that.

export default function SelectField({
  label,
  hint,
  id: providedId,
  value,
  options,
  onChange,
  className = '',
  placeholder = null,
  disabled = false,
  ...props
}) {
  const generatedId = useId()
  const id = providedId ?? generatedId
  const listboxId = `${id}-listbox`

  const items = placeholder != null
    ? [{ value: '', label: placeholder }, ...options]
    : options

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const triggerRef = useRef(null)
  const listboxRef = useRef(null)
  const typeAheadRef = useRef({ buffer: '', timer: null })

  const selectedIndex = items.findIndex(item => item.value === (value ?? ''))
  const selectedItem = selectedIndex >= 0 ? items[selectedIndex] : null
  const triggerText = selectedItem && selectedItem.value !== ''
    ? selectedItem.label
    : (placeholder ?? '')

  const openList = () => {
    if (disabled) return
    setActiveIndex(initialActiveIndex(items, selectedIndex))
    setOpen(true)
  }

  const close = ({ refocus = true } = {}) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }

  const commit = index => {
    const item = items[index]
    if (!item || item.disabled) return
    onChange(item.value)
    close()
  }

  useEffect(() => {
    if (!open) return undefined
    listboxRef.current?.focus()
    const onPointerDown = event => {
      if (!listboxRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const typeAhead = char => {
    const state = typeAheadRef.current
    if (state.timer) clearTimeout(state.timer)
    state.buffer += char.toLowerCase()
    state.timer = setTimeout(() => { state.buffer = '' }, 500)
    const match = typeAheadIndex(items, state.buffer)
    if (match >= 0) setActiveIndex(match)
  }

  // The keyboard contract itself lives in listKeyAction (pure, unit-tested);
  // this only applies the action it returns.
  const onListKeyDown = event => {
    const action = listKeyAction(event.key, items, activeIndex)
    if (action.prevent) event.preventDefault()
    if (action.type === 'active') setActiveIndex(action.index)
    else if (action.type === 'commit') commit(action.index)
    else if (action.type === 'close') close({ refocus: action.refocus })
    else if (action.type === 'typeahead') typeAhead(action.char)
  }

  const onTriggerKeyDown = event => {
    if (!isOpenKey(event.key)) return
    event.preventDefault()
    openList()
  }

  return (
    <div className={`ui-field ${styles.field} ${className}`.trim()} data-design-system-select="true">
      <span className={styles.label} id={`${id}-label`}>{label}</span>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className={styles.trigger}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby={`${id}-label ${id}`}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onTriggerKeyDown}
        {...props}
      >
        <span className={triggerText ? styles.value : styles.placeholder}>{triggerText || placeholder || ' '}</span>
        <Icon name="chevron-down" size={16} className={styles.chevron} />
      </button>
      {open && (
        <ul
          ref={listboxRef}
          id={listboxId}
          className={styles.listbox}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={`${id}-label`}
          aria-activedescendant={activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined}
          onKeyDown={onListKeyDown}
        >
          {items.map((item, index) => (
            <li
              key={item.value}
              id={`${id}-opt-${index}`}
              className={styles.option}
              role="option"
              aria-selected={index === selectedIndex}
              aria-disabled={item.disabled || undefined}
              data-active={index === activeIndex || undefined}
              onMouseEnter={() => !item.disabled && setActiveIndex(index)}
              onClick={() => commit(index)}
            >
              {index === selectedIndex && <Icon name="check" size={15} className={styles.tick} />}
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      )}
      {hint && <small className={styles.hint}>{hint}</small>}
    </div>
  )
}
