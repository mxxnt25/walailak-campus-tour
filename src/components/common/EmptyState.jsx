export default function EmptyState({
  title = 'ยังไม่มีข้อมูล',
  description = '',
  icon = null,
  action = null,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface px-6 py-10 text-center ${className}`}
    >
      {icon && (
        <div className="mb-3 text-textSecondary">
          {icon}
        </div>
      )}

      <h3 className="text-base font-semibold text-textPrimary">
        {title}
      </h3>

      {description && (
        <p className="mt-1 max-w-md text-sm text-textSecondary">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  )
}