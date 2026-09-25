import { useEffect, useRef } from 'react'
import Button from './Button'

export default function ConfirmModal({
  open,
  title,
  description = '',
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  cancelVariant = 'secondary',
  confirmVariant = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    previousFocusRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => {
      const firstButton = dialogRef.current?.querySelector(
        'button:not([disabled])'
      )
      firstButton?.focus()
    }, 0)

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault()
        onCancel?.()
        return
      }

      if (event.key !== 'Tab') return

      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )

      if (!focusable?.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocusRef.current?.focus?.()
    }
  }, [busy, onCancel, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onCancel?.()
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby={description ? 'confirm-modal-description' : undefined}
        className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-xl"
      >
        <h2
          id="confirm-modal-title"
          className="text-lg font-semibold text-textPrimary"
        >
          {title}
        </h2>

        {description && (
          <p
            id="confirm-modal-description"
            className="mt-2 whitespace-pre-line text-sm text-textSecondary"
          >
            {description}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant={cancelVariant}
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant={confirmVariant}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'กำลังดำเนินการ...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
