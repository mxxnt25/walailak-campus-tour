import { supabase } from '../lib/supabase'
import { buildRouteReviewSummaries } from '../utils/reviewSummary'

const ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  DATABASE_ERROR: 'DATABASE_ERROR',
}

function success(data = null) {
  return {
    success: true,
    data,
    error: null,
  }
}

function failure(code, message, originalError = null) {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
      originalCode: originalError?.code || null,
    },
  }
}

function normalizeReviewError(
  error,
  fallbackMessage = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
) {
  if (!error) {
    return {
      code: ERROR_CODES.DATABASE_ERROR,
      message: fallbackMessage,
    }
  }

  const errorCode = String(error.code || '').toUpperCase()
  const originalMessage = String(error.message || '')
  const errorMessage = originalMessage.toLowerCase()
  const normalizedMessage = originalMessage
    .trim()
    .toUpperCase()

  // ==========================================================
  // Stable project error vocabulary from M6 v1.2 database
  // ==========================================================

  if (
    normalizedMessage.includes('AUTH_REQUIRED') ||
    errorMessage.includes('auth session missing') ||
    errorMessage.includes('not authenticated')
  ) {
    return {
      code: ERROR_CODES.AUTH_REQUIRED,
      message: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ',
    }
  }

  if (
    normalizedMessage.includes('FORBIDDEN') ||
    errorCode === '42501' ||
    errorMessage.includes('row-level security') ||
    errorMessage.includes('permission denied')
  ) {
    return {
      code: ERROR_CODES.FORBIDDEN,
      message: 'คุณไม่มีสิทธิ์ดำเนินการนี้',
    }
  }

  if (
    normalizedMessage.includes('NOT_FOUND') ||
    errorCode === 'PGRST116'
  ) {
    return {
      code: ERROR_CODES.NOT_FOUND,
      message: 'ไม่พบข้อมูลที่ต้องการ',
    }
  }

  if (
    normalizedMessage.includes('ALREADY_EXISTS') ||
    errorCode === '23505' ||
    errorMessage.includes('duplicate key')
  ) {
    return {
      code: ERROR_CODES.ALREADY_EXISTS,
      message: 'การจองนี้มีรีวิวแล้ว',
    }
  }

  if (
    normalizedMessage.includes('VALIDATION_ERROR') ||
    errorCode === '23514' ||
    errorCode === '23502' ||
    errorCode === '22P02'
  ) {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง',
    }
  }

  if (
    errorCode === '42P01' ||
    errorCode === '42703' ||
    errorCode === 'PGRST205' ||
    errorMessage.includes('could not find the table') ||
    (
      errorMessage.includes('relation') &&
      errorMessage.includes('does not exist')
    ) ||
    (
      errorMessage.includes('column') &&
      errorMessage.includes('does not exist')
    )
  ) {
    return {
      code: ERROR_CODES.DATABASE_ERROR,
      message:
        'โครงสร้างฐานข้อมูลรีวิวยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ',
    }
  }

  if (
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('network')
  ) {
    return {
      code: ERROR_CODES.DATABASE_ERROR,
      message:
        'ไม่สามารถเชื่อมต่อระบบได้ กรุณาตรวจสอบอินเทอร์เน็ต',
    }
  }

  return {
    code: ERROR_CODES.DATABASE_ERROR,
    message: fallbackMessage,
  }
}

function failureFromError(error, fallbackMessage) {
  const normalized = normalizeReviewError(
    error,
    fallbackMessage,
  )

  return failure(
    normalized.code,
    normalized.message,
    error,
  )
}

function validateRating(value) {
  const rating = Number(value)

  return (
    Number.isInteger(rating) &&
    rating >= 1 &&
    rating <= 5
  )
}

async function getCurrentUser({
  required = false,
  errorMessage = 'กรุณาเข้าสู่ระบบก่อนดำเนินการ',
} = {}) {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      return failureFromError(
        error,
        'ไม่สามารถตรวจสอบการเข้าสู่ระบบได้',
      )
    }

    const user = session?.user || null

    if (required && !user) {
      return failure(
        ERROR_CODES.AUTH_REQUIRED,
        errorMessage,
      )
    }

    return success(user)
  } catch (error) {
    return failureFromError(
      error,
      'ไม่สามารถตรวจสอบการเข้าสู่ระบบได้',
    )
  }
}

