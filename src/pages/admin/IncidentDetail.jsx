import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import ErrorState from '../../components/common/ErrorState'
import LoadingState from '../../components/common/LoadingState'
import {
  listIncidentsForAdmin,
  updateIncidentStatus,
} from '../../services/incidentService'

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED']

const STATUS_COLORS = {
  OPEN: 'warning',
  IN_PROGRESS: 'primary',
  RESOLVED: 'success',
}

const SEVERITY_COLORS = {
  LOW: 'primary',
  MEDIUM: 'warning',
  HIGH: 'danger',
  EMERGENCY: 'danger',
}

function formatDateTime(value) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function IncidentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [incident, setIncident] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchIncident() {
      const result = await listIncidentsForAdmin({
        incidentId: id,
      })

      if (cancelled) return

      if (!result.success) {
        setError(
          result.error?.message || 'ไม่สามารถโหลดรายละเอียดเหตุการณ์ได้'
        )
        setLoading(false)
        return
      }

      const foundIncident = result.data?.[0] || null

      if (!foundIncident) {
        setError('ไม่พบเหตุการณ์ที่ต้องการ')
        setLoading(false)
        return
      }

      setIncident(foundIncident)
      setError('')
      setLoading(false)
    }

    fetchIncident()

    return () => {
      cancelled = true
    }
  }, [id])

  async function handleStatusChange(newStatus) {
    if (!incident || newStatus === incident.status) return

    setUpdating(true)
    setError('')
    setSuccessMessage('')

    const result = await updateIncidentStatus(incident.id, newStatus)

    if (!result.success) {
      setError(
        result.error?.message || 'ไม่สามารถเปลี่ยนสถานะเหตุการณ์ได้'
      )
      setUpdating(false)
      return
    }

    setIncident(result.data)
    setSuccessMessage('อัปเดตสถานะเหตุการณ์เรียบร้อยแล้ว')
    setUpdating(false)
  }

  if (loading) {
    return <LoadingState message="กำลังโหลดรายละเอียดเหตุการณ์..." />
  }

  if (error && !incident) {
    return <ErrorState message={error} />
  }

  if (!incident) {
    return <ErrorState message="ไม่พบเหตุการณ์ที่ต้องการ" />
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">
            Incident Management
          </p>

          <h1 className="mt-1 text-2xl font-bold text-textPrimary">
            รายละเอียดเหตุการณ์
          </h1>

          <p className="mt-1 text-sm text-textSecondary">
            ตรวจสอบข้อมูลและอัปเดตสถานะของเหตุการณ์
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() => navigate('/admin/incidents')}
        >
          กลับไปรายการ
        </Button>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-card border border-success/30 bg-success/10 p-4 text-sm text-success">
          {successMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Badge color={SEVERITY_COLORS[incident.severity]}>
              {incident.severity}
            </Badge>

            <Badge color={STATUS_COLORS[incident.status]}>
              {incident.status}
            </Badge>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-sm text-textSecondary">
                ประเภทเหตุการณ์
              </p>
              <p className="mt-1 font-medium text-textPrimary">
                {incident.type}
              </p>
            </div>

            <div>
              <p className="text-sm text-textSecondary">
                รายละเอียด
              </p>
              <p className="mt-1 whitespace-pre-wrap text-textPrimary">
                {incident.description}
              </p>
            </div>

            <div>
              <p className="text-sm text-textSecondary">
                Schedule ID
              </p>
              <p className="mt-1 break-all text-sm text-textPrimary">
                {incident.schedule_id}
              </p>
            </div>

            <div>
              <p className="text-sm text-textSecondary">
                Reporter ID
              </p>
              <p className="mt-1 break-all text-sm text-textPrimary">
                {incident.reported_by}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-textSecondary">
                  วันที่รายงาน
                </p>
                <p className="mt-1 text-sm text-textPrimary">
                  {formatDateTime(incident.created_at)}
                </p>
              </div>

              <div>
                <p className="text-sm text-textSecondary">
                  อัปเดตล่าสุด
                </p>
                <p className="mt-1 text-sm text-textPrimary">
                  {formatDateTime(incident.updated_at)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-textPrimary">
            จัดการสถานะ
          </h2>

          <p className="mt-1 text-sm text-textSecondary">
            เลือกสถานะปัจจุบันของเหตุการณ์
          </p>

          <div className="mt-5 flex flex-col gap-2">
            {STATUS_OPTIONS.map((status) => (
              <Button
                key={status}
                variant={
                  status === incident.status
                    ? 'primary'
                    : 'secondary'
                }
                disabled={updating || status === incident.status}
                onClick={() => handleStatusChange(status)}
                className="w-full"
              >
                {updating && status !== incident.status
                  ? 'กำลังอัปเดต...'
                  : status}
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}