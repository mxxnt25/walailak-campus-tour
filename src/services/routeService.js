import { supabase } from '../lib/supabase'

function success(data) {
  return {
    success: true,
    data,
    error: null,
  }
}

function failure(error, fallbackCode = 'DATABASE_ERROR') {
  return {
    success: false,
    data: null,
    error: {
      code: error?.code || fallbackCode,
      message: error?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล',
    },
  }
}

export async function listActiveRoutes() {
  const { data, error } = await supabase
    .from('routes')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('name', { ascending: true })

  if (error) {
    return failure(error)
  }

  return success(data)
}

export async function getRouteDetail(routeId) {
  if (!routeId) {
    return failure(
      { message: 'ไม่พบรหัสเส้นทาง' },
      'VALIDATION_ERROR',
    )
  }

  const { data, error } = await supabase
    .from('routes')
    .select('*')
    .eq('id', routeId)
    .single()

  if (error) {
    return failure(error)
  }

  return success(data)
}

export async function listRouteStops(routeId) {
  if (!routeId) {
    return failure(
      { message: 'ไม่พบรหัสเส้นทาง' },
      'VALIDATION_ERROR',
    )
  }

  const { data, error } = await supabase
    .from('route_stops')
    .select('*')
    .eq('route_id', routeId)
    .order('stop_order', { ascending: true })

  if (error) {
    return failure(error)
  }

  return success(data)
}