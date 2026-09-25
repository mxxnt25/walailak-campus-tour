import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { firstEnabledIndex, nextEnabledIndex } from '../../utils/selectNavigation'

function optionText(children) {
  return Children.toArray(children).map((child) => {
    if (typeof child === 'string' || typeof child === 'number') return String(child)
    return isValidElement(child) ? optionText(child.props.children) : ''
  }).join(' ').replace(/\s+/g, ' ').trim()
}

function getPanelPosition(bounds, optionCount) {
  if (!bounds) return null
  const panelHeight = Math.min(320, optionCount * 44 + 16)
  const below = window.innerHeight - bounds.bottom - 12
  const above = bounds.top - 12
  const showAbove = below < panelHeight && above > below
  const maxHeight = Math.min(320, Math.max(100, (showAbove ? above : below) - 8))
  const width = Math.min(Math.max(bounds.width, 220), window.innerWidth - 24)
  return {
    left: Math.min(Math.max(12, bounds.left), window.innerWidth - width - 12),
    top: showAbove ? Math.max(12, bounds.top - maxHeight - 8) : bounds.bottom + 8,
    width,
    maxHeight,
  }
}

// This component accepts the same <option> children and event.target.value/name
// handlers as the existing native selects. Options are rendered in a portal so
// their rounded panel is not clipped by cards, tables, modals or the map.
export default function AppSelect({
  children,
  value,
  defaultValue,
  onChange,
  name,
  id,
  className = '',
  disabled = false,
  required = false,
  'aria-invalid': ariaInvalid,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [panelPosition, setPanelPosition] = useState(null)
  const [portalRoot, setPortalRoot] = useState(null)
  const buttonRef = useRef(null)
  const panelRef = useRef(null)
  const typeaheadRef = useRef({ query: '', at: 0 })
  const listId = useId()
  const controlled = value !== undefined
  const [internalValue, setInternalValue] = useState(defaultValue)
  const selectedValue = controlled ? value : internalValue

  const options = useMemo(() => Children.toArray(children)
    .filter((child) => isValidElement(child) && child.type === 'option')
    .map((option) => ({
      value: String(option.props.value ?? optionText(option.props.children)),
      label: option.props.children,
      text: optionText(option.props.children),
      disabled: Boolean(option.props.disabled),
    })), [children])

  const selectedIndex = options.findIndex((option) => option.value === String(selectedValue ?? ''))
  const selectedOption = options[selectedIndex] ?? options[0]
  const isFullWidth = /(?:^|\s)w-full(?:\s|$)/.test(className)

  useEffect(() => {
    if (!open) return undefined
    function positionPanel(event) {
      if (event?.type === 'scroll' && panelRef.current?.contains(event.target)) return
      setPanelPosition(getPanelPosition(buttonRef.current?.getBoundingClientRect(), options.length))
    }
    window.addEventListener('resize', positionPanel)
    window.addEventListener('scroll', positionPanel, true)
    return () => {
      window.removeEventListener('resize', positionPanel)
      window.removeEventListener('scroll', positionPanel, true)
    }
  }, [open, options.length])

  useEffect(() => {
    if (!open) return undefined
    function closeOnOutsideClick(event) {
      if (!buttonRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  useEffect(() => {
    if (!open || activeIndex < 0) return
    const panel = panelRef.current
    const item = document.getElementById(`${listId}-option-${activeIndex}`)
    if (!panel || !item) return
    // Scroll the dropdown only; scrollIntoView can jump the entire page.
    if (item.offsetTop < panel.scrollTop) panel.scrollTop = item.offsetTop
    else if (item.offsetTop + item.offsetHeight > panel.scrollTop + panel.clientHeight) {
      panel.scrollTop = item.offsetTop + item.offsetHeight - panel.clientHeight
    }
  }, [open, activeIndex, listId, panelPosition])

  function showOptions() {
    if (disabled || !options.length) return
    setActiveIndex(selectedIndex >= 0 && !options[selectedIndex].disabled
      ? selectedIndex : firstEnabledIndex(options))
    setPanelPosition(getPanelPosition(buttonRef.current?.getBoundingClientRect(), options.length))
    // Native <dialog> elements live in the browser's top layer. Portal into
    // the dialog when present, otherwise the popup would appear behind it.
    setPortalRoot(buttonRef.current?.closest('dialog[open]') ?? document.body)
    setOpen(true)
  }

  function choose(index) {
    const option = options[index]
    if (!option || option.disabled) return
    if (!controlled) setInternalValue(option.value)
    if (option.value !== String(selectedValue ?? '')) {
      onChange?.({ target: { value: option.value, name }, currentTarget: { value: option.value, name } })
    }
    setOpen(false)
    buttonRef.current?.focus()
  }

  function handleKeyDown(event) {
    if (disabled) return

    if (event.key === 'Tab') {
      setOpen(false)
      return
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        showOptions()
      } else {
        setActiveIndex((current) => nextEnabledIndex(options, current, event.key === 'ArrowDown' ? 1 : -1))
      }
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      if (!open) showOptions()
      setActiveIndex(firstEnabledIndex(options, event.key === 'End'))
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!open) showOptions()
      else choose(activeIndex)
      return
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now()
      const previous = typeaheadRef.current
      const query = now - previous.at < 750 ? previous.query + event.key.toLocaleLowerCase() : event.key.toLocaleLowerCase()
      typeaheadRef.current = { query, at: now }
      const match = options.findIndex((option) => !option.disabled && option.text.toLocaleLowerCase().startsWith(query))
      if (match >= 0) {
        event.preventDefault()
        if (!open) showOptions()
        setActiveIndex(match)
      }
    }
  }

  return (
    <div className={`app-select ${isFullWidth ? 'w-full' : 'inline-block max-w-full'} min-w-0 align-middle`}>
      {name && <input type="hidden" name={name} value={String(selectedValue ?? '')} />}
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
        aria-required={required || undefined}
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        onClick={() => open ? setOpen(false) : showOptions()}
        onKeyDown={handleKeyDown}
        className={`app-select-trigger flex min-h-10 w-full min-w-0 items-center justify-between gap-3 text-left ${className} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className="min-w-0 flex-1 truncate">{selectedOption?.label ?? 'เลือก'}</span>
        <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-textSecondary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && panelPosition && portalRoot && createPortal(
        <div
          ref={panelRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel || 'ตัวเลือก'}
          className="app-select-menu overflow-y-auto rounded-2xl border border-border bg-white p-1.5 shadow-2xl"
          style={{ position: 'fixed', zIndex: 9999, ...panelPosition }}
        >
          {options.map((option, index) => (
            <div
              key={`${option.value}-${index}`}
              id={`${listId}-option-${index}`}
              role="option"
              aria-selected={index === selectedIndex}
              aria-disabled={option.disabled || undefined}
              onMouseEnter={() => !option.disabled && setActiveIndex(index)}
              onClick={() => choose(index)}
              className={`flex min-h-10 items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${option.disabled ? 'cursor-not-allowed text-textSecondary/50' : 'cursor-pointer'} ${activeIndex === index ? 'bg-primary/10 text-primary' : 'text-textPrimary hover:bg-background'}`}
            >
              <span className="min-w-0 break-words">{option.label}</span>
              {index === selectedIndex && <Check size={16} aria-hidden="true" className="shrink-0 text-primary" />}
            </div>
          ))}
        </div>, portalRoot,
      )}
    </div>
  )
}
