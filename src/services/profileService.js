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

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    return failure(error)
  }

  return success(data)
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    return failure(error)
  }

  return success(data)
}

export async function listAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return failure(error)
  }

  return success(data)
}

export async function updateUserRole(userId, role) {
  const { data, error } = await supabase.rpc(
    'change_user_role',
    {
      p_user_id: userId,
      p_new_role: role,
    }
  )

  if (error) {
    return failure(error)
  }

  return success(data)
}

export async function deleteUserProfile(userId) {
  const { data, error } = await supabase.functions.invoke(
    'delete-user',
    {
      body: { userId },
    }
  )

  if (error) {
    return failure(error)
  }

  if (!data?.success) {
    return failure({
      code: 'DELETE_USER_FAILED',
      message:
        data?.error || 'ไม่สามารถจัดการผู้ใช้ได้',
    })
  }

  return success(data)
}

export async function uploadAvatar(userId, file) {
  const fileExt = file.name.split('.').pop()
  const filePath = `${userId}/avatar.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      upsert: true,
    })

  if (uploadError) {
    return failure(uploadError)
  }

  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)

  return success(
    `${data.publicUrl}?t=${Date.now()}`
  )
}