import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Database,
  Hash,
  MapPin,
  Star,
  UserRound,
} from 'lucide-react'
import StarRating from '../../components/reviews/StarRating'
import {
  createReview,
  getMyReviewByBookingId,
  getReviews,
} from '../../services/review'

// ข้อมูลตัวอย่าง ใช้ระหว่างรอเชื่อมระบบจริงจาก M2, M3 และ M4
const sampleTrip = {
  routeName: 'เส้นทางเที่ยวชมมหาวิทยาลัยวลัยลักษณ์',
  meetingPoint:
    'ศูนย์บริการนักท่องเที่ยว มหาวิทยาลัยวลัยลักษณ์',
  guideName: 'นายสมชาย ใจดี',
  travelDate: '20/08/2026',
  travelTime: '09:00 น.',
  bookingId: 'BK-20260820-001',
  status: 'เดินทางเสร็จสิ้น',
}

// เปลี่ยนเป็น false เมื่อเชื่อมข้อมูลจริงจาก M2, M3 และ M4 แล้ว
const USING_SAMPLE_TRIP_DATA = true

function formatReviewDate(dateValue) {
  if (!dateValue) {
    return '-'
  }

  return new Date(dateValue).toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Review() {
  const { bookingId } = useParams()

  // ตอนนี้ใช้ข้อมูลตัวอย่างไปก่อน
  // ภายหลังจะเปลี่ยนเป็นข้อมูลที่ดึงจากระบบการจอง
  const trip = {
    ...sampleTrip,
    bookingId: bookingId || sampleTrip.bookingId,
  }

  const [overallRating, setOverallRating] = useState(0)
  const [guideRating, setGuideRating] = useState(0)
  const [routeRating, setRouteRating] = useState(0)
  const [comment, setComment] = useState('')

  const [reviews, setReviews] = useState([])
  const [hasReviewed, setHasReviewed] = useState(false)

  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const averageRating = useMemo(() => {
    if (reviews.length === 0) {
      return '0.0'
    }

    const total = reviews.reduce(
      (sum, review) =>
        sum + Number(review.overall_rating),
      0,
    )

    return (total / reviews.length).toFixed(1)
  }, [reviews])

  useEffect(() => {
    let isActive = true

    async function loadReviewData() {
      setIsLoading(true)
      setMessage('')
      setMessageType('')

      try {
        const [reviewList, myReview] = await Promise.all([
          getReviews(trip.bookingId),
          getMyReviewByBookingId(trip.bookingId),
        ])

        if (!isActive) {
          return
        }

        setReviews(reviewList || [])
        setHasReviewed(Boolean(myReview))
      } catch (error) {
        if (!isActive) {
          return
        }

        setMessage(
          error.message || 'ไม่สามารถโหลดข้อมูลรีวิวได้',
        )
        setMessageType('error')
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadReviewData()

    return () => {
      isActive = false
    }
  }, [trip.bookingId])

  const clearMessage = () => {
    setMessage('')
    setMessageType('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    clearMessage()

    if (
      overallRating === 0 ||
      guideRating === 0 ||
      routeRating === 0
    ) {
      setMessage('กรุณาให้คะแนนให้ครบทั้ง 3 หมวด')
      setMessageType('error')
      return
    }

    if (comment.trim() === '') {
      setMessage('กรุณาเขียนความคิดเห็นก่อนส่งรีวิว')
      setMessageType('error')
      return
    }

    setIsSubmitting(true)

    try {
      const newReview = await createReview({
        bookingId: trip.bookingId,
        overallRating,
        guideRating,
        routeRating,
        comment: comment.trim(),
      })

      setReviews((currentReviews) => [
        newReview,
        ...currentReviews,
      ])

      setOverallRating(0)
      setGuideRating(0)
      setRouteRating(0)
      setComment('')
      setHasReviewed(true)

      setMessage('ส่งรีวิวสำเร็จ')
      setMessageType('success')
    } catch (error) {
      setMessage(
        error.message || 'ไม่สามารถส่งรีวิวได้',
      )
      setMessageType('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          รีวิวการเดินทาง
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          แบ่งปันประสบการณ์และความคิดเห็นของคุณ
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
          {/* ส่วนแบบฟอร์มรีวิว */}
          <section className="p-5 md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                ข้อมูลทริปที่คุณรีวิว
              </h2>

              {USING_SAMPLE_TRIP_DATA && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  ข้อมูลตัวอย่าง
                </span>
              )}
            </div>

            {/* กล่องแจ้งข้อมูลที่กำลังรอจากสมาชิกในทีม */}
            {USING_SAMPLE_TRIP_DATA && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <Database
                    size={21}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />

                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-amber-800">
                      กำลังใช้ข้อมูลตัวอย่างสำหรับพัฒนา
                    </h3>

                    <p className="mt-1 text-sm text-amber-700">
                      ข้อมูลส่วนนี้จะเปลี่ยนเป็นข้อมูลจริง
                      หลังจากเชื่อมระบบของสมาชิกในทีม
                    </p>

                    <div className="mt-3 grid gap-2 text-xs text-amber-800 sm:grid-cols-3">
                      <div className="rounded-lg bg-white/70 px-3 py-2">
                        <strong>M2</strong>

                        <p className="mt-0.5">
                          เส้นทาง รูปภาพ และจุดนัดพบ
                        </p>
                      </div>

                      <div className="rounded-lg bg-white/70 px-3 py-2">
                        <strong>M3</strong>

                        <p className="mt-0.5">
                          การจอง วันเวลา และสถานะ
                        </p>
                      </div>

                      <div className="rounded-lg bg-white/70 px-3 py-2">
                        <strong>M4</strong>

                        <p className="mt-0.5">
                          ไกด์ที่ได้รับมอบหมาย
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* กล่องข้อมูลทริป */}
            <div className="mb-6 flex flex-col gap-4 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-center">
              <div className="flex h-32 w-full shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 via-blue-100 to-green-100 text-5xl sm:w-36">
                🏫
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-bold text-gray-900">
                  {trip.routeName}
                </h3>

                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  <p className="flex items-start gap-2">
                    <MapPin
                      size={17}
                      className="mt-0.5 shrink-0"
                    />

                    <span>
                      จุดนัดพบ: {trip.meetingPoint}
                    </span>
                  </p>

                  <p className="flex items-center gap-2">
                    <UserRound
                      size={17}
                      className="shrink-0"
                    />

                    <span>
                      ไกด์: {trip.guideName}
                    </span>
                  </p>

                  <p className="flex items-center gap-2">
                    <CalendarDays
                      size={17}
                      className="shrink-0"
                    />

                    <span>
                      วันที่เดินทาง: {trip.travelDate}
                    </span>
                  </p>

                  <p className="flex items-center gap-2">
                    <Clock3
                      size={17}
                      className="shrink-0"
                    />

                    <span>
                      เวลาเดินทาง: {trip.travelTime}
                    </span>
                  </p>

                  <p className="flex items-center gap-2">
                    <Hash
                      size={17}
                      className="shrink-0"
                    />

                    <span>
                      หมายเลขการจอง: {trip.bookingId}
                    </span>
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                    <CheckCircle2 size={15} />
                    {trip.status}
                  </span>

                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                    <Star
                      size={17}
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

            {/* ข้อความแจ้งผล */}
            {message && (
              <div
                className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
                  messageType === 'success'
                    ? 'border border-green-200 bg-green-50 text-green-700'
                    : 'border border-red-200 bg-red-50 text-red-700'
                }`}
                role="alert"
              >
                {message}
              </div>
            )}

            {/* ตรวจว่าผู้ใช้เคยรีวิวแล้วหรือไม่ */}
            {hasReviewed ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
                <CheckCircle2
                  size={34}
                  className="mx-auto text-green-600"
                />

                <h3 className="mt-2 font-semibold text-green-800">
                  คุณส่งรีวิวสำหรับการจองนี้แล้ว
                </h3>

                <p className="mt-1 text-sm text-green-700">
                  หนึ่งการจองสามารถส่งรีวิวได้หนึ่งครั้ง
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <StarRating
                    label="ความประทับใจโดยรวม"
                    value={overallRating}
                    onChange={(value) => {
                      setOverallRating(value)
                      clearMessage()
                    }}
                    disabled={isSubmitting}
                  />

                  <StarRating
                    label="การให้บริการของไกด์"
                    value={guideRating}
                    onChange={(value) => {
                      setGuideRating(value)
                      clearMessage()
                    }}
                    disabled={isSubmitting}
                  />

                  <StarRating
                    label="เส้นทางและสถานที่"
                    value={routeRating}
                    onChange={(value) => {
                      setRouteRating(value)
                      clearMessage()
                    }}
                    disabled={isSubmitting}
                  />
                </div>

                <label
                  htmlFor="review-comment"
                  className="mb-2 mt-5 block font-semibold text-gray-900"
                >
                  ความคิดเห็นเพิ่มเติม
                </label>

                <textarea
                  id="review-comment"
                  value={comment}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setComment(event.target.value)
                    clearMessage()
                  }}
                  rows={4}
                  maxLength={500}
                  placeholder="แชร์ประสบการณ์ของคุณ..."
                  className="w-full resize-none rounded-xl border border-gray-300 p-3.5 text-gray-700 outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                />

                <p className="mt-1 text-right text-xs text-gray-500">
                  {comment.length}/500
                </p>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-3 rounded-lg bg-purple-700 px-8 py-2.5 font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:bg-purple-300"
                >
                  {isSubmitting
                    ? 'กำลังส่ง...'
                    : 'ส่งรีวิว'}
                </button>
              </form>
            )}
          </section>

          {/* ส่วนรายการรีวิว */}
          <section className="border-t border-gray-200 bg-gray-50 p-5 md:p-6 lg:border-l lg:border-t-0">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                รีวิวล่าสุด
              </h2>

              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                {reviews.length} รีวิว
              </span>
            </div>

            {isLoading ? (
              <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500">
                กำลังโหลดรีวิว...
              </div>
            ) : reviews.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
                <div className="mb-2 text-4xl">
                  💬
                </div>

                <h3 className="font-semibold text-gray-800">
                  ยังไม่มีรีวิว
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  เมื่อมีผู้ใช้ส่งรีวิว รายการจะแสดงที่นี่
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => {
                  const reviewerName =
                    review.reviewer_name || 'ผู้ใช้งาน'

                  return (
                    <article
                      key={review.id}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 font-bold text-purple-700">
                            {reviewerName
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <h3 className="font-bold text-gray-900">
                              {reviewerName}
                            </h3>

                            <p className="mt-0.5 text-xs text-gray-500">
                              {formatReviewDate(
                                review.created_at,
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1 font-bold text-amber-500">
                          <Star
                            size={19}
                            className="fill-amber-400 text-amber-400"
                          />

                          {review.overall_rating}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                          ไกด์ {review.guide_rating}/5
                        </span>

                        <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-700">
                          เส้นทาง {review.route_rating}/5
                        </span>
                      </div>

                      <p className="mt-3 text-sm leading-relaxed text-gray-700">
                        {review.comment}
                      </p>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

export default Review