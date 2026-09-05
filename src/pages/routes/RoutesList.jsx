import { useEffect, useState } from 'react'
import { listActiveRoutes } from '../../services/routeService'
import { Link } from 'react-router-dom'

function RoutesList() {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadRoutes() {
      const result = await listActiveRoutes()

      if (result.success) {
        setRoutes(result.data)
      } else {
        setError(result.error?.message || 'ไม่สามารถโหลดเส้นทางได้')
      }

      setLoading(false)
    }

    loadRoutes()
  }, [])

  if (loading) {
    return (
      <div className="p-6 text-textSecondary">
        กำลังโหลดเส้นทาง...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-danger">
        {error}
      </div>
    )
  }

  if (routes.length === 0) {
    return (
      <div className="p-6 text-textSecondary">
        ยังไม่มีเส้นทางที่เปิดให้เข้าชม
      </div>
    )
  }



  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-textPrimary">
          เส้นทางนำเที่ยว
        </h1>

        <p className="mt-2 text-textSecondary">
          เลือกดูเส้นทางและจุดแวะชมภายในมหาวิทยาลัย
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {routes.map((route) => (
          <article
            key={route.id}
            className="rounded-xl border border-border bg-white p-5 shadow-sm"
          >
            <h2 className="text-xl font-semibold text-textPrimary">
              {route.name}
            </h2>

            {route.description && (
              <p className="mt-2 text-sm text-textSecondary">
                {route.description}
              </p>
            )}

            {route.duration_minutes && (
              <p className="mt-4 text-sm text-textSecondary">
                ระยะเวลาโดยประมาณ {route.duration_minutes} นาที
              </p>
            )}

            <Link
              to={`/routes/${route.id}`}
              className="mt-5 inline-block font-medium text-primary hover:underline"
            >
              ดูรายละเอียดเส้นทาง
            </Link>
          </article>
        ))}
      </div>
    </div>
  )
}

export default RoutesList