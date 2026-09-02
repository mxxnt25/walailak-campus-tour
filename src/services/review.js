import { supabase } from '../lib/supabase'

function getReviewerName(user) {
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'ผู้ใช้งาน'
  )
}

function translateReviewError(
  error,
  fallbackMessage = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
) {
  if (!error) {
    return fallbackMessage
  }

  const errorMessage = String(
    error.message || '',
  ).toLowerCase()

  if (
    error.code === '42703' ||
    errorMessage.includes('does not exist') ||
    errorMessage.includes('reviewer_name')
  ) {
    return 'โครงสร้างฐานข้อมูลรีวิวยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ'
  }

  if (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    errorMessage.includes('could not find the table') ||
    errorMessage.includes('relation') &&
      errorMessage.includes('does not exist')
  ) {
    return 'ยังไม่พบตารางรีวิวในฐานข้อมูล กรุณาติดต่อผู้ดูแลระบบ'
  }

  if (
    error.code === '42501' ||
    errorMessage.includes('row-level security') ||
    errorMessage.includes('permission denied')
  ) {
    return 'คุณไม่มีสิทธิ์ดำเนินการนี้'
  }

  if (
    error.code === '23505' ||
    errorMessage.includes('duplicate key')
  ) {
    return 'คุณรีวิวการจองนี้ไปแล้ว'
  }

  if (
    errorMessage.includes('auth session missing') ||
    errorMessage.includes('not authenticated')
  ) {
    return 'กรุณาเข้าสู่ระบบก่อนดำเนินการ'
  }

  if (
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('network')
  ) {
    return 'ไม่สามารถเชื่อมต่อระบบได้ กรุณาตรวจสอบอินเทอร์เน็ต'
  }

  return fallbackMessage
}

async function getCurrentUser({
  required = false,
  errorMessage = 'กรุณาเข้าสู่ระบบก่อนดำเนินการ',
} = {}) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    throw new Error(
      translateReviewError(
        error,
        'ไม่สามารถตรวจสอบการเข้าสู่ระบบได้',
      ),
    )
  }

  const user = session?.user || null

  if (required && !user) {
    throw new Error(errorMessage)
  }

  return user
}

export async function getReviews(bookingId) {
  let query = supabase
    .from('reviews')
    .select(`
      id,
      booking_id,
      user_id,
      reviewer_name,
      overall_rating,
      guide_rating,
      route_rating,
      comment,
      created_at,
      updated_at
    `)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })

  if (bookingId) {
    query = query.eq('booking_id', bookingId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(
      translateReviewError(
        error,
        'ไม่สามารถโหลดรายการรีวิวได้',
      ),
    )
  }

  return data || []
}

export async function getMyReviewByBookingId(bookingId) {
  const user = await getCurrentUser({
    required: false,
  })

  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    throw new Error(
      translateReviewError(
        error,
        'ไม่สามารถตรวจสอบรีวิวของคุณได้',
      ),
    )
  }

  return data
}

export async function createReview({
  bookingId,
  overallRating,
  guideRating,
  routeRating,
  comment,
}) {
  const user = await getCurrentUser({
    required: true,
    errorMessage: 'กรุณาเข้าสู่ระบบก่อนส่งรีวิว',
  })

  const reviewData = {
    booking_id: bookingId,
    user_id: user.id,
    reviewer_name: getReviewerName(user),
    overall_rating: overallRating,
    guide_rating: guideRating,
    route_rating: routeRating,
    comment: comment.trim(),
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert(reviewData)
    .select()
    .single()

  if (error) {
    throw new Error(
      translateReviewError(
        error,
        'ไม่สามารถส่งรีวิวได้ กรุณาลองใหม่อีกครั้ง',
      ),
    )
  }

  return data
}

export async function updateReview(
  reviewId,
  {
    overallRating,
    guideRating,
    routeRating,
    comment,
  },
) {
  const user = await getCurrentUser({
    required: true,
    errorMessage: 'กรุณาเข้าสู่ระบบก่อนแก้ไขรีวิว',
  })

  const updateData = {
    overall_rating: overallRating,
    guide_rating: guideRating,
    route_rating: routeRating,
    comment: comment.trim(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('reviews')
    .update(updateData)
    .eq('id', reviewId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    throw new Error(
      translateReviewError(
        error,
        'ไม่สามารถแก้ไขรีวิวได้',
      ),
    )
  }

  return data
}

export async function deleteReview(reviewId) {
  const user = await getCurrentUser({
    required: true,
    errorMessage: 'กรุณาเข้าสู่ระบบก่อนลบรีวิว',
  })

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(
      translateReviewError(
        error,
        'ไม่สามารถลบรีวิวได้',
      ),
    )
  }

  return true
}