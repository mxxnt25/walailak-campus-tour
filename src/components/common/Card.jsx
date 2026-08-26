export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-surface border border-border rounded-card p-4 shadow-sm ${className}`}>
      {children}
    </div>
  )
}