// ============================================================
// PUBLIC REVIEW LIST
// ============================================================

export async function getReviews(bookingId = null, routeId = null, limit = null) {
  try {
    let query = supabase
      .from('reviews')
      .select(`
        id,
        booking_id,
        user_id,
        route_id,
        reviewer_name,
        overall_rating,
        guide_rating,
        route_rating,
        comment,
        created_at,
        updated_at
      `)
      .eq('is_hidden', false)
      .order('created_at', {
        ascending: false,
      })

    if (bookingId) {
      query = query.eq('booking_id', bookingId)
    }
    if (routeId) {
      query = query.eq('route_id', routeId)
    }
    if (Number.isInteger(limit) && limit > 0) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      return failureFromError(
        error,
        'ไม่สามารถโหลดรายการรีวิวได้',
      )
    }

    return success(data || [])
  } catch (error) {
    return failureFromError(
      error,
      'ไม่สามารถโหลดรายการรีวิวได้',
    )
  }
}

// Public summaries use ONLY visible reviews and route/rating columns.
// Page through the results so an active route is not silently capped at
// Supabase's default row limit once the site has many reviews.
export async function getRouteReviewSummaries(routeIds = []) {
  if (!Array.isArray(routeIds) || routeIds.length === 0) return success({})
  const rows = []
  const pageSize = 500
  try {
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from('reviews')
        .select('route_id, overall_rating')
        .eq('is_hidden', false)
        .in('route_id', routeIds)
        .order('id', { ascending: true })
        .range(offset, offset + pageSize - 1)
      if (error) return failureFromError(error, 'ไม่สามารถโหลดคะแนนรีวิวได้')
      rows.push(...(data || []))
      if (!data || data.length < pageSize) break
    }
    return success(buildRouteReviewSummaries(rows))
  } catch (error) {
    return failureFromError(error, 'ไม่สามารถโหลดคะแนนรีวิวได้')
  }
}

// ============================================================
// REVIEW BY CURRENT USER + BOOKING
// ============================================================

