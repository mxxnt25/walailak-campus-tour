import { useEffect, useRef } from 'react'

const TONE_CLASSES = {
  success: {
    border: 'border-success/40',
    indicator: 'bg-success',
  },
  danger: {
    border: 'border-danger/40',
    indicator: 'bg-danger',
  },
  warning: {
    border: 'border-warning/40',
    indicator: 'bg-warning',
  },
  primary: {
    border: 'border-primary/40',
    indicator: 'bg-primary',
  },
}

export default function Toast({
  message,
  tone = 'success',
  duration = 3500,
  onClose,
}) {
  // The parent often supplies an inline onClose callback. Don't restart the
  // dismissal timer merely because the parent re-rendered.
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!message || !onCloseRef.current || duration <= 0) return undefined

    const timer = window.setTimeout(() => onCloseRef.current?.(), duration)

    return () => window.clearTimeout(timer)
  }, [duration, message])

  if (!message) return null

  const toneClass = TONE_CLASSES[tone] || TONE_CLASSES.primary

  return (
    <div
      className={`fixed inset-x-4 bottom-4 z-[1000] flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-card border bg-surface p-4 text-textPrimary shadow-xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-full ${toneClass.border}`}
      role={tone === 'danger' ? 'alert' : 'status'}
      aria-live={tone === 'danger' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <span
        aria-hidden="true"
        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${toneClass.indicator}`}
      />
      <p className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] text-sm font-medium leading-relaxed">
        {message}
      </p>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="-m-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-button text-xl leading-none text-textSecondary transition-colors hover:bg-background hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="ปิดการแจ้งเตือน"
        >
          ×
        </button>
      )}
    </div>
  )
}
