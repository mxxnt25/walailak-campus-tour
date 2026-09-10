import { listMyGuideAssignments } from './assignmentService'
import { supabase } from '../lib/supabase'

const INCIDENT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']
const INCIDENT_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED']

function success(data) {
  return {
    success: true,
    data,
    error: null,
  }
}

function failure(code, message) {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
    },
  }
}

export async function createIncident({
  scheduleId,
  type,
  description,
  severity,
}) {
  if (
    !scheduleId ||
    typeof type !== 'string' ||
    !type.trim() ||
    typeof description !== 'string' ||
    !description.trim() ||
    !INCIDENT_SEVERITIES.includes(severity)
  ) {
    return failure(
      'VALIDATION_ERROR',
      'กรุณากรอกข้อมูลเหตุการณ์ให้ครบและเลือกระดับความรุนแรงให้ถูกต้อง'
    )
  }

  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return failure(
      'AUTH_REQUIRED',
      'กรุณาเข้าสู่ระบบก่อนแจ้งเหตุ'
    )
  }

  const { data, error } = await supabase
    .from('incidents')
    .insert({
      schedule_id: scheduleId,
      reported_by: authData.user.id,
      type: type.trim(),
      description: description.trim(),
      severity,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '42501') {
      return failure(
        'FORBIDDEN',
        'คุณไม่มีสิทธิ์แจ้งเหตุสำหรับรอบนำเที่ยวนี้'
      )
    }

    return failure(
      'DATABASE_ERROR',
      'ไม่สามารถบันทึกเหตุการณ์ได้'
    )
  }

  return success(data)
}

export async function listMyRelatedIncidents() {
  const assignmentsResult = await listMyGuideAssignments()

  if (!assignmentsResult.success) {
    return failure(
      assignmentsResult.error?.code || 'DATABASE_ERROR',
      assignmentsResult.error?.message || 'ไม่สามารถโหลดตารางงานของ Guide ได้'
    )
  }

  const assignments = assignmentsResult.data || []

  const scheduleIds = assignments
    .map((assignment) => assignment.schedule_id)
    .filter(Boolean)

  if (scheduleIds.length === 0) {
    return success([])
  }

  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .in('schedule_id', scheduleIds)
    .order('created_at', { ascending: false })

  if (error) {
    if (error.code === '42501') {
      return failure(
        'FORBIDDEN',
        'คุณไม่มีสิทธิ์ดูรายการเหตุการณ์เหล่านี้'
      )
    }

    return failure(
      'DATABASE_ERROR',
      'ไม่สามารถโหลดรายการเหตุการณ์ได้'
    )
  }

  return success(data)
}

export async function listIncidentsForAdmin(filters = {}) {
  let query = supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters.status) {
    if (!INCIDENT_STATUSES.includes(filters.status)) {
      return failure(
        'VALIDATION_ERROR',
        'สถานะเหตุการณ์ไม่ถูกต้อง'
      )
    }

    query = query.eq('status', filters.status)
  }

  if (filters.severity) {
    if (!INCIDENT_SEVERITIES.includes(filters.severity)) {
      return failure(
        'VALIDATION_ERROR',
        'ระดับความรุนแรงไม่ถูกต้อง'
      )
    }

    query = query.eq('severity', filters.severity)
  }

  if (filters.scheduleId) {
    query = query.eq('schedule_id', filters.scheduleId)
  }

  if (filters.incidentId) {
    query = query.eq('id', filters.incidentId)
  }

  const { data, error } = await query

  if (error) {
    return failure(
      'DATABASE_ERROR',
      'ไม่สามารถโหลดรายการเหตุการณ์ได้'
    )
  }

  return success(data)
}

export async function updateIncidentStatus(incidentId, status) {
  if (!incidentId || !INCIDENT_STATUSES.includes(status)) {
    return failure(
      'VALIDATION_ERROR',
      'ข้อมูลสถานะเหตุการณ์ไม่ถูกต้อง'
    )
  }

  const { data, error } = await supabase
    .from('incidents')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', incidentId)
    .select('*')
    .single()

  if (error) {
    if (error.code === '42501') {
      return failure(
        'FORBIDDEN',
        'คุณไม่มีสิทธิ์เปลี่ยนสถานะเหตุการณ์'
      )
    }

    return failure(
      'DATABASE_ERROR',
      'ไม่สามารถเปลี่ยนสถานะเหตุการณ์ได้'
    )
  }

  return success(data)
}
