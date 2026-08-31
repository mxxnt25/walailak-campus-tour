import { supabase } from '../lib/supabase'

function getReviewerName(user) {
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'ผู้ใช้งาน'
  )
}

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw error
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
    throw error
  }

  return data || []
}

export async function getMyReviewByBookingId(bookingId) {
  const user = await getCurrentUser()

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
    throw error
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
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('กรุณาเข้าสู่ระบบก่อนส่งรีวิว')
  }

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
    if (error.code === '23505') {
      throw new Error('คุณรีวิวการจองนี้ไปแล้ว')
    }

    throw error
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
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('กรุณาเข้าสู่ระบบก่อนแก้ไขรีวิว')
  }

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
    throw error
  }

  return data
}

export async function deleteReview(reviewId) {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('กรุณาเข้าสู่ระบบก่อนลบรีวิว')
  }

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)
    .eq('user_id', user.id)

  if (error) {
    throw error
  }

  return true
}