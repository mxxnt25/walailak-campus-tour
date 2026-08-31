import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Hash,
  MapPin,
  Star,
  UserRound,
} from 'lucide-react'

const sampleTrip = {
  routeName: 'เส้นทางเที่ยวชมมหาวิทยาลัยวลัยลักษณ์',
  meetingPoint: 'ศูนย์บริการนักท่องเที่ยว มหาวิทยาลัยวลัยลักษณ์',
  guideName: 'นายสมชาย ใจดี',
  travelDate: '20/08/2026',
  travelTime: '09:00 น.',
  bookingId: 'BK-20260820-001',
  status: 'เดินทางเสร็จสิ้น',
}

const sampleReviews = []

const ratingLabels = {
  1: 'ควรปรับปรุง',
  2: 'พอใช้',
  3: 'ดี',
  4: 'ดีมาก!',
  5: 'ยอดเยี่ยมมาก!',
}

function Review() {
  const { bookingId } = useParams()

  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [reviews, setReviews] = useState(sampleReviews)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  const trip = {
    ...sampleTrip,
    bookingId: bookingId || sampleTrip.bookingId,
  }

  const averageRating = useMemo(() => {
    if (reviews.length === 0) {
      return '0.0'
    }

    const total = reviews.reduce(
      (sum, review) => sum + review.rating,
      0,
    )

    return (total / reviews.length).toFixed(1)
  }, [reviews])

  const handleSubmit = (event) => {
    event.preventDefault()

    if (rating === 0) {
      setMessage('กรุณาเลือกคะแนนก่อนส่งรีวิว')
      setMessageType('error')
      return
    }

    if (comment.trim() === '') {
      setMessage('กรุณาเขียนความคิดเห็นก่อนส่งรีวิว')
      setMessageType('error')
      return
    }

    const newReview = {
      id: Date.now(),
      name: 'คุณ',
      date: new Date().toLocaleDateString('en-GB'),
      rating,
      comment: comment.trim(),
    }

    setReviews((currentReviews) => [
      newReview,
      ...currentReviews,
    ])

    setRating(0)
    setHoverRating(0)
    setComment('')
    setMessage('ส่งรีวิวสำเร็จ')
    setMessageType('success')
  }

  const displayedRating = hoverRating || rating

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          รีวิวการเดินทาง
        </h1>

        <p className="mt-2 text-gray-600">
          แบ่งปันประสบการณ์และความคิดเห็นของคุณ
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          {/* แบบฟอร์มรีวิว */}
          <section className="p-6 md:p-8">
            <h2 className="mb-5 text-xl font-semibold text-gray-900">
              ข้อมูลทริปที่คุณรีวิว
            </h2>

            <div className="mb-7 flex flex-col gap-5 rounded-xl bg-gray-50 p-5 sm:flex-row">
              <div className="flex h-40 w-full shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 via-blue-100 to-green-100 text-6xl sm:w-44">
                🏫
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-2xl font-bold text-gray-900">
                  {trip.routeName}
                </h3>

                <div className="mt-4 space-y-2.5 text-gray-600">
                  <p className="flex items-start gap-2">
                    <MapPin
                      size={18}
                      className="mt-0.5 shrink-0"
                    />

                    <span>
                      จุดนัดพบ: {trip.meetingPoint}
                    </span>
                  </p>

                  <p className="flex items-center gap-2">
                    <UserRound
                      size={18}
                      className="shrink-0"
                    />

                    <span>ไกด์: {trip.guideName}</span>
                  </p>

                  <p className="flex items-center gap-2">
                    <CalendarDays
                      size={18}
                      className="shrink-0"
                    />

                    <span>
                      วันที่เดินทาง: {trip.travelDate}
                    </span>
                  </p>

                  <p className="flex items-center gap-2">
                    <Clock3
                      size={18}
                      className="shrink-0"
                    />

                    <span>
                      เวลาเดินทาง: {trip.travelTime}
                    </span>
                  </p>

                  <p className="flex items-center gap-2">
                    <Hash
                      size={18}
                      className="shrink-0"
                    />

                    <span>
                      หมายเลขการจอง: {trip.bookingId}
                    </span>
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                    <CheckCircle2 size={16} />
                    {trip.status}
                  </span>

                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                    <Star
                      size={18}
                      className="fill-amber-400 text-amber-400"
                    />

                    <strong className="text-amber-500">
                      {averageRating}
                    </strong>

                    <span>
                      ({reviews.length} รีวิว)
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <label className="mb-3 block text-lg font-semibold text-gray-900">
                ให้คะแนน
              </label>

              <div className="mb-7 flex flex-wrap items-center gap-4">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((starNumber) => (
                    <button
                      key={starNumber}
                      type="button"
                      onClick={() => {
                        setRating(starNumber)
                        setMessage('')
                      }}
                      onMouseEnter={() =>
                        setHoverRating(starNumber)
                      }
                      onMouseLeave={() =>
                        setHoverRating(0)
                      }
                      className="rounded-md p-1 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-300"
                      aria-label={`ให้คะแนน ${starNumber} ดาว`}
                    >
                      <Star
                        size={42}
                        className={
                          starNumber <= displayedRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-gray-100 text-gray-300'
                        }
                      />
                    </button>
                  ))}
                </div>

                <span className="text-lg font-medium text-gray-700">
                  {rating > 0
                    ? `${rating} ดาว — ${ratingLabels[rating]}`
                    : 'กรุณาเลือกคะแนน'}
                </span>
              </div>

              <label
                htmlFor="review-comment"
                className="mb-2 block text-lg font-semibold text-gray-900"
              >
                รีวิวของคุณ
              </label>

              <textarea
                id="review-comment"
                value={comment}
                onChange={(event) => {
                  setComment(event.target.value)
                  setMessage('')
                }}
                rows={5}
                maxLength={500}
                placeholder="แชร์ประสบการณ์ของคุณ..."
                className="w-full resize-none rounded-xl border border-gray-300 p-4 text-gray-700 outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
              />

              <p className="mt-1 text-right text-sm text-gray-500">
                {comment.length}/500
              </p>

              {message && (
                <div
                  className={`mt-3 rounded-lg px-4 py-3 text-sm font-medium ${
                    messageType === 'success'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="mt-4 rounded-lg bg-purple-700 px-12 py-3 font-semibold text-white transition hover:bg-purple-800 active:scale-95"
              >
                ส่งรีวิว
              </button>
            </form>
          </section>

          {/* รายการรีวิว */}
          <section className="border-t border-gray-200 bg-gray-50 p-6 md:p-8 lg:border-l lg:border-t-0">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                รีวิวล่าสุด
              </h2>

              <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700">
                {reviews.length} รีวิว
              </span>
            </div>

            <div className="space-y-4">
              {reviews.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
                  <div className="mb-3 text-5xl">
                    💬
                  </div>

                  <h3 className="text-lg font-semibold text-gray-800">
                    ยังไม่มีรีวิว
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    เมื่อมีผู้ใช้ส่งรีวิว รายการจะแสดงที่นี่
                  </p>
                </div>
              ) : (
                reviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100 text-lg font-bold text-purple-700">
                          {review.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <h3 className="font-bold text-gray-900">
                            {review.name}
                          </h3>

                          <p className="mt-1 text-sm text-gray-500">
                            {review.date}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1 font-bold text-amber-500">
                        <Star
                          size={21}
                          className="fill-amber-400 text-amber-400"
                        />

                        {review.rating}
                      </div>
                    </div>

                    <p className="mt-3 leading-relaxed text-gray-700">
                      {review.comment}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export default Review