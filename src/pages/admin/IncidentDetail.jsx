import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import ErrorState from '../../components/common/ErrorState'
import ConfirmModal from '../../components/common/ConfirmModal'
import LoadingState from '../../components/common/LoadingState'
import StatusBadge from '../../components/common/StatusBadge'
import Toast from '../../components/common/Toast'
import { formatDateTime } from '../../utils/dateTime'
import { getStatusLabel } from '../../utils/status'
import { getIncidentSeverityLabel } from '../../utils/incidentDisplay'
import {
  listIncidentsForAdmin,
  updateIncidentStatus,
} from '../../services/incidentService'

const NEXT_STATUS = {
  OPEN: 'IN_PROGRESS',
  IN_PROGRESS: 'RESOLVED',
}

const SEVERITY_COLORS = {
  LOW: 'primary',
  MEDIUM: 'warning',
  HIGH: 'danger',
  EMERGENCY: 'danger',
}

export default function IncidentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [incident, setIncident] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [pendingStatus, setPendingStatus] = useState(null)
  const [toast, setToast] = useState(null)

  const nextStatus = incident
    ? NEXT_STATUS[incident.status] || null
    : null

  useEffect(() => {
    let cancelled = false

    async function fetchIncident() {
      let result
      try {
        result = await listIncidentsForAdmin({ incidentId: id })
      } catch {
        if (!cancelled) {
          setError('เชื่อมต่อเพื่อโหลดรายละเอียดเหตุการณ์ไม่สำเร็จ กรุณาลองใหม่')
          setLoading(false)
        }
        return
      }

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

  async function handleStatusChange() {
    const newStatus = pendingStatus
    if (updating || !incident || !newStatus || newStatus === incident.status) {
      setPendingStatus(null)
      return
    }

    setUpdating(true)
    setToast(null)
    try {
      const result = await updateIncidentStatus(incident.id, newStatus)
      if (!result.success) {
        setToast({
          tone: 'danger',
          message: result.error?.message || 'ไม่สามารถเปลี่ยนสถานะเหตุการณ์ได้',
        })
        return
      }
      setIncident(result.data)
      setToast({tone: 'success', message: 'อัปเดตสถานะเหตุการณ์เรียบร้อยแล้ว'})
    } catch {
      setToast({
        tone: 'danger',
        message: 'เชื่อมต่อเพื่อเปลี่ยนสถานะเหตุการณ์ไม่สำเร็จ กรุณาลองใหม่',
      })
    } finally {
      setUpdating(false)
      setPendingStatus(null)
    }
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
            ระบบจัดการเหตุการณ์
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

      <Toast
        message={toast?.message || ''}
        tone={toast?.tone || 'success'}
        onClose={() => setToast(null)}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Badge color={SEVERITY_COLORS[incident.severity]}>
              {getIncidentSeverityLabel(incident.severity)}
            </Badge>

            <StatusBadge status={incident.status} />
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
                รหัสรอบนำเที่ยว
              </p>
              <p className="mt-1 break-all text-sm text-textPrimary">
                {incident.schedule_id}
              </p>
            </div>

            <div>
              <p className="text-sm text-textSecondary">
                รหัสผู้รายงาน
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
            เปลี่ยนสถานะตามลำดับ: เปิดอยู่ → กำลังดำเนินการ → แก้ไขแล้ว
          </p>

          <div className="mt-5">
            {nextStatus ? (
              <Button
                variant="primary"
                disabled={updating}
                onClick={() => setPendingStatus(nextStatus)}
                className="w-full"
              >
                {updating
                  ? 'กำลังอัปเดต...'
                  : 'เปลี่ยนเป็น ' + getStatusLabel(nextStatus)}
              </Button>
            ) : (
              <div className="rounded-card border border-success/30 bg-success/10 p-4 text-sm text-success">
                เหตุการณ์นี้อยู่ในสถานะสุดท้ายแล้ว
              </div>
            )}
          </div>
        </Card>
      </div>

      <ConfirmModal
        open={Boolean(pendingStatus)}
        title="ยืนยันการเปลี่ยนสถานะ"
        description={
          pendingStatus && incident
            ? getStatusLabel(incident.status) +
              ' → ' +
              getStatusLabel(pendingStatus)
            : ''
        }
        confirmLabel="ยืนยัน"
        cancelLabel="ยกเลิก"
        busy={updating}
        onCancel={() => {
          if (!updating) {
            setPendingStatus(null)
          }
        }}
        onConfirm={handleStatusChange}
      />
    </div>
  )
}