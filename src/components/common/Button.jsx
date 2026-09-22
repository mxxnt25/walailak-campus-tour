export default function Button({ variant = 'primary', size = 'md', children, className = '', ...props }) {
  const base = 'rounded-button font-medium transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary/90 shadow-sm hover:shadow-md',
    secondary: 'bg-surface border border-border text-textPrimary hover:bg-background',
    danger: 'bg-danger text-white hover:bg-danger/90 shadow-sm',
    ghost: 'text-textPrimary hover:bg-background',
  }
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}