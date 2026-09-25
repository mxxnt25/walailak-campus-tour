import { useId, useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'

// One password control shared by login, registration, reset and profile.
export default function PasswordField({
  label = 'รหัสผ่าน',
  id,
  compact = false,
  leadingIcon = false,
  error,
  className = '',
  inputClassName = '',
  disabled = false,
  ...props
}) {
  const generatedId = useId()
  const inputId = id || generatedId
  const [visible, setVisible] = useState(false)

  const inputStyles = compact
    ? 'w-full rounded-full border border-border bg-background py-2.5 text-base text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary'
    : 'w-full rounded-input border border-border bg-surface py-2 text-base text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary'

  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className={compact ? 'sr-only' : 'text-sm text-textSecondary'}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leadingIcon && (
          <Lock
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary"
          />
        )}
        <input
          {...props}
          id={inputId}
          type={visible ? 'text' : 'password'}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          className={`${inputStyles} ${leadingIcon ? 'pl-11' : 'pl-3'} pr-12 disabled:opacity-60 ${inputClassName}`}
        />
        <button
          type="button"
          aria-label={visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
          aria-pressed={visible}
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
          className="absolute right-1.5 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-textSecondary transition hover:bg-primary/10 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {error && <span role="alert" className="text-sm text-danger">{error}</span>}
    </div>
  )
}
