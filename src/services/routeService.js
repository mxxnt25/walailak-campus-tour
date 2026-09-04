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

function validateDuration(value) {
  if (value === undefined || value === null || value === '') {
    return {
      valid: true,
      value: null,
    }
  }

  const duration = Number(value)

  if (!Number.isInteger(duration) || duration <= 0) {
    return {
      valid: false,
      value: null,
    }
  }

  return {
    valid: true,
    value: duration,
  }
}

function isValidStatus(status) {
  return status === 'ACTIVE' || status === 'INACTIVE'
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

export async function listAllRoutes() {
  const { data, error } = await supabase
    .from('routes')
    .select('*')
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

export async function createRoute(payload) {
  if (!payload || typeof payload !== 'object') {
    return failure(
      { message: 'ข้อมูลเส้นทางไม่ถูกต้อง' },
      'VALIDATION_ERROR',
    )
  }

  if (!payload.name?.trim()) {
    return failure(
      { message: 'กรุณากรอกชื่อเส้นทาง' },
      'VALIDATION_ERROR',
    )
  }

  const duration = validateDuration(payload.duration_minutes)

  if (!duration.valid) {
    return failure(
      { message: 'ระยะเวลาต้องเป็นจำนวนเต็มมากกว่า 0 นาที' },
      'VALIDATION_ERROR',
    )
  }

  const status = payload.status || 'ACTIVE'

  if (!isValidStatus(status)) {
    return failure(
      { message: 'สถานะเส้นทางไม่ถูกต้อง' },
      'VALIDATION_ERROR',
    )
  }

  const routeData = {
    name: payload.name.trim(),
    description: payload.description?.trim() || null,
    duration_minutes: duration.value,
    status,
  }

  const { data, error } = await supabase
    .from('routes')
    .insert(routeData)
    .select('*')
    .single()

  if (error) {
    return failure(error)
  }

  return success(data)
}

export async function updateRoute(routeId, patch) {
  if (!routeId) {
    return failure(
      { message: 'ไม่พบรหัสเส้นทาง' },
      'VALIDATION_ERROR',
    )
  }

  if (!patch || typeof patch !== 'object') {
    return failure(
      { message: 'ข้อมูลที่ต้องการแก้ไขไม่ถูกต้อง' },
      'VALIDATION_ERROR',
    )
  }

  const routeData = {}

  if (patch.name !== undefined) {
    const name = patch.name?.trim()

    if (!name) {
      return failure(
        { message: 'กรุณากรอกชื่อเส้นทาง' },
        'VALIDATION_ERROR',
      )
    }

    routeData.name = name
  }

  if (patch.description !== undefined) {
    routeData.description = patch.description?.trim() || null
  }

  if (patch.duration_minutes !== undefined) {
    const duration = validateDuration(patch.duration_minutes)

    if (!duration.valid) {
      return failure(
        { message: 'ระยะเวลาต้องเป็นจำนวนเต็มมากกว่า 0 นาที' },
        'VALIDATION_ERROR',
      )
    }

    routeData.duration_minutes = duration.value
  }

  if (patch.status !== undefined) {
    if (!isValidStatus(patch.status)) {
      return failure(
        { message: 'สถานะเส้นทางไม่ถูกต้อง' },
        'VALIDATION_ERROR',
      )
    }

    routeData.status = patch.status
  }

  if (Object.keys(routeData).length === 0) {
    return failure(
      { message: 'ไม่มีข้อมูลสำหรับแก้ไข' },
      'VALIDATION_ERROR',
    )
  }

  const { data, error } = await supabase
    .from('routes')
    .update(routeData)
    .eq('id', routeId)
    .select('*')
    .single()

  if (error) {
    return failure(error)
  }

  return success(data)
}

export async function deleteRoute(routeId) {
  if (!routeId) {
    return failure(
      { message: 'ไม่พบรหัสเส้นทาง' },
      'VALIDATION_ERROR',
    )
  }

  const { error } = await supabase
    .from('routes')
    .delete()
    .eq('id', routeId)

  if (error) {
    return failure(error)
  }

  return success({ id: routeId })
}

export async function replaceRouteStops(routeId, stops) {
  if (!routeId) {
    return failure(
      { message: 'ไม่พบรหัสเส้นทาง' },
      'VALIDATION_ERROR',
    )
  }

  if (!Array.isArray(stops)) {
    return failure(
      { message: 'ข้อมูลจุดแวะชมไม่ถูกต้อง' },
      'VALIDATION_ERROR',
    )
  }

  const normalizedStops = stops.map((stop, index) => {
    const latitude = Number(stop.latitude)
    const longitude = Number(stop.longitude)

    return {
      route_id: routeId,
      name: stop.name?.trim(),
      description: stop.description?.trim() || null,
      latitude,
      longitude,
      stop_order: index + 1,
      image_url: stop.image_url?.trim() || null,
    }
  })

  for (const stop of normalizedStops) {
    if (!stop.name) {
      return failure(
        { message: 'ทุกจุดแวะชมต้องมีชื่อ' },
        'VALIDATION_ERROR',
      )
    }

    if (
      !Number.isFinite(stop.latitude) ||
      stop.latitude < -90 ||
      stop.latitude > 90
    ) {
      return failure(
        { message: 'Latitude ต้องอยู่ระหว่าง -90 ถึง 90' },
        'VALIDATION_ERROR',
      )
    }

    if (
      !Number.isFinite(stop.longitude) ||
      stop.longitude < -180 ||
      stop.longitude > 180
    ) {
      return failure(
        { message: 'Longitude ต้องอยู่ระหว่าง -180 ถึง 180' },
        'VALIDATION_ERROR',
      )
    }
  }

  const { error: deleteError } = await supabase
    .from('route_stops')
    .delete()
    .eq('route_id', routeId)

  if (deleteError) {
    return failure(deleteError)
  }

  if (normalizedStops.length === 0) {
    return success([])
  }

  const { data, error: insertError } = await supabase
    .from('route_stops')
    .insert(normalizedStops)
    .select('*')
    .order('stop_order', { ascending: true })

  if (insertError) {
    return failure(insertError)
  }

  return success(data)
}