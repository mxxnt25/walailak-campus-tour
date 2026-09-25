import { supabase } from '../lib/supabase'
import { clearMyBookingsCache } from './bookingService'

function success(data = null) {
  return {
    success: true,
    data,
    error: null,
  }
}

function failure(error) {
  const rawMessage =
    error?.message ||
    'เกิดข้อผิดพลาด'

  let message = rawMessage

  if (rawMessage.includes('INVALID_FULL_NAME')) {
    message =
      'กรุณากรอกชื่อ-นามสกุลให้ถูกต้อง'
  } else if (
    rawMessage.includes('INVALID_MEMBER_TYPE')
  ) {
    message =
      'ประเภทสมาชิกไม่ถูกต้อง'
  } else if (
    rawMessage.includes('INVALID_INSTITUTIONAL_ID')
  ) {
    message =
      'รหัสนักศึกษาหรือรหัสบุคลากรต้องเป็นตัวเลข 8 หลัก'
  } else if (
    rawMessage
      .toLowerCase()
      .includes('user already registered')
  ) {
    message =
      'อีเมลนี้ถูกสมัครใช้งานแล้ว'
  } else if (
    rawMessage
      .toLowerCase()
      .includes('invalid login credentials')
  ) {
    message =
      'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
  }

  return {
    success: false,
    data: null,
    error: {
      code:
        error?.code ||
        'UNKNOWN_ERROR',
      message,
    },
  }
}

export async function signUp({
  email,
  password,
  fullName,
  memberType,
  institutionalId,
}) {
  const normalizedFullName =
    fullName?.trim() || ''

  const normalizedEmail =
    email?.trim() || ''

  const normalizedInstitutionalId =
    memberType === 'EXTERNAL'
      ? null
      : institutionalId?.trim() || null

  const { data, error } =
    await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name:
            normalizedFullName,
          member_type:
            memberType,
          institutional_id:
            normalizedInstitutionalId,
        },
      },
    })

  if (error) {
    return failure(error)
  }

  // บาง configuration ของ Supabase อาจสร้าง session
  // ให้ทันทีหลังสมัคร ถ้ามี session ให้ sign out เพื่อไม่ให้
  // ผู้ใช้ถูกมองว่าเข้าสู่ระบบแล้วก่อนขั้นตอนยืนยันอีเมล
  if (data?.session) {
    const { error: signOutError } =
      await supabase.auth.signOut()

    if (signOutError) {
      return failure(signOutError)
    }
  }

  return success(data)
}

export async function signIn({
  email,
  password,
}) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email:
        email?.trim() || '',
      password,
    })

  if (error) {
    return failure(error)
  }

  return success(data)
}

export async function signOut() {
  const { error } =
    await supabase.auth.signOut()

  if (error) {
    return failure(error)
  }

  clearMyBookingsCache()
  return success()
}

export async function changePassword(
  newPassword,
) {
  const { data, error } =
    await supabase.auth.updateUser({
      password: newPassword,
    })

  if (error) {
    return failure(error)
  }

  return success(data)
}