export async function getMyReviewByBookingId(
  bookingId,
) {
  if (!bookingId) {
    return failure(
      ERROR_CODES.VALIDATION_ERROR,
      'ไม่พบรหัสการจอง',
    )
  }

  const userResult = await getCurrentUser({
    required: false,
  })

  if (!userResult.success) {
    return userResult
  }

  const user = userResult.data

  // Public review page may call this without login.
  if (!user) {
    return success(null)
  }

  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        booking_id,
        user_id,
        route_id,
        guide_id,
        reviewer_name,
        overall_rating,
        guide_rating,
        route_rating,
        comment,
        is_hidden,
        created_at,
        updated_at
      `)
      .eq('booking_id', bookingId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      return failureFromError(
        error,
        'ไม่สามารถตรวจสอบรีวิวของคุณได้',
      )
    }

    return success(data || null)
  } catch (error) {
    return failureFromError(
      error,
      'ไม่สามารถตรวจสอบรีวิวของคุณได้',
    )
  }
}

// ============================================================
// CREATE REVIEW
// ============================================================

export async function createReview({
  bookingId,
  overallRating,
  guideRating,
  routeRating,
  comment,
}) {
  if (!bookingId) {
    return failure(
      ERROR_CODES.VALIDATION_ERROR,
      'ไม่พบรหัสการจอง',
    )
  }

  if (
    !validateRating(overallRating) ||
    !validateRating(guideRating) ||
    !validateRating(routeRating)
  ) {
    return failure(
      ERROR_CODES.VALIDATION_ERROR,
      'กรุณาให้คะแนนครบทั้ง 3 หมวด ตั้งแต่ 1 ถึง 5 ดาว',
    )
  }

  const normalizedComment = String(
    comment || '',
  ).trim()

  if (
    normalizedComment.length < 1 ||
    normalizedComment.length > 500
  ) {
    return failure(
      ERROR_CODES.VALIDATION_ERROR,
      'ความคิดเห็นต้องมีความยาว 1 ถึง 500 ตัวอักษร',
    )
  }

  const userResult = await getCurrentUser({
    required: true,
    errorMessage:
      'กรุณาเข้าสู่ระบบก่อนส่งรีวิว',
  })

  if (!userResult.success) {
    return userResult
  }

  try {
    /*
     * IMPORTANT:
     * Do not send:
     * - user_id
     * - reviewer_name
     * - route_id
     * - guide_id
     * - is_hidden
     *
     * 0015 prepare_review() derives these values
     * authoritatively from auth + completed booking data.
     */
    const reviewData = {
      booking_id: bookingId,
      overall_rating: Number(overallRating),
      guide_rating: Number(guideRating),
      route_rating: Number(routeRating),
      comment: normalizedComment,
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert(reviewData)
      .select(`
        id,
        booking_id,
        user_id,
        route_id,
        guide_id,
        reviewer_name,
        overall_rating,
        guide_rating,
        route_rating,
        comment,
        is_hidden,
        created_at,
        updated_at
      `)
      .single()

    if (error) {
      return failureFromError(
        error,
        'ไม่สามารถส่งรีวิวได้ กรุณาลองใหม่อีกครั้ง',
      )
    }

    return success(data)
  } catch (error) {
    return failureFromError(
      error,
      'ไม่สามารถส่งรีวิวได้ กรุณาลองใหม่อีกครั้ง',
    )
  }
}

// ============================================================
// UPDATE OWN REVIEW
// ============================================================

export async function updateReview(
  reviewId,
  {
    overallRating,
    guideRating,
    routeRating,
    comment,
  },
) {
  if (!reviewId) {
    return failure(
      ERROR_CODES.VALIDATION_ERROR,
      'ไม่พบรหัสรีวิว',
    )
  }

  if (
    !validateRating(overallRating) ||
    !validateRating(guideRating) ||
    !validateRating(routeRating)
  ) {
    return failure(
      ERROR_CODES.VALIDATION_ERROR,
      'กรุณาให้คะแนนครบทั้ง 3 หมวด ตั้งแต่ 1 ถึง 5 ดาว',
    )
  }

  const normalizedComment = String(
    comment || '',
  ).trim()

  if (
    normalizedComment.length < 1 ||
    normalizedComment.length > 500
  ) {
    return failure(
      ERROR_CODES.VALIDATION_ERROR,
      'ความคิดเห็นต้องมีความยาว 1 ถึง 500 ตัวอักษร',
    )
  }

  const userResult = await getCurrentUser({
    required: true,
    errorMessage:
      'กรุณาเข้าสู่ระบบก่อนแก้ไขรีวิว',
  })

  if (!userResult.success) {
    return userResult
  }

  try {
    // Identity/reference fields are intentionally excluded.
    const updateData = {
      overall_rating: Number(overallRating),
      guide_rating: Number(guideRating),
      route_rating: Number(routeRating),
      comment: normalizedComment,
    }

    const { data, error } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', reviewId)
      .eq('user_id', userResult.data.id)
      .select(`
        id,
        booking_id,
        user_id,
        route_id,
        guide_id,
        reviewer_name,
        overall_rating,
        guide_rating,
        route_rating,
        comment,
        is_hidden,
        created_at,
        updated_at
      `)
      .maybeSingle()

    if (error) {
      return failureFromError(
        error,
        'ไม่สามารถแก้ไขรีวิวได้',
      )
    }

    if (!data) {
      return failure(
        ERROR_CODES.NOT_FOUND,
        'ไม่พบรีวิวที่สามารถแก้ไขได้',
      )
    }

    return success(data)
  } catch (error) {
    return failureFromError(
      error,
      'ไม่สามารถแก้ไขรีวิวได้',
    )
  }
}

// ============================================================
// DELETE OWN REVIEW
// ============================================================

export async function deleteReview(reviewId) {
  if (!reviewId) {
    return failure(
      ERROR_CODES.VALIDATION_ERROR,
      'ไม่พบรหัสรีวิว',
    )
  }

  const userResult = await getCurrentUser({
    required: true,
    errorMessage:
      'กรุณาเข้าสู่ระบบก่อนลบรีวิว',
  })

  if (!userResult.success) {
    return userResult
  }

  try {
    const { data, error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', userResult.data.id)
      .select('id')
      .maybeSingle()

    if (error) {
      return failureFromError(
        error,
        'ไม่สามารถลบรีวิวได้',
      )
    }

    if (!data) {
      return failure(
        ERROR_CODES.NOT_FOUND,
        'ไม่พบรีวิวที่สามารถลบได้',
      )
    }

    return success({
      id: data.id,
      deleted: true,
    })
  } catch (error) {
    return failureFromError(
      error,
      'ไม่สามารถลบรีวิวได้',
    )
  }
}

// ============================================================
// M6 - ADMIN REVIEW MANAGEMENT
// ============================================================

export async function getAdminReviews() {
  const userResult = await getCurrentUser({
    required: true,
    errorMessage:
      'กรุณาเข้าสู่ระบบก่อนดูรายการรีวิว',
  })

  if (!userResult.success) {
    return userResult
  }

  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        booking_id,
        user_id,
        route_id,
        guide_id,
        reviewer_name,
        overall_rating,
        guide_rating,
        route_rating,
        comment,
        is_hidden,
        created_at,
        updated_at
      `)
      .order('created_at', {
        ascending: false,
      })

    if (error) {
      return failureFromError(
        error,
        'ไม่สามารถโหลดรายการรีวิวสำหรับผู้ดูแลระบบได้',
      )
    }

    return success(data || [])
  } catch (error) {
    return failureFromError(
      error,
      'ไม่สามารถโหลดรายการรีวิวสำหรับผู้ดูแลระบบได้',
    )
  }
}

