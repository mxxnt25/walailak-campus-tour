import { useState } from 'react'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import Input from '../../components/common/Input'
import ErrorState from '../../components/common/ErrorState'
import { createIncident } from '../../services/incidentService'

const SEVERITY_OPTIONS = [
  { value: 'LOW', label: 'ต่ำ (Low)' },
  { value: 'MEDIUM', label: 'ปานกลาง (Medium)' },
  { value: 'HIGH', label: 'สูง (High)' },
  { value: 'EMERGENCY', label: 'ฉุกเฉิน (Emergency)' },
]

export default function NewIncident({ scheduleId = null }) {
  const [type, setType] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState('MEDIUM')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setSuccessMessage('')

    if (!scheduleId) {
      setError('ยังไม่พบรอบนำเที่ยวสำหรับการแจ้งเหตุ')
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
        scheduleId,
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

      {!scheduleId && (
        <Card className="mb-4">
          <p className="font-medium text-warning">
            ยังไม่ได้เชื่อมรอบนำเที่ยว
          </p>
          <p className="mt-1 text-sm text-textSecondary">
            ฟอร์มนี้จะสามารถส่งข้อมูลได้เมื่อได้รับรอบนำเที่ยวจากระบบตารางงาน Guide
          </p>
        </Card>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
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
              disabled={submitting || !scheduleId}
            >
              {submitting ? 'กำลังบันทึก...' : 'บันทึกเหตุการณ์'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}