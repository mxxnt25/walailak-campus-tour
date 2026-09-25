import AppSelect from '../../components/common/AppSelect'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import Input from '../../components/common/Input'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import Toast from '../../components/common/Toast'
import { createIncident } from '../../services/incidentService'
import { listMyGuideAssignments } from '../../services/assignmentService'

const SEVERITY_OPTIONS = [
  { value: 'LOW', label: 'ต่ำ' },
  { value: 'MEDIUM', label: 'ปานกลาง' },
  { value: 'HIGH', label: 'สูง' },
  { value: 'EMERGENCY', label: 'ฉุกเฉิน' },
]

function getScheduleLabel(assignment) {
  const schedule = assignment.tour_schedules
  const routeName = schedule?.routes?.name || 'ไม่ระบุเส้นทาง'
  const tourDate = schedule?.tour_date || 'ไม่ระบุวันที่'
  const startTime = schedule?.start_time || '-'
  const endTime = schedule?.end_time || '-'

  return `${routeName} — ${tourDate} ${startTime}-${endTime}`
}

export default function NewIncident({ scheduleId = null }) {
  const [searchParams] = useSearchParams()
  const requestedScheduleId = searchParams.get('scheduleId')
  const [assignments, setAssignments] = useState([])
  const [selectedScheduleId, setSelectedScheduleId] = useState('')
  const [loadingAssignments, setLoadingAssignments] = useState(!scheduleId)
  const [assignmentError, setAssignmentError] = useState('')

  const [type, setType] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState('MEDIUM')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const effectiveScheduleId = scheduleId || selectedScheduleId

  useEffect(() => {
    if (scheduleId) return

    let cancelled = false

    async function fetchAssignments() {
      let result
      try {
        result = await listMyGuideAssignments()
      } catch {
        if (!cancelled) {
          setAssignments([])
          setAssignmentError('ไม่สามารถโหลดตารางงานของคุณได้ กรุณาลองใหม่')
          setLoadingAssignments(false)
        }
        return
      }

      if (cancelled) return

      if (!result.success) {
        setAssignments([])
        setAssignmentError(
          result.error?.message || 'ไม่สามารถโหลดตารางงานของคุณได้'
        )
        setLoadingAssignments(false)
        return
      }

      const data = result.data || []
      const acceptedAssignments = data.filter(
        (assignment) => assignment.status === 'ACCEPTED'
      )

      setAssignments(acceptedAssignments)

      if (requestedScheduleId && acceptedAssignments.some(
        (assignment) => assignment.schedule_id === requestedScheduleId
      )) {
        setSelectedScheduleId(requestedScheduleId)
        setAssignmentError('')
      } else if (requestedScheduleId) {
        setSelectedScheduleId('')
        setAssignmentError('ไม่พบรอบทัวร์ที่คุณได้รับมอบหมายตามลิงก์ กรุณาเลือกรอบที่รับงานแล้ว')
      } else if (acceptedAssignments.length === 1) {
        setSelectedScheduleId(acceptedAssignments[0].schedule_id)
        setAssignmentError('')
      } else {
        setAssignmentError('')
      }

      setLoadingAssignments(false)
    }

    fetchAssignments()

    return () => {
      cancelled = true
    }
  }, [scheduleId, requestedScheduleId])

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setToast(null)

    if (!effectiveScheduleId) {
      setError('กรุณาเลือกรอบนำเที่ยวสำหรับการแจ้งเหตุ')
      return
    }

    if (!type.trim()) {
      setError('กรุณาระบุประเภทเหตุการณ์')
      return
    }

    if (!description.trim()) {
      setError('กรุณากรอกรายละเอียดเหตุการณ์')
      return
    }

    setSubmitting(true)

    try {
      const result = await createIncident({
        scheduleId: effectiveScheduleId,
        type,
        description,
        severity,
      })

      if (!result.success) {
        setToast({
          tone: 'danger',
          message: result.error?.message || 'ไม่สามารถบันทึกเหตุการณ์ได้',
        })
        return
      }

      setType('')
      setDescription('')
      setSeverity('MEDIUM')
      setToast({
        tone: 'success',
        message: 'บันทึกเหตุการณ์เรียบร้อยแล้ว',
      })
    } catch {
      setToast({
        tone: 'danger',
        message: 'เชื่อมต่อเพื่อบันทึกเหตุการณ์ไม่สำเร็จ กรุณาลองใหม่',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6">
        <p className="text-sm font-medium text-primary">รายงานเหตุการณ์</p>

        <h1 className="mt-1 text-2xl font-bold text-textPrimary">
          แจ้งเหตุระหว่างการนำเที่ยว
        </h1>

        <p className="mt-2 text-sm text-textSecondary">
          บันทึกรายละเอียดเหตุการณ์และระดับความรุนแรงเพื่อให้ผู้ดูแลติดตาม
        </p>
      </div>

      {assignmentError && (
        <div className="mb-4">
          <ErrorState message={assignmentError} />
        </div>
      )}

      {!scheduleId && !loadingAssignments && assignments.length === 0 && (
        <EmptyState
          title="ยังไม่มีรอบนำเที่ยวที่สามารถแจ้งเหตุได้"
          description="คุณจะแจ้งเหตุได้เฉพาะรอบที่ยืนยันรับงานแล้ว"
          className="mb-4"
        />
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          {!scheduleId && (
            <div className="flex flex-col gap-1">
              <label
                htmlFor="incident-schedule"
                className="text-sm text-textSecondary"
              >
                รอบนำเที่ยว
              </label>

              <AppSelect
                id="incident-schedule"
                value={selectedScheduleId}
                onChange={(event) => {
                  setSelectedScheduleId(event.target.value)
                  setError('')
                  setToast(null)
                }}
                disabled={loadingAssignments || submitting}
                className="rounded-input border border-border bg-surface px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              >
                <option value="">
                  {loadingAssignments
                    ? 'กำลังโหลดตารางงาน...'
                    : 'เลือกรอบนำเที่ยว'}
                </option>

                {assignments.map((assignment) => (
                  <option
                    key={assignment.id}
                    value={assignment.schedule_id}
                  >
                    {getScheduleLabel(assignment)}
                  </option>
                ))}
              </AppSelect>
            </div>
          )}

          {scheduleId && (
            <div className="rounded-card border border-border bg-background p-4">
              <p className="text-sm text-textSecondary">รหัสรอบนำเที่ยว</p>
              <p className="mt-1 break-all font-medium text-textPrimary">
                {scheduleId}
              </p>
            </div>
          )}

          <Input
            label="ประเภทเหตุการณ์"
            value={type}
            onChange={(event) => setType(event.target.value)}
            placeholder="เช่น ผู้เข้าร่วมลื่นล้ม"
            disabled={submitting}
          />

          <div className="flex flex-col gap-1">
            <label
              htmlFor="incident-severity"
              className="text-sm text-textSecondary"
            >
              ระดับความรุนแรง
            </label>

            <AppSelect
              id="incident-severity"
              value={severity}
              onChange={(event) => setSeverity(event.target.value)}
              disabled={submitting}
              className="rounded-input border border-border bg-surface px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              {SEVERITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AppSelect>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="incident-description"
              className="text-sm text-textSecondary"
            >
              รายละเอียดเหตุการณ์
            </label>

            <textarea
              id="incident-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="อธิบายเหตุการณ์ที่เกิดขึ้น..."
              rows={6}
              disabled={submitting}
              className="resize-y rounded-input border border-border bg-surface px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>

          {error && <ErrorState message={error} />}

          <Toast
            message={toast?.message || ''}
            tone={toast?.tone || 'success'}
            onClose={() => setToast(null)}
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={
                submitting ||
                loadingAssignments ||
                !effectiveScheduleId
              }
            >
              {submitting ? 'กำลังบันทึก...' : 'บันทึกเหตุการณ์'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}