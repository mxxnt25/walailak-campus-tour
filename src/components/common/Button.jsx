export default function Button({ variant = 'primary', children, ...props }) {
  const base = 'rounded-button px-4 py-2 font-medium transition'
  const variants = {
    primary: 'bg-primary text-white hover:opacity-90',
    secondary: 'bg-surface border border-border text-textPrimary hover:bg-background',
    danger: 'bg-danger text-white hover:opacity-90',
    ghost: 'text-textPrimary hover:bg-background',
  }
  return (
    <button className={`${base} ${variants[variant]}`} {...props}>
      {children}
    </button>
  )
}