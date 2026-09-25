import { Star } from 'lucide-react'

export default function RouteRating({ rating, count, className = '' }) {
  if (!Number.isFinite(Number(rating)) || !count) return null
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm text-textSecondary ${className}`} aria-label={`คะแนน ${rating} จาก 5 จาก ${count} รีวิว`}>
      <Star size={16} aria-hidden="true" className="fill-amber-400 text-amber-500" />
      <strong className="font-bold text-textPrimary">{Number(rating).toFixed(1)}</strong>
      <span>({count} รีวิว)</span>
    </span>
  )
}
