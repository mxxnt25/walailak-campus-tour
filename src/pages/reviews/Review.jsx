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

// ============================================================
// BOOKING STATUS
// ============================================================

const BOOKING_STATUS_LABELS = {
  CONFIRMED: 'ยืนยันการจองแล้ว',
  CANCELLED: 'ยกเลิกแล้ว',
  COMPLETED: 'เดินทางเสร็จสิ้น',
}

// ============================================================
// ROUTE IMAGES
// ============================================================

const ROUTE_IMAGES = {
  'Campus Highlights Route':
    '/route-images/campus-highlights.jpg',

  'Walailak Gateway':
    '/route-images/walailak-gateway.jpg',

  'สวนวลัยลักษณ์':
    '/route-images/walailak-park.jpg',

  'อาคารเครื่องมือวิทยาศาสตร์และเทคโนโลยี 8 มหาวิทยาลัยวลัยลักษณ์':
    '/route-images/science-building.jpg',
}

// หน้า Public Reviews
// เปลี่ยนรูปทุก 10 วินาที
const PUBLIC_REVIEW_BACKGROUNDS = [
  '/route-images/campus-highlights.jpg',
  '/route-images/walailak-gateway.jpg',
  '/route-images/walailak-park.jpg',
  '/route-images/science-building.jpg',
]

// ============================================================
// HELPERS
// ============================================================

function getRouteImageUrl(routeName) {
  const normalizedRouteName =
    typeof routeName === 'string'
      ? routeName.trim()
      : ''

  if (!normalizedRouteName) {
    return null
  }

  if (ROUTE_IMAGES[normalizedRouteName]) {
    return ROUTE_IMAGES[normalizedRouteName]
  }

  if (
    normalizedRouteName.includes(
      'Campus Highlights Route',
    )
  ) {
    return ROUTE_IMAGES[
      'Campus Highlights Route'
    ]
  }

  if (
    normalizedRouteName.includes(
      'Walailak Gateway',
    )
  ) {
    return ROUTE_IMAGES[
      'Walailak Gateway'
    ]
  }

  if (
    normalizedRouteName.includes(
      'สวนวลัยลักษณ์',
    )
  ) {
    return ROUTE_IMAGES[
      'สวนวลัยลักษณ์'
    ]
  }

  if (
    normalizedRouteName.includes(
      'อาคารเครื่องมือวิทยาศาสตร์และเทคโนโลยี 8',
    )
  ) {
    return ROUTE_IMAGES[
      'อาคารเครื่องมือวิทยาศาสตร์และเทคโนโลยี 8 มหาวิทยาลัยวลัยลักษณ์'
    ]
  }

  return null
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
  return (
    result?.error?.message ||
    fallbackMessage
  )
}

function formatTripDate(dateValue) {
  if (!dateValue) {
    return '-'
  }

  const date = new Date(
    `${dateValue}T00:00:00`,
  )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return dateValue
  }

  return date.toLocaleDateString(
    'th-TH',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
  )
}

function formatTripTime(timeValue) {
  if (!timeValue) {
    return '-'
  }

  return `${String(
    timeValue,
  ).slice(0, 5)} น.`
}

function formatReviewDate(dateValue) {
  if (!dateValue) {
    return '-'
  }

  const date = new Date(
    dateValue,
  )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '-'
  }

  return date.toLocaleDateString(
    'th-TH',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  )
}

// ============================================================
// COMPACT STAR RATING
// ดาวอยู่ในกรอบแน่นอน
// ============================================================

function CompactStarRating({
  label,
  value,
  onChange,
  disabled = false,
}) {
  return (
    <div className="min-w-0">
      <p
        className="
          mb-2
          truncate
          text-[13px]
          font-semibold
          text-gray-900
        "
        title={label}
      >
        {label}
      </p>

      <div
        className="
          flex
          min-w-0
          flex-wrap
          items-center
          gap-x-2
          gap-y-1
        "
      >
        <div
          className="
            flex
            shrink-0
            items-center
            gap-0.5
          "
        >
          {[1, 2, 3, 4, 5].map(
            (rating) => {
              const active =
                rating <= value

              return (
                <button
                  key={rating}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onChange(rating)
                  }
                  aria-label={`${label} ${rating} ดาว`}
                  className="
                    flex
                    h-7
                    w-7
                    shrink-0
                    items-center
                    justify-center
                    rounded-md
                    p-0
                    transition
                    hover:scale-110
                    focus:outline-none
                    focus:ring-2
                    focus:ring-purple-300
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  <Star
                    size={25}
                    strokeWidth={2}
                    className={
                      active
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300'
                    }
                  />
                </button>
              )
            },
          )}
        </div>

        <span
          className="
            whitespace-nowrap
            text-[11px]
            text-gray-500
          "
        >
          {value > 0
            ? `${value}/5`
            : 'เลือกคะแนน'}
        </span>
      </div>
    </div>
  )
}

