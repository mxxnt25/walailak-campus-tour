import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  listAllRoutes,
  deleteRoute,
} from '../../services/routeService'

import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'

export default function AdminRoutes() {
  const navigate = useNavigate()

  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadRoutes() {
    setLoading(true)
    setError('')

    const result = await listAllRoutes()

    if (!result.success) {
      setError(result.error.message)
      setLoading(false)
      return
    }

    setRoutes(result.data || [])
    setLoading(false)
  }

  async function handleDelete(route) {
    const confirmed = window.confirm(
      `ยืนยันลบเส้นทาง "${route.name}" ? การลบนี้ไม่สามารถย้อนกลับได้`,
    )

    if (!confirmed) return

    const result = await deleteRoute(route.id)

    if (!result.success) {
      setError(result.error.message)
      return
    }

    await loadRoutes()
  }

  useEffect(() => {
    loadRoutes()
  }, [])

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return <ErrorState message={error} />
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            จัดการเส้นทาง
          </h1>

          <p className="mt-1 text-sm text-textSecondary">
            เส้นทางทั้งหมด {routes.length} เส้นทาง
          </p>
        </div>

        <Button
          onClick={() => navigate('/admin/routes/new')}
        >
          + สร้างเส้นทาง
        </Button>
      </div>

      {routes.length === 0 ? (
        <Card>
          <div className="py-10 text-center">
            <p className="text-textSecondary">
              ยังไม่มีเส้นทางที่เปิดใช้งาน
            </p>

            <Button
              className="mt-4"
              onClick={() => navigate('/admin/routes/new')}
            >
              สร้างเส้นทางแรก
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {routes.map((route) => (
            <Card
              key={route.id}
              className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-textPrimary">
                    {route.name}
                  </h2>

                  <Badge color={route.status === 'ACTIVE' ? 'success' : 'warning'}>
                    {route.status}
                  </Badge>
                </div>

                {route.description && (
                  <p className="mt-1 text-sm text-textSecondary">
                    {route.description}
                  </p>
                )}

                <p className="mt-2 text-sm text-textSecondary">
                  ระยะเวลา:{' '}
                  {route.duration_minutes
                    ? `${route.duration_minutes} นาที`
                    : 'ไม่ระบุ'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/routes/${route.id}`)}
                >
                  ดู
                </Button>

                <Button
                  size="sm"
                  onClick={() =>
                    navigate(`/admin/routes/${route.id}/edit`)
                  }
                >
                  แก้ไข
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(route)}
                >
                  ลบ
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}