import { useEffect, useState } from 'react'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import Input from '../../components/common/Input'
import ErrorState from '../../components/common/ErrorState'
import { createIncident } from '../../services/incidentService'
import { listMyGuideAssignments } from '../../services/assignmentService'

const SEVERITY_OPTIONS = [
  { value: 'LOW', label: 'ต่ำ (Low)' },
  { value: 'MEDIUM', label: 'ปานกลาง (Medium)' },
  { value: 'HIGH', label: 'สูง (High)' },
  { value: 'EMERGENCY', label: 'ฉุกเฉิน (Emergency)' },
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
  const [assignments, setAssignments] = useState([])
  const [selectedScheduleId, setSelectedScheduleId] = useState('')
  const [loadingAssignments, setLoadingAssignments] = useState(!scheduleId)
  const [assignmentError, setAssignmentError] = useState('')

  const [type, setType] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState('MEDIUM')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const effectiveScheduleId = scheduleId || selectedScheduleId

    useEffect(() => {
    if (scheduleId) return

    let cancelled = false

    async function fetchAssignments() {
      const result = await listMyGuideAssignments()

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

      setAssignments(data)
      setAssignmentError('')

      if (data.length === 1) {
        setSelectedScheduleId(data[0].schedule_id)
      }

      setLoadingAssignments(false)
    }

    fetchAssignments()

    return () => {
      cancelled = true
    }
  }, [scheduleId])

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setSuccessMessage('')

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
        setError(result.error?.message || 'ไม่สามารถบันทึกเหตุการณ์ได้')
        return
      }

      setType('')
      setDescription('')
      setSeverity('MEDIUM')
      setSuccessMessage('บันทึกเหตุการณ์เรียบร้อยแล้ว')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6">
        <p className="text-sm font-medium text-primary">Incident Reporting</p>

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
        <Card className="mb-4">
          <p className="font-medium text-warning">
            ยังไม่มีรอบนำเที่ยวที่ได้รับมอบหมาย
          </p>

          <p className="mt-1 text-sm text-textSecondary">
            คุณจะสามารถแจ้งเหตุได้เมื่อมีตารางนำเที่ยวที่ได้รับมอบหมาย
          </p>
        </Card>
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

              <select
                id="incident-schedule"
                value={selectedScheduleId}
                onChange={(event) => {
                  setSelectedScheduleId(event.target.value)
                  setError('')
                  setSuccessMessage('')
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
              </select>
            </div>
          )}

          {scheduleId && (
            <div className="rounded-card border border-border bg-background p-4">
              <p className="text-sm text-textSecondary">Schedule ID</p>
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

            <select
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
            </select>
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

          {successMessage && (
            <div className="rounded-card border border-success/30 bg-success/10 p-4 text-sm text-success">
              {successMessage}
            </div>
          )}

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