// ============================================================
// REVIEW PAGE
// ============================================================

function Review() {
  const { bookingId } =
    useParams()

  // ==========================================================
  // BACKGROUND
  // ==========================================================

  const [
    publicBackgroundIndex,
    setPublicBackgroundIndex,
  ] = useState(0)

  // ==========================================================
  // TRIP
  // ==========================================================

  const [
    trip,
    setTrip,
  ] = useState(null)

  const [
    canReview,
    setCanReview,
  ] = useState(false)

  // ==========================================================
  // FORM
  // ==========================================================

  const [
    overallRating,
    setOverallRating,
  ] = useState(0)

  const [
    guideRating,
    setGuideRating,
  ] = useState(0)

  const [
    routeRating,
    setRouteRating,
  ] = useState(0)

  const [
    comment,
    setComment,
  ] = useState('')

  // ==========================================================
  // REVIEWS
  // ==========================================================

  const [
    reviews,
    setReviews,
  ] = useState([])

  const [
    hasReviewed,
    setHasReviewed,
  ] = useState(false)

  const [
    myReview,
    setMyReview,
  ] = useState(null)

  const [
    isEditing,
    setIsEditing,
  ] = useState(false)

  // ==========================================================
  // UI
  // ==========================================================

  const [
    message,
    setMessage,
  ] = useState('')

  const [
    messageType,
    setMessageType,
  ] = useState('')

  const [
    isLoading,
    setIsLoading,
  ] = useState(true)

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false)

  const [
    tripImageFailed,
    setTripImageFailed,
  ] = useState(false)

  // ==========================================================
  // AVERAGE RATING
  // ==========================================================

  const averageRating =
    useMemo(() => {
      if (
        reviews.length === 0
      ) {
        return '0.0'
      }

      const total =
        reviews.reduce(
          (
            sum,
            review,
          ) =>
            sum +
            Number(
              review.overall_rating ||
                0,
            ),
          0,
        )

      return (
        total /
        reviews.length
      ).toFixed(1)
    }, [reviews])

  // ==========================================================
  // PUBLIC BACKGROUND
  // ==========================================================

  useEffect(() => {
    if (bookingId) {
      setPublicBackgroundIndex(
        0,
      )

      return undefined
    }

    const intervalId =
      window.setInterval(
        () => {
          setPublicBackgroundIndex(
            (
              currentIndex,
            ) =>
              (currentIndex +
                1) %
              PUBLIC_REVIEW_BACKGROUNDS.length,
          )
        },
        10000,
      )

    return () => {
      window.clearInterval(
        intervalId,
      )
    }
  }, [bookingId])

  // ==========================================================
  // LOAD DATA
  // ==========================================================

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

      setTripImageFailed(false)

      try {
        // ====================================================
        // PUBLIC REVIEWS
        // ====================================================

        if (!bookingId) {
          const reviewResult =
            await getReviews()

          if (
            !reviewResult.success
          ) {
            throw new Error(
              getServiceError(
                reviewResult,
                'ไม่สามารถโหลดรายการรีวิวได้',
              ),
            )
          }

          if (isActive) {
            setReviews(
              reviewResult.data ||
                [],
            )
          }

          return
        }

        // ====================================================
        // BOOKING
        // ====================================================

        const bookingResult =
          await getBookingDetail(
            bookingId,
          )

        if (
          !bookingResult.success
        ) {
          throw new Error(
            getServiceError(
              bookingResult,
              'ไม่สามารถโหลดข้อมูลการจองได้',
            ),
          )
        }

        const booking =
          bookingResult.data

        if (!booking) {
          throw new Error(
            'ไม่พบข้อมูลการจอง',
          )
        }

        const [
          scheduleResult,
          guideNameResult,
          reviewResult,
          myReviewResult,
        ] =
          await Promise.all([
            getScheduleDetail(
              booking.schedule_id,
            ),

            getGuideNameForSchedule(
              booking.schedule_id,
            ),

            getReviews(
              booking.id,
            ),

            getMyReviewByBookingId(
              booking.id,
            ),
          ])

        if (
          !scheduleResult.success
        ) {
          throw new Error(
            getServiceError(
              scheduleResult,
              'ไม่สามารถโหลดข้อมูลรอบนำเที่ยวได้',
            ),
          )
        }

        if (
          !reviewResult.success
        ) {
          throw new Error(
            getServiceError(
              reviewResult,
              'ไม่สามารถโหลดรายการรีวิวได้',
            ),
          )
        }

        if (
          !myReviewResult.success
        ) {
          throw new Error(
            getServiceError(
              myReviewResult,
              'ไม่สามารถตรวจสอบรีวิวของคุณได้',
            ),
          )
        }

        const schedule =
          scheduleResult.data

        if (!schedule) {
          throw new Error(
            'ไม่พบข้อมูลรอบนำเที่ยว',
          )
        }

        // ====================================================
        // ROUTE
        // ====================================================

        const route =
          getRelationItem(
            schedule.routes,
          )

        // ====================================================
        // GUIDE ASSIGNMENT
        // ====================================================

        const assignments =
          getRelationList(
            schedule.guide_assignments,
          )

        const completedAssignment =
          assignments.find(
            (item) =>
              item?.status ===
              'COMPLETED',
          ) || null

        // ====================================================
        // ROUTE STOPS
        // ====================================================

        let routeStops = []

        if (
          schedule.route_id
        ) {
          const stopsResult =
            await listRouteStops(
              schedule.route_id,
            )

          if (
            stopsResult.success
          ) {
            routeStops =
              stopsResult.data ||
              []
          }
        }

        // ====================================================
        // GUIDE NAME
        // ====================================================

        const guideName =
          guideNameResult?.success &&
          guideNameResult?.data
            ? guideNameResult.data
            : completedAssignment
              ? 'ไกด์ประจำรอบนำเที่ยว'
              : 'ยังไม่พบไกด์ที่ดำเนินทัวร์เสร็จสิ้น'

        // ====================================================
        // ROUTE INFO
        // ====================================================

        const firstStop =
          routeStops[0] ||
          null

        const routeName =
          typeof route?.name ===
          'string'
            ? route.name.trim()
            : ''

        const routeImageUrl =
          getRouteImageUrl(
            routeName,
          )

        // ====================================================
        // REVIEW PERMISSION
        // ====================================================

        const bookingCompleted =
          booking.status ===
          'COMPLETED'

        const scheduleCompleted =
          schedule.status ===
          'COMPLETED'

        const finalCanReview =
          bookingCompleted &&
          scheduleCompleted

        // ====================================================
        // TRIP DATA
        // ====================================================

        const loadedTrip = {
          bookingId:
            booking.id,

          routeName:
            routeName ||
            'ไม่พบชื่อเส้นทาง',

          meetingPoint:
            firstStop?.name ||
            'ยังไม่ระบุจุดนัดพบ',

          guideName,

          travelDate:
            formatTripDate(
              schedule.tour_date,
            ),

          travelTime:
            formatTripTime(
              schedule.start_time,
            ),

          status:
            BOOKING_STATUS_LABELS[
              booking.status
            ] ||
            booking.status,

          statusCode:
            booking.status,

          scheduleStatus:
            schedule.status,

          imageUrl:
            routeImageUrl,
        }

        if (!isActive) {
          return
        }

        const currentReview =
          myReviewResult.data ||
          null

        setTrip(
          loadedTrip,
        )

        setReviews(
          reviewResult.data ||
            [],
        )

        setMyReview(
          currentReview,
        )

        setHasReviewed(
          Boolean(
            currentReview,
          ),
        )

        setCanReview(
          finalCanReview,
        )

        setTripImageFailed(
          false,
        )
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

        setTripImageFailed(
          false,
        )

        setMessage(
          error?.message ||
            'ไม่สามารถโหลดข้อมูลรีวิวได้',
        )

        setMessageType(
          'error',
        )
      } finally {
        if (isActive) {
          setIsLoading(
            false,
          )
        }
      }
    }

    loadReviewData()

    return () => {
      isActive = false
    }
  }, [bookingId])

  // ==========================================================
  // MESSAGE
  // ==========================================================

  const clearMessage = () => {
    setMessage('')
    setMessageType('')
  }

  // ==========================================================
  // EDIT REVIEW
  // ==========================================================

  const handleStartEdit =
    () => {
      if (!myReview) {
        setMessage(
          'ไม่พบข้อมูลรีวิวที่ต้องการแก้ไข',
        )

        setMessageType(
          'error',
        )

        return
      }

      setOverallRating(
        Number(
          myReview.overall_rating ||
            0,
        ),
      )

      setGuideRating(
        Number(
          myReview.guide_rating ||
            0,
        ),
      )

      setRouteRating(
        Number(
          myReview.route_rating ||
            0,
        ),
      )

      setComment(
        myReview.comment ||
          '',
      )

      setIsEditing(true)

      clearMessage()
    }

  const handleCancelEdit =
    () => {
      setOverallRating(0)
      setGuideRating(0)
      setRouteRating(0)

      setComment('')

      setIsEditing(false)

      clearMessage()
    }

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit =
    async (event) => {
      event.preventDefault()

      clearMessage()

      if (
        !bookingId ||
        !trip
      ) {
        setMessage(
          'ไม่พบข้อมูลการจองที่ต้องการรีวิว',
        )

        setMessageType(
          'error',
        )

        return
      }

      if (
        !isEditing &&
        !canReview
      ) {
        setMessage(
          'สามารถรีวิวได้หลังจากการจองและรอบนำเที่ยวเสร็จสิ้นแล้วเท่านั้น',
        )

        setMessageType(
          'error',
        )

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

        setMessageType(
          'error',
        )

        return
      }

      const normalizedComment =
        comment.trim()

      if (
        normalizedComment ===
        ''
      ) {
        setMessage(
          'กรุณาเขียนความคิดเห็นก่อนส่งรีวิว',
        )

        setMessageType(
          'error',
        )

        return
      }

      if (
        normalizedComment.length >
        500
      ) {
        setMessage(
          'ความคิดเห็นต้องไม่เกิน 500 ตัวอักษร',
        )

        setMessageType(
          'error',
        )

        return
      }

      setIsSubmitting(true)

      try {
        // ====================================================
        // UPDATE REVIEW
        // ====================================================

        if (isEditing) {
          if (
            !myReview?.id
          ) {
            setMessage(
              'ไม่พบรีวิวที่ต้องการแก้ไข',
            )

            setMessageType(
              'error',
            )

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

          if (
            !updateResult.success
          ) {
            setMessage(
              getServiceError(
                updateResult,
                'ไม่สามารถแก้ไขรีวิวได้',
              ),
            )

            setMessageType(
              'error',
            )

            return
          }

          const updatedReview =
            updateResult.data

          if (
            updatedReview
          ) {
            setMyReview(
              updatedReview,
            )

            setReviews(
              (
                currentReviews,
              ) =>
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

          setMessageType(
            'success',
          )

          return
        }

        // ====================================================
        // CREATE REVIEW
        // ====================================================

        const createResult =
          await createReview({
            bookingId,
            overallRating,
            guideRating,
            routeRating,
            comment:
              normalizedComment,
          })

        if (
          !createResult.success
        ) {
          if (
            createResult.error
              ?.code ===
            'ALREADY_EXISTS'
          ) {
            setHasReviewed(
              true,
            )

            const [
              refreshedResult,
              refreshedMyReviewResult,
            ] =
              await Promise.all([
                getReviews(
                  bookingId,
                ),

                getMyReviewByBookingId(
                  bookingId,
                ),
              ])

            if (
              refreshedResult.success
            ) {
              setReviews(
                refreshedResult.data ||
                  [],
              )
            }

            if (
              refreshedMyReviewResult.success
            ) {
              setMyReview(
                refreshedMyReviewResult.data ||
                  null,
              )
            }
          }

          setMessage(
            getServiceError(
              createResult,
              'ไม่สามารถส่งรีวิวได้',
            ),
          )

          setMessageType(
            'error',
          )

          return
        }

        const newReview =
          createResult.data

        setMyReview(
          newReview ||
          null,
        )

        if (newReview) {
          setReviews(
            (
              currentReviews,
            ) => [
              newReview,

              ...currentReviews.filter(
                (review) =>
                  review.id !==
                  newReview.id,
              ),
            ],
          )
        }

        setOverallRating(0)
        setGuideRating(0)
        setRouteRating(0)

        setComment('')

        setHasReviewed(true)

        setMessage(
          'ส่งรีวิวสำเร็จ',
        )

        setMessageType(
          'success',
        )
      } catch (error) {
        setMessage(
          error?.message ||
            (isEditing
              ? 'ไม่สามารถแก้ไขรีวิวได้'
              : 'ไม่สามารถส่งรีวิวได้'),
        )

        setMessageType(
          'error',
        )
      } finally {
        setIsSubmitting(
          false,
        )
      }
    }

  // ==========================================================
  // BOOKING BACKGROUND
  // ==========================================================

  const bookingBackgroundImage =
    bookingId &&
    trip?.imageUrl &&
    !tripImageFailed
      ? trip.imageUrl
      : null

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div
      className="
        relative
        left-1/2
        min-h-[calc(100vh-72px)]
        w-screen
        max-w-none
        -translate-x-1/2
        overflow-x-hidden
        bg-slate-100
      "
    >
      {/* ====================================================
          FULL SCREEN BACKGROUND
      ==================================================== */}

      {bookingId ? (
        bookingBackgroundImage && (
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -inset-3
              scale-105
              bg-cover
              bg-center
              bg-no-repeat
              blur-[5px]
            "
            style={{
              backgroundImage:
                `url("${bookingBackgroundImage}")`,
            }}
          />
        )
      ) : (
        <>
          {PUBLIC_REVIEW_BACKGROUNDS.map(
            (
              imageUrl,
              index,
            ) => (
              <div
                key={imageUrl}
                aria-hidden="true"
                className={`
                  pointer-events-none
                  absolute
                  -inset-3
                  scale-105
                  bg-cover
                  bg-center
                  bg-no-repeat
                  blur-[5px]
                  transition-opacity
                  duration-[1500ms]
                  ease-in-out

                  ${
                    index ===
                    publicBackgroundIndex
                      ? 'opacity-100'
                      : 'opacity-0'
                  }
                `}
                style={{
                  backgroundImage:
                    `url("${imageUrl}")`,
                }}
              />
            ),
          )}
        </>
      )}

      {/* Dark Overlay */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          bg-black/10
        "
      />

      {/* ====================================================
          PAGE CONTENT
      ==================================================== */}

      <main
        className="
          relative
          z-10
          mx-auto
          w-full
          max-w-[1500px]
          px-4
          py-3
          sm:px-5
          lg:px-6
        "
      >
        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="mb-2">
          <h1
            className="
              text-xl
              font-bold
              leading-tight
              text-white
              drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]
              sm:text-2xl
            "
          >
            รีวิวการเดินทาง
          </h1>

          <p
            className="
              mt-0.5
              text-xs
              font-medium
              text-white
              drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]
              sm:text-sm
            "
          >
            แบ่งปันประสบการณ์และความคิดเห็นของคุณ
          </p>
        </div>

        {/* ==================================================
            MAIN CARD
        ================================================== */}

        <div
          className="
            w-full
            overflow-hidden
            rounded-2xl
            border
            border-white/70
            bg-white/95
            shadow-xl
            backdrop-blur-md
          "
        >
          <div
            className="
              grid
              min-w-0
              lg:grid-cols-[1.13fr_0.87fr]
            "
          >
            {/* ==================================================
                LEFT
            ================================================== */}

            <section
              className="
                min-w-0
                p-4
                lg:p-5
              "
            >
              <h2
                className="
                  mb-3
                  text-lg
                  font-semibold
                  text-gray-900
                "
              >
                ข้อมูลทริปที่คุณรีวิว
              </h2>

              {/* Loading */}

              {isLoading &&
                bookingId && (
                  <div
                    className="
                      mb-3
                      rounded-xl
                      bg-gray-50
                      p-4
                      text-center
                      text-sm
                      text-gray-500
                    "
                  >
                    กำลังโหลดข้อมูลการเดินทาง...
                  </div>
                )}

              {/* Public Reviews Information */}

              {!bookingId &&
                !isLoading && (
                  <div
                    className="
                      mb-3
                      rounded-xl
                      border
                      border-purple-200
                      bg-purple-50
                      p-4
                    "
                  >
                    <h3
                      className="
                        font-semibold
                        text-purple-800
                      "
                    >
                      เลือกรายการจองที่ต้องการรีวิว
                    </h3>

                    <p
                      className="
                        mt-1
                        text-sm
                        text-purple-700
                      "
                    >
                      กรุณาเข้าหน้ารายการจองของฉัน
                      แล้วเลือกการจองที่เดินทางเสร็จสิ้น
                    </p>
                  </div>
                )}

              {/* ==================================================
                  TRIP
              ================================================== */}

              {trip && (
                <div
                  className="
                    mb-4
                    flex
                    min-w-0
                    flex-col
                    gap-4
                    rounded-xl
                    bg-gray-50/95
                    p-3
                    sm:flex-row
                    sm:items-center
                  "
                >
                  {/* Route Image */}

                  {trip.imageUrl &&
                  !tripImageFailed ? (
                    <img
                      src={
                        trip.imageUrl
                      }
                      alt={
                        trip.routeName
                      }
                      className="
                        h-44
                        w-full
                        shrink-0
                        rounded-xl
                        object-cover
                        object-center
                        shadow-sm
                        sm:h-44
                        sm:w-36
                      "
                      onError={() => {
                        setTripImageFailed(
                          true,
                        )
                      }}
                    />
                  ) : (
                    <div
                      className="
                        flex
                        h-44
                        w-full
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-gradient-to-br
                        from-purple-100
                        via-blue-100
                        to-green-100
                        text-4xl
                        sm:h-44
                        sm:w-36
                      "
                    >
                      🏫
                    </div>
                  )}

                  {/* Trip Details */}

                  <div
                    className="
                      min-w-0
                      flex-1
                    "
                  >
                    <h3
                      className="
                        truncate
                        text-lg
                        font-bold
                        text-gray-900
                      "
                      title={
                        trip.routeName
                      }
                    >
                      {
                        trip.routeName
                      }
                    </h3>

                    <div
                      className="
                        mt-2
                        space-y-1.5
                        text-[13px]
                        text-gray-600
                      "
                    >
                      <p
                        className="
                          flex
                          min-w-0
                          items-start
                          gap-2
                        "
                      >
                        <MapPin
                          size={15}
                          className="
                            mt-0.5
                            shrink-0
                          "
                        />

                        <span className="min-w-0">
                          จุดนัดพบ:{' '}
                          {
                            trip.meetingPoint
                          }
                        </span>
                      </p>

                      <p
                        className="
                          flex
                          min-w-0
                          items-center
                          gap-2
                        "
                      >
                        <UserRound
                          size={15}
                          className="shrink-0"
                        />

                        <span className="min-w-0 break-all">
                          ไกด์:{' '}
                          {
                            trip.guideName
                          }
                        </span>
                      </p>

                      <p
                        className="
                          flex
                          items-center
                          gap-2
                        "
                      >
                        <CalendarDays
                          size={15}
                          className="shrink-0"
                        />

                        <span>
                          วันที่เดินทาง:{' '}
                          {
                            trip.travelDate
                          }
                        </span>
                      </p>

                      <p
                        className="
                          flex
                          items-center
                          gap-2
                        "
                      >
                        <Clock3
                          size={15}
                          className="shrink-0"
                        />

                        <span>
                          เวลาเดินทาง:{' '}
                          {
                            trip.travelTime
                          }
                        </span>
                      </p>

                      <p
                        className="
                          flex
                          min-w-0
                          items-center
                          gap-2
                        "
                      >
                        <Hash
                          size={15}
                          className="shrink-0"
                        />

                        <span className="min-w-0 break-all">
                          หมายเลขการจอง:{' '}
                          {
                            trip.bookingId
                          }
                        </span>
                      </p>
                    </div>

                    {/* Status + Average */}

                    <div
                      className="
                        mt-2
                        flex
                        flex-wrap
                        items-center
                        gap-2
                      "
                    >
                      <span
                        className={`
                          inline-flex
                          items-center
                          gap-1
                          rounded-full
                          px-2.5
                          py-1
                          text-[11px]
                          font-medium

                          ${
                            trip.statusCode ===
                            'COMPLETED'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }
                        `}
                      >
                        <CheckCircle2
                          size={13}
                        />

                        {
                          trip.status
                        }
                      </span>

                      <span
                        className="
                          inline-flex
                          items-center
                          gap-1
                          text-[11px]
                          text-gray-600
                        "
                      >
                        <Star
                          size={15}
                          className="
                            fill-amber-400
                            text-amber-400
                          "
                        />

                        <strong
                          className="
                            text-amber-500
                          "
                        >
                          {
                            averageRating
                          }
                        </strong>

                        <span>
                          (
                          {
                            reviews.length
                          }{' '}
                          รีวิว)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================
                  MESSAGE
              ================================================== */}

              {message && (
                <div
                  className={`
                    mb-3
                    rounded-lg
                    px-3
                    py-2
                    text-xs
                    font-medium

                    ${
                      messageType ===
                      'success'
                        ? 'border border-green-200 bg-green-50 text-green-700'
                        : 'border border-red-200 bg-red-50 text-red-700'
                    }
                  `}
                  role="alert"
                >
                  {message}
                </div>
              )}

              {/* ==================================================
                  REVIEW STATE
              ================================================== */}

              {bookingId &&
                !isLoading &&
                trip &&
                (
                  hasReviewed &&
                  !isEditing ? (
                    // =================================================
                    // ALREADY REVIEWED
                    // =================================================

                    <div
                      className="
                        rounded-xl
                        border
                        border-green-200
                        bg-green-50
                        p-4
                        text-center
                      "
                    >
                      <CheckCircle2
                        size={28}
                        className="
                          mx-auto
                          text-green-600
                        "
                      />

                      <h3
                        className="
                          mt-1
                          text-sm
                          font-semibold
                          text-green-800
                        "
                      >
                        คุณส่งรีวิวสำหรับการจองนี้แล้ว
                      </h3>

                      <p
                        className="
                          mt-1
                          text-xs
                          text-green-700
                        "
                      >
                        หนึ่งการจองสามารถส่งรีวิวได้หนึ่งครั้ง
                        แต่สามารถแก้ไขรีวิวเดิมของคุณได้
                      </p>

                      <button
                        type="button"
                        onClick={
                          handleStartEdit
                        }
                        className="
                          mt-3
                          rounded-lg
                          bg-purple-700
                          px-5
                          py-2
                          text-sm
                          font-semibold
                          text-white
                          transition
                          hover:bg-purple-800
                        "
                      >
                        แก้ไขรีวิว
                      </button>
                    </div>
                  ) : !canReview &&
                    !isEditing ? (
                    // =================================================
                    // CANNOT REVIEW
                    // =================================================

                    <div
                      className="
                        rounded-xl
                        border
                        border-amber-200
                        bg-amber-50
                        p-4
                        text-center
                      "
                    >
                      <Clock3
                        size={28}
                        className="
                          mx-auto
                          text-amber-600
                        "
                      />

                      <h3
                        className="
                          mt-1
                          text-sm
                          font-semibold
                          text-amber-800
                        "
                      >
                        ยังไม่สามารถส่งรีวิวได้
                      </h3>

                      <p
                        className="
                          mt-1
                          text-xs
                          text-amber-700
                        "
                      >
                        สามารถรีวิวได้หลังจากการจองและรอบนำเที่ยวมีสถานะ
                        COMPLETED แล้วเท่านั้น
                      </p>
                    </div>
                  ) : (
                    // =================================================
                    // REVIEW FORM
                    // =================================================

                    <form
                      onSubmit={
                        handleSubmit
                      }
                    >
                      {/* Edit Mode */}

                      {isEditing && (
                        <div
                          className="
                            mb-3
                            rounded-xl
                            border
                            border-purple-200
                            bg-purple-50
                            p-3
                          "
                        >
                          <h3
                            className="
                              text-xs
                              font-semibold
                              text-purple-800
                            "
                          >
                            กำลังแก้ไขรีวิวของคุณ
                          </h3>

                          <p
                            className="
                              mt-1
                              text-[11px]
                              text-purple-700
                            "
                          >
                            คะแนนและความคิดเห็นเดิมถูกนำมาแสดงให้แล้ว
                          </p>
                        </div>
                      )}

                      {/* =================================================
                          3 RATING CARDS
                      ================================================= */}

                      <div
                        className="
                          grid
                          min-w-0
                          grid-cols-1
                          gap-2.5
                          md:grid-cols-3
                        "
                      >
                        <div
                          className="
                            min-w-0
                            overflow-hidden
                            rounded-xl
                            border
                            border-gray-200
                            bg-white
                            p-3
                          "
                        >
                          <CompactStarRating
                            label="ความประทับใจโดยรวม"
                            value={
                              overallRating
                            }
                            onChange={(
                              value,
                            ) => {
                              setOverallRating(
                                value,
                              )

                              clearMessage()
                            }}
                            disabled={
                              isSubmitting
                            }
                          />
                        </div>

                        <div
                          className="
                            min-w-0
                            overflow-hidden
                            rounded-xl
                            border
                            border-gray-200
                            bg-white
                            p-3
                          "
                        >
                          <CompactStarRating
                            label="การให้บริการของไกด์"
                            value={
                              guideRating
                            }
                            onChange={(
                              value,
                            ) => {
                              setGuideRating(
                                value,
                              )

                              clearMessage()
                            }}
                            disabled={
                              isSubmitting
                            }
                          />
                        </div>

                        <div
                          className="
                            min-w-0
                            overflow-hidden
                            rounded-xl
                            border
                            border-gray-200
                            bg-white
                            p-3
                          "
                        >
                          <CompactStarRating
                            label="เส้นทางและสถานที่"
                            value={
                              routeRating
                            }
                            onChange={(
                              value,
                            ) => {
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
                      </div>

                      {/* =================================================
                          COMMENT + SUBMIT
                      ================================================= */}

                      <div className="mt-3">
                        <div
                          className="
                            mb-1
                            flex
                            items-center
                            justify-between
                            gap-3
                          "
                        >
                          <label
                            htmlFor="review-comment"
                            className="
                              text-xs
                              font-semibold
                              text-gray-900
                            "
                          >
                            ความคิดเห็นเพิ่มเติม
                          </label>

                          <span
                            className="
                              text-[10px]
                              text-gray-500
                            "
                          >
                            {
                              comment.length
                            }
                            /500
                          </span>
                        </div>

                        <div
                          className="
                            grid
                            grid-cols-1
                            gap-2
                            md:grid-cols-[minmax(0,1fr)_130px]
                            md:items-stretch
                          "
                        >
                          <textarea
                            id="review-comment"
                            value={
                              comment
                            }
                            disabled={
                              isSubmitting
                            }
                            onChange={(
                              event,
                            ) => {
                              setComment(
                                event.target
                                  .value,
                              )

                              clearMessage()
                            }}
                            rows={2}
                            maxLength={500}
                            placeholder="แชร์ประสบการณ์ของคุณ..."
                            className="
                              block
                              h-[68px]
                              min-w-0
                              w-full
                              resize-none
                              rounded-xl
                              border
                              border-gray-300
                              bg-white
                              px-3
                              py-2.5
                              text-xs
                              text-gray-700
                              outline-none
                              transition
                              focus:border-purple-600
                              focus:ring-2
                              focus:ring-purple-100
                              disabled:cursor-not-allowed
                              disabled:bg-gray-100
                            "
                          />

                          <button
                            type="submit"
                            disabled={
                              isSubmitting
                            }
                            className="
                              h-[68px]
                              w-full
                              rounded-xl
                              bg-purple-700
                              px-4
                              text-sm
                              font-semibold
                              text-white
                              shadow-sm
                              transition
                              hover:bg-purple-800
                              disabled:cursor-not-allowed
                              disabled:bg-purple-300
                            "
                          >
                            {isSubmitting
                              ? isEditing
                                ? 'กำลังบันทึก...'
                                : 'กำลังส่ง...'
                              : isEditing
                                ? 'บันทึกการแก้ไข'
                                : 'ส่งรีวิว'}
                          </button>
                        </div>

                        {isEditing && (
                          <button
                            type="button"
                            onClick={
                              handleCancelEdit
                            }
                            disabled={
                              isSubmitting
                            }
                            className="
                              mt-2
                              rounded-lg
                              border
                              border-gray-300
                              bg-white
                              px-5
                              py-2
                              text-xs
                              font-semibold
                              text-gray-700
                              transition
                              hover:bg-gray-50
                              disabled:cursor-not-allowed
                              disabled:opacity-50
                            "
                          >
                            ยกเลิกการแก้ไข
                          </button>
                        )}
                      </div>
                    </form>
                  )
                )}
            </section>

            {/* ==================================================
                RIGHT SIDE
            ================================================== */}

            <section
              className="
                min-w-0
                border-t
                border-gray-200
                bg-gray-50/95
                p-4
                lg:border-l
                lg:border-t-0
                lg:p-5
              "
            >
              <div
                className="
                  mb-3
                  flex
                  items-center
                  justify-between
                  gap-3
                "
              >
                <h2
                  className="
                    text-lg
                    font-bold
                    text-gray-900
                  "
                >
                  {bookingId
                    ? 'รีวิวของการจองนี้'
                    : 'รีวิวล่าสุด'}
                </h2>

                <span
                  className="
                    shrink-0
                    rounded-full
                    bg-purple-100
                    px-3
                    py-1
                    text-xs
                    font-medium
                    text-purple-700
                  "
                >
                  {
                    reviews.length
                  }{' '}
                  รีวิว
                </span>
              </div>

              {/* Loading */}

              {isLoading ? (
                <div
                  className="
                    rounded-xl
                    bg-white
                    p-6
                    text-center
                    text-sm
                    text-gray-500
                  "
                >
                  กำลังโหลดรีวิว...
                </div>
              ) : reviews.length ===
                0 ? (
                // =================================================
                // EMPTY STATE
                // =================================================

                <div
                  className="
                    flex
                    min-h-[220px]
                    flex-col
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-dashed
                    border-gray-300
                    bg-white
                    px-6
                    py-8
                    text-center
                  "
                >
                  <div className="mb-2 text-4xl">
                    💬
                  </div>

                  <h3
                    className="
                      font-semibold
                      text-gray-800
                    "
                  >
                    ยังไม่มีรีวิว
                  </h3>

                  <p
                    className="
                      mt-1
                      text-sm
                      text-gray-500
                    "
                  >
                    เมื่อมีผู้ใช้ส่งรีวิว
                    รายการจะแสดงที่นี่
                  </p>
                </div>
              ) : (
                // =================================================
                // REVIEW LIST
                // =================================================

                <div className="space-y-3">
                  {reviews.map(
                    (review) => {
                      const reviewerName =
                        review.reviewer_name ||
                        'ผู้ใช้งาน'

                      return (
                        <article
                          key={
                            review.id
                          }
                          className="
                            rounded-xl
                            border
                            border-gray-200
                            bg-white
                            p-4
                            shadow-sm
                          "
                        >
                          <div
                            className="
                              flex
                              items-start
                              justify-between
                              gap-3
                            "
                          >
                            <div
                              className="
                                flex
                                min-w-0
                                gap-3
                              "
                            >
                              <div
                                className="
                                  flex
                                  h-9
                                  w-9
                                  shrink-0
                                  items-center
                                  justify-center
                                  rounded-full
                                  bg-purple-100
                                  font-bold
                                  text-purple-700
                                "
                              >
                                {reviewerName
                                  .charAt(
                                    0,
                                  )
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <h3
                                  className="
                                    truncate
                                    font-bold
                                    text-gray-900
                                  "
                                >
                                  {
                                    reviewerName
                                  }
                                </h3>

                                <p
                                  className="
                                    mt-0.5
                                    text-xs
                                    text-gray-500
                                  "
                                >
                                  {formatReviewDate(
                                    review.created_at,
                                  )}
                                </p>
                              </div>
                            </div>

                            <div
                              className="
                                flex
                                shrink-0
                                items-center
                                gap-1
                                font-bold
                                text-amber-500
                              "
                            >
                              <Star
                                size={18}
                                className="
                                  fill-amber-400
                                  text-amber-400
                                "
                              />

                              {
                                review.overall_rating
                              }
                            </div>
                          </div>

                          {/* Guide / Route */}

                          <div
                            className="
                              mt-3
                              flex
                              flex-wrap
                              gap-2
                              text-xs
                            "
                          >
                            <span
                              className="
                                rounded-full
                                bg-blue-50
                                px-2.5
                                py-1
                                text-blue-700
                              "
                            >
                              ไกด์{' '}
                              {
                                review.guide_rating
                              }
                              /5
                            </span>

                            <span
                              className="
                                rounded-full
                                bg-green-50
                                px-2.5
                                py-1
                                text-green-700
                              "
                            >
                              เส้นทาง{' '}
                              {
                                review.route_rating
                              }
                              /5
                            </span>
                          </div>

                          {/* Comment */}

                          <p
                            className="
                              mt-3
                              break-words
                              text-sm
                              leading-relaxed
                              text-gray-700
                            "
                          >
                            {
                              review.comment
                            }
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
    </div>
  )
}

export default Review