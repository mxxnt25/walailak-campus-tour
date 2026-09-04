import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import {
    getRouteDetail,
    listRouteStops,
    updateRoute,
    replaceRouteStops,
} from '../../services/routeService'

import Card from '../../components/common/Card'
import Input from '../../components/common/Input'
import Button from '../../components/common/Button'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'

export default function RouteEdit() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [form, setForm] = useState({
        name: '',
        description: '',
        duration_minutes: '',
        status: 'ACTIVE',
    })

    const [stops, setStops] = useState([])
    const [newStop, setNewStop] = useState({
        name: '',
        description: '',
        latitude: '',
        longitude: '',
        image_url: '',
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [stopError, setStopError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [savingStops, setSavingStops] = useState(false)

    useEffect(() => {
        async function load() {
            setLoading(true)
            setError('')

            const routeResult = await getRouteDetail(id)

            if (!routeResult.success) {
                setError(routeResult.error.message)
                setLoading(false)
                return
            }

            const route = routeResult.data

            setForm({
                name: route.name || '',
                description: route.description || '',
                duration_minutes: route.duration_minutes ?? '',
                status: route.status || 'ACTIVE',
            })

            const stopsResult = await listRouteStops(id)

            if (stopsResult.success) {
                setStops(stopsResult.data || [])
            }

            setLoading(false)
        }

        load()
    }, [id])

    function handleChange(event) {
        const { name, value } = event.target

        setForm((current) => ({
            ...current,
            [name]: value,
        }))
    }

    function handleStopChange(event) {
        const { name, value } = event.target

        setNewStop((current) => ({
            ...current,
            [name]: value,
        }))
    }

    function handleAddStop() {
        if (!newStop.name.trim()) {
            setStopError('กรุณากรอกชื่อจุดแวะ')
            return
        }

        if (newStop.latitude === '' || newStop.longitude === '') {
            setStopError('กรุณากรอก Latitude และ Longitude')
            return
        }

        setStops((current) => [
            ...current,
            {
                ...newStop,
                id: `temp-${Date.now()}`,
            },
        ])

        setNewStop({
            name: '',
            description: '',
            latitude: '',
            longitude: '',
            image_url: '',
        })

        setStopError('')
    }

    function moveStop(index, direction) {
        setStops((current) => {
            const newIndex = index + direction

            if (newIndex < 0 || newIndex >= current.length) {
                return current
            }

            const updated = [...current]

            const temp = updated[index]
            updated[index] = updated[newIndex]
            updated[newIndex] = temp

            return updated
        })
    }

    async function handleSaveStops() {
        setStopError('')
        setSavingStops(true)

        const result = await replaceRouteStops(id, stops)

        if (!result.success) {
            setStopError(result.error.message)
            setSavingStops(false)
            return
        }

        setStops(result.data || [])
        setSavingStops(false)
    }

    async function handleSubmit(event) {
        event.preventDefault()

        setError('')
        setSubmitting(true)

        const result = await updateRoute(id, form)

        if (!result.success) {
            setError(result.error.message)
            setSubmitting(false)
            return
        }

        setSubmitting(false)
    }

    if (loading) {
        return <LoadingState />
    }

    if (error && !form.name) {
        return <ErrorState message={error} />
    }

    return (
        <div className="max-w-3xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-primary">
                    แก้ไขเส้นทาง
                </h1>

                <p className="mt-1 text-sm text-textSecondary">
                    แก้ไขข้อมูลเส้นทางและจัดการจุดแวะชม
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
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="INACTIVE">INACTIVE</option>
                        </select>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => navigate('/admin/routes')}
                        >
                            กลับ
                        </Button>

                        <Button
                            type="submit"
                            disabled={submitting}
                        >
                            {submitting
                                ? 'กำลังบันทึก...'
                                : 'บันทึกการแก้ไข'}
                        </Button>
                    </div>
                </form>

                {stops.length > 0 && (
                    <div className="mt-6 border-t border-border pt-5">
                        <h3 className="mb-3 font-semibold text-textPrimary">
                            รายการจุดแวะ
                        </h3>

                        <div className="flex flex-col gap-3">
                            {stops.map((stop, index) => (
                                <div
                                    key={stop.id || `${stop.name}-${index}`}
                                    className="flex flex-col gap-3 rounded-card border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div>
                                        <p className="font-medium text-textPrimary">
                                            {index + 1}. {stop.name}
                                        </p>

                                        {stop.description && (
                                            <p className="mt-1 text-sm text-textSecondary">
                                                {stop.description}
                                            </p>
                                        )}

                                        <p className="mt-1 text-xs text-textSecondary">
                                            Lat: {stop.latitude} / Lng: {stop.longitude}
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            disabled={index === 0}
                                            onClick={() => moveStop(index, -1)}
                                        >
                                            ↑
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            disabled={index === stops.length - 1}
                                            onClick={() => moveStop(index, 1)}
                                        >
                                            ↓
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="danger"
                                            size="sm"
                                            onClick={() => {
                                                setStops((current) =>
                                                    current.filter((_, stopIndex) => stopIndex !== index),
                                                )
                                            }}
                                        >
                                            ลบ
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Card>

            <Card className="mt-6">
                <div className="mb-5">
                    <h2 className="text-lg font-semibold text-textPrimary">
                        จุดแวะชม
                    </h2>

                    <p className="mt-1 text-sm text-textSecondary">
                        ตอนนี้มี {stops.length} จุด
                    </p>
                </div>

                {stopError && (
                    <div className="mb-4 rounded-input border border-danger bg-danger/10 p-3 text-sm text-danger">
                        {stopError}
                    </div>
                )}

                <div className="flex flex-col gap-4">
                    <Input
                        label="ชื่อจุดแวะ"
                        name="name"
                        value={newStop.name}
                        onChange={handleStopChange}
                        placeholder="เช่น อาคารเรียนรวม"
                    />

                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-textSecondary">
                            คำอธิบาย
                        </label>

                        <textarea
                            name="description"
                            value={newStop.description}
                            onChange={handleStopChange}
                            rows={3}
                            placeholder="รายละเอียดของจุดแวะ"
                            className="rounded-input border border-border bg-surface px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input
                            label="Latitude"
                            name="latitude"
                            type="number"
                            step="any"
                            value={newStop.latitude}
                            onChange={handleStopChange}
                            placeholder="เช่น 8.641234"
                        />

                        <Input
                            label="Longitude"
                            name="longitude"
                            type="number"
                            step="any"
                            value={newStop.longitude}
                            onChange={handleStopChange}
                            placeholder="เช่น 99.898765"
                        />
                    </div>

                    <Input
                        label="Image URL"
                        name="image_url"
                        value={newStop.image_url}
                        onChange={handleStopChange}
                        placeholder="https://..."
                    />

                    <div className="flex justify-end">
                        <Button
                            type="button"
                            onClick={handleAddStop}
                        >
                            + เพิ่มจุดแวะ
                        </Button>
                    </div>
                </div>

                <div className="mt-6 flex justify-end border-t border-border pt-4">
                    <Button
                        type="button"
                        disabled={savingStops}
                        onClick={handleSaveStops}
                    >
                        {savingStops
                            ? 'กำลังบันทึก...'
                            : 'บันทึกจุดแวะทั้งหมด'}
                    </Button>
                </div>
            </Card>
        </div>
    )
}