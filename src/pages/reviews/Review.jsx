import { useEffect, useMemo, useState } from 'react'
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

import StarRating from '../../components/reviews/StarRating'

import { getBookingDetail } from '../../services/bookingService'

import {
  createReview,
  getMyReviewByBookingId,
  getReviews,
  updateReview,
} from '../../services/review'

import { listRouteStops } from '../../services/routeService'

import {
  getGuideNameForSchedule,
  getScheduleDetail,
} from '../../services/scheduleService'

const BOOKING_STATUS_LABELS = {
  CONFIRMED: 'ยืนยันการจองแล้ว',
  CANCELLED: 'ยกเลิกแล้ว',
  COMPLETED: 'เดินทางเสร็จสิ้น',
}

function getRelationItem(value) {
  if (Array.isArray(value)) {
    return value[0] || null
  }

  return value || null
}

function getRelationList(value) {
  if (Array.isArray(value)) {
    return value
  }

  return value ? [value] : []
}

function getServiceError(
  result,
  fallbackMessage = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
) {
  return result?.error?.message || fallbackMessage
}

function formatTripDate(dateValue) {
  if (!dateValue) {
    return '-'
  }

  const date = new Date(`${dateValue}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return dateValue
  }

  return date.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatTripTime(timeValue) {
  if (!timeValue) {
    return '-'
  }

  return `${String(timeValue).slice(0, 5)} น.`
}

function formatReviewDate(dateValue) {
  if (!dateValue) {
    return '-'
  }

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Review() {
  const { bookingId } = useParams()

  const [trip, setTrip] = useState(null)
  const [canReview, setCanReview] = useState(false)

  const [overallRating, setOverallRating] = useState(0)
  const [guideRating, setGuideRating] = useState(0)
  const [routeRating, setRouteRating] = useState(0)
  const [comment, setComment] = useState('')

  const [reviews, setReviews] = useState([])
  const [hasReviewed, setHasReviewed] = useState(false)

  // เก็บรีวิวของผู้ใช้สำหรับการแก้ไข
  const [myReview, setMyReview] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

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
        sum + Number(review.overall_rating || 0),
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
      setTrip(null)
      setCanReview(false)
      setHasReviewed(false)
      setMyReview(null)
      setIsEditing(false)

      setOverallRating(0)
      setGuideRating(0)
      setRouteRating(0)
      setComment('')

      try {
        // ====================================================
        // PUBLIC REVIEW PAGE
        // ====================================================
        if (!bookingId) {
          const reviewResult = await getReviews()

          if (!reviewResult.success) {
            throw new Error(
              getServiceError(
                reviewResult,
                'ไม่สามารถโหลดรายการรีวิวได้',
              ),
            )
          }

          if (isActive) {
            setReviews(reviewResult.data || [])
          }

          return
        }

        // ====================================================
        // MEMBER REVIEW PAGE
        // ====================================================

        const bookingResult =
          await getBookingDetail(bookingId)

        if (!bookingResult.success) {
          throw new Error(
            getServiceError(
              bookingResult,
              'ไม่สามารถโหลดข้อมูลการจองได้',
            ),
          )
        }

        const booking = bookingResult.data

        if (!booking) {
          throw new Error('ไม่พบข้อมูลการจอง')
        }

        const [
          scheduleResult,
          guideNameResult,
          reviewResult,
          myReviewResult,
        ] = await Promise.all([
          getScheduleDetail(booking.schedule_id),
          getGuideNameForSchedule(
            booking.schedule_id,
          ),
          getReviews(booking.id),
          getMyReviewByBookingId(booking.id),
        ])

        if (!scheduleResult.success) {
          throw new Error(
            getServiceError(
              scheduleResult,
              'ไม่สามารถโหลดข้อมูลรอบนำเที่ยวได้',
            ),
          )
        }

        if (!reviewResult.success) {
          throw new Error(
            getServiceError(
              reviewResult,
              'ไม่สามารถโหลดรายการรีวิวได้',
            ),
          )
        }

        if (!myReviewResult.success) {
          throw new Error(
            getServiceError(
              myReviewResult,
              'ไม่สามารถตรวจสอบรีวิวของคุณได้',
            ),
          )
        }

        const schedule = scheduleResult.data

        if (!schedule) {
          throw new Error(
            'ไม่พบข้อมูลรอบนำเที่ยว',
          )
        }

        const route = getRelationItem(
          schedule.routes,
        )

        const assignments = getRelationList(
          schedule.guide_assignments,
        )

        // Final M6 contract:
        // ใช้เฉพาะไกด์ที่ทำทัวร์เสร็จจริงเท่านั้น
        const completedAssignment =
          assignments.find(
            (item) =>
              item?.status === 'COMPLETED',
          ) || null

        let routeStops = []

        if (schedule.route_id) {
          const stopsResult =
            await listRouteStops(
              schedule.route_id,
            )

          if (stopsResult.success) {
            routeStops =
              stopsResult.data || []
          }
        }

        const guideName =
          guideNameResult?.success &&
          guideNameResult?.data
            ? guideNameResult.data
            : completedAssignment
              ? 'ไกด์ประจำรอบนำเที่ยว'
              : 'ยังไม่พบไกด์ที่ดำเนินทัวร์เสร็จสิ้น'

        const firstStop =
          routeStops[0] || null

        const bookingCompleted =
          booking.status === 'COMPLETED'

        const scheduleCompleted =
          schedule.status === 'COMPLETED'

        /*
         * Client-side eligibility ช่วย UX
         * แต่ฐานข้อมูลเป็นผู้ตัดสินสุดท้าย
         * ว่าสามารถสร้างรีวิวได้จริงหรือไม่
         */
        const finalCanReview =
          bookingCompleted &&
          scheduleCompleted

        const loadedTrip = {
          bookingId: booking.id,

          routeName:
            route?.name ||
            'ไม่พบชื่อเส้นทาง',

          meetingPoint:
            firstStop?.name ||
            'ยังไม่ระบุจุดนัดพบ',

          guideName,

          travelDate: formatTripDate(
            schedule.tour_date,
          ),

          travelTime: formatTripTime(
            schedule.start_time,
          ),

          status:
            BOOKING_STATUS_LABELS[
              booking.status
            ] || booking.status,

          statusCode: booking.status,

          scheduleStatus:
            schedule.status,

          imageUrl:
            firstStop?.image_url || null,
        }

        if (!isActive) {
          return
        }

        const currentReview =
          myReviewResult.data || null

        setTrip(loadedTrip)

        setReviews(
          reviewResult.data || [],
        )

        setMyReview(currentReview)
        setHasReviewed(Boolean(currentReview))

        setCanReview(finalCanReview)
      } catch (error) {
        if (!isActive) {
          return
        }

        setReviews([])
        setTrip(null)
        setCanReview(false)
        setHasReviewed(false)
        setMyReview(null)
        setIsEditing(false)

        setMessage(
          error?.message ||
            'ไม่สามารถโหลดข้อมูลรีวิวได้',
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
  }, [bookingId])

  const clearMessage = () => {
    setMessage('')
    setMessageType('')
  }

  // ====================================================
  // EDIT REVIEW
  // ====================================================

  const handleStartEdit = () => {
    if (!myReview) {
      setMessage(
        'ไม่พบข้อมูลรีวิวที่ต้องการแก้ไข',
      )
      setMessageType('error')
      return
    }

    setOverallRating(
      Number(myReview.overall_rating || 0),
    )

    setGuideRating(
      Number(myReview.guide_rating || 0),
    )

    setRouteRating(
      Number(myReview.route_rating || 0),
    )

    setComment(myReview.comment || '')

    setIsEditing(true)
    clearMessage()
  }

  const handleCancelEdit = () => {
    setOverallRating(0)
    setGuideRating(0)
    setRouteRating(0)
    setComment('')

    setIsEditing(false)
    clearMessage()
  }

  // ====================================================
  // CREATE / UPDATE REVIEW
  // ====================================================

  const handleSubmit = async (event) => {
    event.preventDefault()
    clearMessage()

    if (!bookingId || !trip) {
      setMessage(
        'ไม่พบข้อมูลการจองที่ต้องการรีวิว',
      )
      setMessageType('error')
      return
    }

    /*
     * การสร้างรีวิวใหม่ต้องผ่านเงื่อนไข COMPLETED
     * ส่วนการแก้ไข ใช้รีวิวเดิมที่มีอยู่และให้ Backend/RLS
     * ตรวจสิทธิ์เจ้าของรีวิวอีกชั้นหนึ่ง
     */
    if (!isEditing && !canReview) {
      setMessage(
        'สามารถรีวิวได้หลังจากการจองและรอบนำเที่ยวเสร็จสิ้นแล้วเท่านั้น',
      )
      setMessageType('error')
      return
    }

    if (
      overallRating === 0 ||
      guideRating === 0 ||
      routeRating === 0
    ) {
      setMessage(
        'กรุณาให้คะแนนให้ครบทั้ง 3 หมวด',
      )
      setMessageType('error')
      return
    }

    const normalizedComment =
      comment.trim()

    if (normalizedComment === '') {
      setMessage(
        'กรุณาเขียนความคิดเห็นก่อนส่งรีวิว',
      )
      setMessageType('error')
      return
    }

    if (normalizedComment.length > 500) {
      setMessage(
        'ความคิดเห็นต้องไม่เกิน 500 ตัวอักษร',
      )
      setMessageType('error')
      return
    }

    setIsSubmitting(true)

    try {
      // ====================================================
      // UPDATE EXISTING REVIEW
      // ====================================================
      if (isEditing) {
        if (!myReview?.id) {
          setMessage(
            'ไม่พบรีวิวที่ต้องการแก้ไข',
          )
          setMessageType('error')
          return
        }

        const updateResult =
          await updateReview(
            myReview.id,
            {
              overallRating,
              guideRating,
              routeRating,
              comment:
                normalizedComment,
            },
          )

        if (!updateResult.success) {
          setMessage(
            getServiceError(
              updateResult,
              'ไม่สามารถแก้ไขรีวิวได้',
            ),
          )

          setMessageType('error')
          return
        }

        const updatedReview =
          updateResult.data

        if (updatedReview) {
          setMyReview(updatedReview)

          setReviews(
            (currentReviews) =>
              currentReviews.map(
                (review) =>
                  review.id ===
                  updatedReview.id
                    ? updatedReview
                    : review,
              ),
          )
        }

        setOverallRating(0)
        setGuideRating(0)
        setRouteRating(0)
        setComment('')

        setIsEditing(false)
        setHasReviewed(true)

        setMessage(
          'แก้ไขรีวิวสำเร็จ',
        )
        setMessageType('success')

        return
      }

      // ====================================================
      // CREATE NEW REVIEW
      // ====================================================

      const createResult =
        await createReview({
          bookingId,
          overallRating,
          guideRating,
          routeRating,
          comment: normalizedComment,
        })

      if (!createResult.success) {
        if (
          createResult.error?.code ===
          'ALREADY_EXISTS'
        ) {
          setHasReviewed(true)

          const [
            refreshedResult,
            myReviewResult,
          ] = await Promise.all([
            getReviews(bookingId),
            getMyReviewByBookingId(
              bookingId,
            ),
          ])

          if (refreshedResult.success) {
            setReviews(
              refreshedResult.data || [],
            )
          }

          if (myReviewResult.success) {
            setMyReview(
              myReviewResult.data || null,
            )
          }
        }

        setMessage(
          getServiceError(
            createResult,
            'ไม่สามารถส่งรีวิวได้',
          ),
        )

        setMessageType('error')
        return
      }

      const newReview =
        createResult.data

      setMyReview(newReview || null)

      if (newReview) {
        setReviews(
          (currentReviews) => [
            newReview,
            ...currentReviews.filter(
              (review) =>
                review.id !== newReview.id,
            ),
          ],
        )
      }

      setOverallRating(0)
      setGuideRating(0)
      setRouteRating(0)
      setComment('')

      setHasReviewed(true)

      setMessage('ส่งรีวิวสำเร็จ')
      setMessageType('success')
    } catch (error) {
      setMessage(
        error?.message ||
          (isEditing
            ? 'ไม่สามารถแก้ไขรีวิวได้'
            : 'ไม่สามารถส่งรีวิวได้'),
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

          {/* ==================================================
              LEFT SIDE
          ================================================== */}
          <section className="p-5 md:p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              ข้อมูลทริปที่คุณรีวิว
            </h2>

            {isLoading && bookingId && (
              <div className="mb-5 rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">
                กำลังโหลดข้อมูลการเดินทาง...
              </div>
            )}

            {!bookingId &&
              !isLoading && (
                <div className="mb-5 rounded-xl border border-purple-200 bg-purple-50 p-5">
                  <h3 className="font-semibold text-purple-800">
                    เลือกรายการจองที่ต้องการรีวิว
                  </h3>

                  <p className="mt-1 text-sm text-purple-700">
                    กรุณาเข้าหน้ารายการจองของฉัน
                    แล้วเลือกการจองที่เดินทางเสร็จสิ้น
                  </p>
                </div>
              )}

            {trip && (
              <div className="mb-6 flex flex-col gap-4 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-center">

                {trip.imageUrl ? (
                  <img
                    src={trip.imageUrl}
                    alt={trip.routeName}
                    className="h-32 w-full shrink-0 rounded-xl object-cover sm:w-36"
                  />
                ) : (
                  <div className="flex h-32 w-full shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 via-blue-100 to-green-100 text-5xl sm:w-36">
                    🏫
                  </div>
                )}

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
                        จุดนัดพบ:{' '}
                        {trip.meetingPoint}
                      </span>
                    </p>

                    <p className="flex items-center gap-2">
                      <UserRound size={17} />

                      <span>
                        ไกด์: {trip.guideName}
                      </span>
                    </p>

                    <p className="flex items-center gap-2">
                      <CalendarDays
                        size={17}
                      />

                      <span>
                        วันที่เดินทาง:{' '}
                        {trip.travelDate}
                      </span>
                    </p>

                    <p className="flex items-center gap-2">
                      <Clock3 size={17} />

                      <span>
                        เวลาเดินทาง:{' '}
                        {trip.travelTime}
                      </span>
                    </p>

                    <p className="flex items-center gap-2">
                      <Hash size={17} />

                      <span className="break-all">
                        หมายเลขการจอง:{' '}
                        {trip.bookingId}
                      </span>
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        trip.statusCode ===
                        'COMPLETED'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      <CheckCircle2
                        size={15}
                      />

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
                        ({reviews.length}{' '}
                        รีวิว)
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {message && (
              <div
                className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
                  messageType ===
                  'success'
                    ? 'border border-green-200 bg-green-50 text-green-700'
                    : 'border border-red-200 bg-red-50 text-red-700'
                }`}
                role="alert"
              >
                {message}
              </div>
            )}

            {bookingId &&
              !isLoading &&
              trip &&
              (hasReviewed &&
              !isEditing ? (
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
                    แต่สามารถแก้ไขรีวิวเดิมของคุณได้
                  </p>

                  <button
                    type="button"
                    onClick={
                      handleStartEdit
                    }
                    className="mt-4 rounded-lg bg-purple-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-800"
                  >
                    แก้ไขรีวิว
                  </button>
                </div>
              ) : !canReview &&
                !isEditing ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
                  <Clock3
                    size={34}
                    className="mx-auto text-amber-600"
                  />

                  <h3 className="mt-2 font-semibold text-amber-800">
                    ยังไม่สามารถส่งรีวิวได้
                  </h3>

                  <p className="mt-1 text-sm text-amber-700">
                    สามารถรีวิวได้หลังจากการจองและรอบนำเที่ยวมีสถานะ
                    COMPLETED แล้วเท่านั้น
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                >
                  {isEditing && (
                    <div className="mb-5 rounded-xl border border-purple-200 bg-purple-50 p-4">
                      <h3 className="font-semibold text-purple-800">
                        กำลังแก้ไขรีวิวของคุณ
                      </h3>

                      <p className="mt-1 text-sm text-purple-700">
                        คะแนนและความคิดเห็นเดิมถูกนำมาแสดงให้แล้ว
                        คุณสามารถแก้ไขและบันทึกใหม่ได้
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <StarRating
                      label="ความประทับใจโดยรวม"
                      value={overallRating}
                      onChange={(value) => {
                        setOverallRating(
                          value,
                        )
                        clearMessage()
                      }}
                      disabled={
                        isSubmitting
                      }
                    />

                    <StarRating
                      label="การให้บริการของไกด์"
                      value={guideRating}
                      onChange={(value) => {
                        setGuideRating(
                          value,
                        )
                        clearMessage()
                      }}
                      disabled={
                        isSubmitting
                      }
                    />

                    <StarRating
                      label="เส้นทางและสถานที่"
                      value={routeRating}
                      onChange={(value) => {
                        setRouteRating(
                          value,
                        )
                        clearMessage()
                      }}
                      disabled={
                        isSubmitting
                      }
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
                    disabled={
                      isSubmitting
                    }
                    onChange={(event) => {
                      setComment(
                        event.target.value,
                      )
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

                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={
                        isSubmitting
                      }
                      className="rounded-lg bg-purple-700 px-8 py-2.5 font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:bg-purple-300"
                    >
                      {isSubmitting
                        ? isEditing
                          ? 'กำลังบันทึก...'
                          : 'กำลังส่ง...'
                        : isEditing
                          ? 'บันทึกการแก้ไข'
                          : 'ส่งรีวิว'}
                    </button>

                    {isEditing && (
                      <button
                        type="button"
                        onClick={
                          handleCancelEdit
                        }
                        disabled={
                          isSubmitting
                        }
                        className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        ยกเลิก
                      </button>
                    )}
                  </div>
                </form>
              ))}
          </section>

          {/* ==================================================
              RIGHT SIDE
          ================================================== */}
          <section className="border-t border-gray-200 bg-gray-50 p-5 md:p-6 lg:border-l lg:border-t-0">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {bookingId
                  ? 'รีวิวของการจองนี้'
                  : 'รีวิวล่าสุด'}
              </h2>

              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                {reviews.length} รีวิว
              </span>
            </div>

            {isLoading ? (
              <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500">
                กำลังโหลดรีวิว...
              </div>
            ) : reviews.length ===
              0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
                <div className="mb-2 text-4xl">
                  💬
                </div>

                <h3 className="font-semibold text-gray-800">
                  ยังไม่มีรีวิว
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  เมื่อมีผู้ใช้ส่งรีวิว
                  รายการจะแสดงที่นี่
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map(
                  (review) => {
                    const reviewerName =
                      review.reviewer_name ||
                      'ผู้ใช้งาน'

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
                                {
                                  reviewerName
                                }
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

                            {
                              review.overall_rating
                            }
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                            ไกด์{' '}
                            {
                              review.guide_rating
                            }
                            /5
                          </span>

                          <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-700">
                            เส้นทาง{' '}
                            {
                              review.route_rating
                            }
                            /5
                          </span>
                        </div>

                        <p className="mt-3 text-sm leading-relaxed text-gray-700">
                          {review.comment}
                        </p>
                      </article>
                    )
                  },
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

export default Review