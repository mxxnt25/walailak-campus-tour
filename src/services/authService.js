import { supabase } from '../lib/supabase'

function success(data = null) {
  return {
    success: true,
    data,
    error: null,
  }
}

function failure(error) {
  return {
    success: false,
    data: null,
    error: {
      code: error?.code || 'UNKNOWN_ERROR',
      message: error?.message || 'เกิดข้อผิดพลาด',
    },
  }
}

export async function signUp({
  email,
  password,
  fullName,
  memberType,
}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        member_type: memberType,
      },
    },
  })

  if (error) {
    return failure(error)
  }

  return success(data)
}

export async function signIn({ email, password }) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    })

  if (error) {
    return failure(error)
  }

  return success(data)
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    return failure(error)
  }

  return success()
}

export async function changePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    return failure(error)
  }

  return success(data)
}