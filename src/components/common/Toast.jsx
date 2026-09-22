import { useEffect } from 'react'

const TONE_CLASSES = {
  success: 'border-success/30 bg-success/10 text-success',
  danger: 'border-danger/30 bg-danger/10 text-danger',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  primary: 'border-primary/30 bg-primary/10 text-primary',
}

export default function Toast({
  message,
  tone = 'success',
  duration = 3500,
  onClose,
}) {
  useEffect(() => {
    if (!message || !onClose || duration <= 0) return undefined

    const timer = window.setTimeout(onClose, duration)

    return () => window.clearTimeout(timer)
  }, [duration, message, onClose])

  if (!message) return null

  const toneClass = TONE_CLASSES[tone] || TONE_CLASSES.primary

  return (
    <div
      className={`fixed right-4 top-4 z-[1000] flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-card border p-4 shadow-lg ${toneClass}`}
      role={tone === 'danger' ? 'alert' : 'status'}
      aria-live={tone === 'danger' ? 'assertive' : 'polite'}
    >
      <p className="min-w-0 flex-1 text-sm font-medium">
        {message}
      </p>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Close notification"
        >
          ×
        </button>
      )}
    </div>
  )
}
