export default function Badge({ children, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
  }
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap px-2 py-1 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}