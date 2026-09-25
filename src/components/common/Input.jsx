import PasswordField from './PasswordField'

export default function Input({ label, error, type = 'text', ...props }) {
  if (type === 'password') {
    return <PasswordField label={label} error={error} {...props} />
  }

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm text-textSecondary">{label}</label>}
      <input
        type={type}
        className="rounded-input border border-border px-3 py-2 bg-surface text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary"
        {...props}
      />
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  )
}
