import { memo, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getReviews, getRouteReviewSummaries } from '../../services/review'
import RouteRating from './RouteRating'

function formatReviewDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function RouteReviews({ routeId }) {
  const [reviews, setReviews] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      getReviews(null, routeId, 3),
      getRouteReviewSummaries([routeId]),
    ]).then(([reviewResult, summaryResult]) => {
      if (!active) return
      if (!reviewResult.success) {
        setError(reviewResult.error?.message || 'ไม่สามารถโหลดรีวิวได้')
      } else {
        setReviews(reviewResult.data || [])
        setError('')
      }
      if (summaryResult.success) setSummary(summaryResult.data?.[routeId] || null)
    }).catch(() => {
      if (active) setError('ไม่สามารถโหลดรีวิวได้ กรุณาลองใหม่')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [routeId])

  return (
    <section id="reviews" aria-labelledby="route-reviews-heading" className="mt-10 scroll-mt-28">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="route-reviews-heading" className="text-2xl font-bold text-textPrimary">รีวิวจากผู้ร่วมทัวร์</h2>
          <p className="mt-1 text-sm text-textSecondary">ความคิดเห็นของผู้ที่เดินทางกับเส้นทางนี้</p>
        </div>
        {summary && <RouteRating rating={summary.rating} count={summary.count} />}
      </div>
      {loading ? (
        <div role="status" className="rounded-2xl border border-border bg-white p-7 text-textSecondary">กำลังโหลดรีวิว...</div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-danger/30 bg-white p-6 text-danger">{error}</div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-7 text-textSecondary">เส้นทางนี้ยังไม่มีรีวิวจากผู้ร่วมทัวร์</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reviews.map((review) => (
              <article key={review.id} className="min-w-0 rounded-2xl border border-border bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <strong className="min-w-0 truncate text-textPrimary">{review.reviewer_name || 'ผู้ร่วมทัวร์'}</strong>
                  <span className="shrink-0 text-sm font-semibold text-amber-600">★ {review.overall_rating}/5</span>
                </div>
                <p className="mt-1 text-xs text-textSecondary">{formatReviewDate(review.created_at)}</p>
                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-textPrimary">{review.comment?.trim() || 'ให้คะแนนโดยไม่ได้เขียนความคิดเห็น'}</p>
              </article>
            ))}
          </div>
          <Link to={`/reviews?routeId=${encodeURIComponent(routeId)}`} className="mt-5 inline-flex rounded-xl border border-primary px-5 py-3 text-sm font-semibold text-primary hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">ดูรีวิวของเส้นทางนี้ทั้งหมด</Link>
        </>
      )}
    </section>
  )
}

export default memo(RouteReviews)
