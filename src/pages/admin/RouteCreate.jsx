import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { createRoute } from '../../services/routeService'

import Card from '../../components/common/Card'
import Input from '../../components/common/Input'
import Button from '../../components/common/Button'

export default function RouteCreate() {
    const navigate = useNavigate()

    const [form, setForm] = useState(() => {
        const savedDraft = sessionStorage.getItem('route-create-draft')

        if (savedDraft) {
            try {
                return JSON.parse(savedDraft)
            } catch {
                // ถ้า draft เสีย ให้ใช้ค่าเริ่มต้น
            }
        }

        return {
            name: '',
            description: '',
            duration_minutes: '',
            status: 'ACTIVE',
        }
    })

    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        sessionStorage.setItem(
            'route-create-draft',
            JSON.stringify(form),
        )
    }, [form])

    function handleChange(event) {
        const { name, value } = event.target

        setForm((current) => ({
            ...current,
            [name]: value,
        }))
    }

    async function handleSubmit(event) {
        event.preventDefault()

        setError('')
        setSubmitting(true)

        const result = await createRoute(form)

        if (!result.success) {
            setError(result.error.message)
            setSubmitting(false)
            return
        }

        sessionStorage.removeItem('route-create-draft')
        
        navigate(`/admin/routes/${result.data.id}/edit`)
    }

    return (
        <div className="max-w-3xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-primary">
                    สร้างเส้นทางใหม่
                </h1>

                <p className="mt-1 text-sm text-textSecondary">
                    กรอกข้อมูลพื้นฐานของเส้นทางนำเที่ยว
                </p>
            </div>

            <Card>
                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-5"
                >
                    {error && (
                        <div className="rounded-input border border-danger bg-danger/10 p-3 text-sm text-danger">
                            {error}
                        </div>
                    )}

                    <Input
                        label="ชื่อเส้นทาง"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="เช่น Campus Highlights Route"
                        required
                    />

                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-textSecondary">
                            คำอธิบาย
                        </label>

                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            rows={4}
                            placeholder="อธิบายรายละเอียดของเส้นทาง"
                            className="rounded-input border border-border bg-surface px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <Input
                        label="ระยะเวลาโดยประมาณ (นาที)"
                        name="duration_minutes"
                        type="number"
                        min="1"
                        step="1"
                        value={form.duration_minutes}
                        onChange={handleChange}
                        placeholder="เช่น 60"
                    />

                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-textSecondary">
                            สถานะ
                        </label>

                        <select
                            name="status"
                            value={form.status}
                            onChange={handleChange}
                            className="rounded-input border border-border bg-surface px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="ACTIVE">
                                ACTIVE
                            </option>

                            <option value="INACTIVE">
                                INACTIVE
                            </option>
                        </select>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={submitting}
                            onClick={() => navigate('/admin/routes')}
                        >
                            ยกเลิก
                        </Button>

                        <Button
                            type="submit"
                            disabled={submitting}
                        >
                            {submitting
                                ? 'กำลังบันทึก...'
                                : 'สร้างเส้นทาง'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}