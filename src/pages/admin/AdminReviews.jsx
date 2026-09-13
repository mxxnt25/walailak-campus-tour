import { useEffect, useMemo, useState } from 'react'
import {
  deleteReviewAsAdmin,
  getAdminReviews,
  setReviewVisibility,
} from '../../services/review'

function RatingStars({ value }) {
  const rating = Number(value) || 0

  return (
    <span
      className="text-yellow-500 whitespace-nowrap"
      aria-label={`${rating} ดาว`}
    >
      {'★'.repeat(rating)}
      <span className="text-gray-300">
        {'★'.repeat(Math.max(0, 5 - rating))}
      </span>
    </span>
  )
}

function formatDate(value) {
  if (!value) {
    return '-'
  }

  try {
    return new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return '-'
  }
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState(null)
  const [filter, setFilter] = useState('ALL')

  async function loadReviews() {
    try {
      setLoading(true)
      setError('')

      const data = await getAdminReviews()
      setReviews(data)
    } catch (err) {
      setError(
        err?.message ||
          'ไม่สามารถโหลดรายการรีวิวได้',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReviews()
  }, [])

  const filteredReviews = useMemo(() => {
    if (filter === 'VISIBLE') {
      return reviews.filter((review) => !review.is_hidden)
    }

    if (filter === 'HIDDEN') {
      return reviews.filter((review) => review.is_hidden)
    }

    return reviews
  }, [reviews, filter])

  const summary = useMemo(() => {
    const total = reviews.length
    const visible = reviews.filter(
      (review) => !review.is_hidden,
    ).length
    const hidden = reviews.filter(
      (review) => review.is_hidden,
    ).length

    const average =
      total > 0
        ? reviews.reduce(
            (sum, review) =>
              sum + Number(review.overall_rating || 0),
            0,
          ) / total
        : 0

    return {
      total,
      visible,
      hidden,
      average,
    }
  }, [reviews])

  async function handleToggleVisibility(review) {
    try {
      setActionId(review.id)
      setError('')

      const updatedReview = await setReviewVisibility(
        review.id,
        !review.is_hidden,
      )

      setReviews((current) =>
        current.map((item) =>
          item.id === review.id
            ? {
                ...item,
                ...updatedReview,
              }
            : item,
        ),
      )
    } catch (err) {
      setError(
        err?.message ||
          'ไม่สามารถเปลี่ยนสถานะรีวิวได้',
      )
    } finally {
      setActionId(null)
    }
  }

  async function handleDelete(review) {
    const confirmed = window.confirm(
      `ต้องการลบรีวิวของ "${
        review.reviewer_name || 'ผู้ใช้งาน'
      }" หรือไม่?\n\nการลบไม่สามารถย้อนกลับได้`,
    )

    if (!confirmed) {
      return
    }

    try {
      setActionId(review.id)
      setError('')

      await deleteReviewAsAdmin(review.id)

      setReviews((current) =>
        current.filter(
          (item) => item.id !== review.id,
        ),
      )
    } catch (err) {
      setError(
        err?.message ||
          'ไม่สามารถลบรีวิวได้',
      )
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">
          จัดการรีวิว
        </h1>

        <p className="mt-1 text-sm text-textSecondary">
          ตรวจสอบ ซ่อน แสดง และจัดการรีวิวจากผู้ใช้งาน
        </p>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="text-sm text-textSecondary">
            รีวิวทั้งหมด
          </p>

          <p className="mt-1 text-2xl font-bold text-textPrimary">
            {summary.total}
          </p>
        </div>

        <div className="rounded-card border border-border bg-surface p-4">
          <p className="text-sm text-textSecondary">
            กำลังแสดง
          </p>

          <p className="mt-1 text-2xl font-bold text-green-600">
            {summary.visible}
          </p>
        </div>

        <div className="rounded-card border border-border bg-surface p-4">
          <p className="text-sm text-textSecondary">
            ถูกซ่อน
          </p>

          <p className="mt-1 text-2xl font-bold text-orange-600">
            {summary.hidden}
          </p>
        </div>

        <div className="rounded-card border border-border bg-surface p-4">
          <p className="text-sm text-textSecondary">
            คะแนนเฉลี่ย
          </p>

          <p className="mt-1 text-2xl font-bold text-primary">
            {summary.average.toFixed(1)}
            <span className="ml-1 text-base font-normal text-textSecondary">
              / 5
            </span>
          </p>
        </div>
      </div>

      {/* FILTER */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`rounded-button px-4 py-2 text-sm transition ${
            filter === 'ALL'
              ? 'bg-primary text-white'
              : 'border border-border bg-surface text-textPrimary hover:bg-background'
          }`}
        >
          ทั้งหมด
        </button>

        <button
          type="button"
          onClick={() => setFilter('VISIBLE')}
          className={`rounded-button px-4 py-2 text-sm transition ${
            filter === 'VISIBLE'
              ? 'bg-primary text-white'
              : 'border border-border bg-surface text-textPrimary hover:bg-background'
          }`}
        >
          กำลังแสดง
        </button>

        <button
          type="button"
          onClick={() => setFilter('HIDDEN')}
          className={`rounded-button px-4 py-2 text-sm transition ${
            filter === 'HIDDEN'
              ? 'bg-primary text-white'
              : 'border border-border bg-surface text-textPrimary hover:bg-background'
          }`}
        >
          ถูกซ่อน
        </button>

        <button
          type="button"
          onClick={loadReviews}
          disabled={loading}
          className="
            ml-auto
            rounded-button
            border
            border-border
            bg-surface
            px-4
            py-2
            text-sm
            text-textPrimary
            transition
            hover:bg-background
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          รีเฟรช
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <div className="rounded-card border border-border bg-surface p-8 text-center text-textSecondary">
          กำลังโหลดรายการรีวิว...
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-8 text-center">
          <p className="text-lg font-semibold text-textPrimary">
            ยังไม่มีรีวิว
          </p>

          <p className="mt-1 text-sm text-textSecondary">
            ไม่พบรายการรีวิวตามเงื่อนไขที่เลือก
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => {
            const busy = actionId === review.id

            return (
              <article
                key={review.id}
                className="rounded-card border border-border bg-surface p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    {/* USER + STATUS */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-textPrimary">
                        {review.reviewer_name ||
                          'ผู้ใช้งาน'}
                      </h2>

                      {review.is_hidden ? (
                        <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700">
                          ซ่อนอยู่
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                          กำลังแสดง
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-textSecondary">
                      {formatDate(review.created_at)}
                    </p>

                    {/* RATINGS */}
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div>
                        <p className="text-xs text-textSecondary">
                          ความประทับใจโดยรวม
                        </p>

                        <div className="mt-1 flex items-center gap-2">
                          <RatingStars
                            value={review.overall_rating}
                          />

                          <span className="text-sm text-textPrimary">
                            {review.overall_rating}/5
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-textSecondary">
                          การให้บริการของไกด์
                        </p>

                        <div className="mt-1 flex items-center gap-2">
                          <RatingStars
                            value={review.guide_rating}
                          />

                          <span className="text-sm text-textPrimary">
                            {review.guide_rating}/5
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-textSecondary">
                          เส้นทางและสถานที่
                        </p>

                        <div className="mt-1 flex items-center gap-2">
                          <RatingStars
                            value={review.route_rating}
                          />

                          <span className="text-sm text-textPrimary">
                            {review.route_rating}/5
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* COMMENT */}
                    <div className="mt-4 rounded-card bg-background p-4">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-textPrimary">
                        {review.comment ||
                          'ไม่มีความคิดเห็นเพิ่มเติม'}
                      </p>
                    </div>

                    {/* IDS */}
                    <div className="mt-3 space-y-1 text-xs text-textSecondary">
                      <p>
                        Booking:{' '}
                        <span className="font-mono">
                          {review.booking_id}
                        </span>
                      </p>

                      <p>
                        Route:{' '}
                        <span className="font-mono">
                          {review.route_id || '-'}
                        </span>
                      </p>

                      <p>
                        Guide:{' '}
                        <span className="font-mono">
                          {review.guide_id || '-'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex shrink-0 flex-row gap-2 lg:flex-col">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        handleToggleVisibility(review)
                      }
                      className="
                        rounded-button
                        border
                        border-border
                        bg-surface
                        px-4
                        py-2
                        text-sm
                        text-textPrimary
                        transition
                        hover:bg-background
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      "
                    >
                      {review.is_hidden
                        ? 'แสดงรีวิว'
                        : 'ซ่อนรีวิว'}
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDelete(review)}
                      className="
                        rounded-button
                        border
                        border-red-200
                        bg-red-50
                        px-4
                        py-2
                        text-sm
                        text-red-700
                        transition
                        hover:bg-red-100
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      "
                    >
                      ลบรีวิว
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}