// ============================================================
// ADMIN - HIDE / RESTORE
// ============================================================

export async function setReviewVisibility(
  reviewId,
  isHidden,
) {
  if (!reviewId) {
    return failure(
      ERROR_CODES.VALIDATION_ERROR,
      'ไม่พบรหัสรีวิว',
    )
  }

  if (typeof isHidden !== 'boolean') {
    return failure(
      ERROR_CODES.VALIDATION_ERROR,
      'สถานะการแสดงรีวิวไม่ถูกต้อง',
    )
  }

  const userResult = await getCurrentUser({
    required: true,
    errorMessage:
      'กรุณาเข้าสู่ระบบก่อนจัดการรีวิว',
  })

  if (!userResult.success) {
    return userResult
  }

  try {
    const { data, error } = await supabase
      .from('reviews')
      .update({
        is_hidden: isHidden,
      })
      .eq('id', reviewId)
      .select(`
        id,
        booking_id,
        user_id,
        route_id,
        guide_id,
        reviewer_name,
        overall_rating,
        guide_rating,
        route_rating,
        comment,
        is_hidden,
        created_at,
        updated_at
      `)
      .maybeSingle()

    if (error) {
      return failureFromError(
        error,
        'ไม่สามารถเปลี่ยนสถานะการแสดงรีวิวได้',
      )
    }

    if (!data) {
      return failure(
        ERROR_CODES.NOT_FOUND,
        'ไม่พบรีวิวที่ต้องการจัดการ',
      )
    }

    return success(data)
  } catch (error) {
    return failureFromError(
      error,
      'ไม่สามารถเปลี่ยนสถานะการแสดงรีวิวได้',
    )
  }
}

// ============================================================
// ADMIN - DELETE REVIEW
// ============================================================

export async function deleteReviewAsAdmin(
  reviewId,
) {
  if (!reviewId) {
    return failure(
      ERROR_CODES.VALIDATION_ERROR,
      'ไม่พบรหัสรีวิว',
    )
  }

  const userResult = await getCurrentUser({
    required: true,
    errorMessage:
      'กรุณาเข้าสู่ระบบก่อนลบรีวิว',
  })

  if (!userResult.success) {
    return userResult
  }

  try {
    const { data, error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .select('id')
      .maybeSingle()

    if (error) {
      return failureFromError(
        error,
        'ไม่สามารถลบรีวิวได้',
      )
    }

    if (!data) {
      return failure(
        ERROR_CODES.NOT_FOUND,
        'ไม่พบรีวิวที่ต้องการลบ',
      )
    }

    return success({
      id: data.id,
      deleted: true,
    })
  } catch (error) {
    return failureFromError(
      error,
      'ไม่สามารถลบรีวิวได้',
    )
  }
}