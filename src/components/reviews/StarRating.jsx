import { useState } from 'react'
import { Star } from 'lucide-react'

const ratingLabels = {
  0: 'กรุณาเลือกคะแนน',
  1: 'ควรปรับปรุง',
  2: 'พอใช้',
  3: 'ดี',
  4: 'ดีมาก',
  5: 'ยอดเยี่ยม',
}

function StarRating({
  label,
  value,
  onChange,
  disabled = false,
}) {
  const [hoverRating, setHoverRating] = useState(0)

  const displayedRating = hoverRating || value

  return (
    <div>
      <p className="mb-2 font-semibold text-gray-900">
        {label}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((starNumber) => (
            <button
              key={starNumber}
              type="button"
              disabled={disabled}
              onClick={() => onChange(starNumber)}
              onMouseEnter={() => {
                if (!disabled) {
                  setHoverRating(starNumber)
                }
              }}
              onMouseLeave={() => setHoverRating(0)}
              className="rounded-md p-1 transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={`${label} ${starNumber} ดาว`}
            >
              <Star
                size={35}
                className={
                  starNumber <= displayedRating
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-gray-100 text-gray-300'
                }
              />
            </button>
          ))}
        </div>

        <span className="text-sm font-medium text-gray-600">
          {value > 0
            ? `${value} ดาว — ${ratingLabels[value]}`
            : ratingLabels[0]}
        </span>
      </div>
    </div>
  )
}

export default StarRating