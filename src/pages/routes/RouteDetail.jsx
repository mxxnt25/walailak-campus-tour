import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  getRouteDetail,
  listRouteStops,
} from '../../services/routeService'

function RouteDetail() {
  const { id } = useParams()

  const [route, setRoute] = useState(null)
  const [stops, setStops] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadRoute() {
      const routeResult = await getRouteDetail(id)

      if (!routeResult.success) {
        setError(routeResult.error?.message || 'ไม่สามารถโหลดข้อมูลเส้นทางได้')
        setLoading(false)
        return
      }

      const stopsResult = await listRouteStops(id)

      setRoute(routeResult.data)

      if (stopsResult.success) {
        setStops(stopsResult.data)
      } else {
        setError(stopsResult.error?.message || 'ไม่สามารถโหลดจุดแวะชมได้')
      }

      setLoading(false)
    }

    loadRoute()
  }, [id])

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-textSecondary">
        กำลังโหลดรายละเอียดเส้นทาง...
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-danger">
        {error}
      </div>
    )
  }

  if (!route) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-textSecondary">
        ไม่พบเส้นทาง
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-textPrimary">
          {route.name}
        </h1>

        {route.description && (
          <p className="mt-3 text-textSecondary">
            {route.description}
          </p>
        )}

        {route.duration_minutes && (
          <p className="mt-4 text-sm text-textSecondary">
            ระยะเวลาโดยประมาณ {route.duration_minutes} นาที
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold text-textPrimary">
          จุดแวะชม
        </h2>

        {stops.length === 0 ? (
          <div className="mt-4 rounded-xl border border-border bg-white p-6 text-textSecondary">
            เส้นทางนี้ยังไม่มีจุดแวะชม
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {stops.map((stop) => (
              <article
                key={stop.id}
                className="rounded-xl border border-border bg-white p-5 shadow-sm"
              >
                <div className="text-sm font-medium text-textSecondary">
                  จุดที่ {stop.stop_order}
                </div>

                <h3 className="mt-1 text-xl font-semibold text-textPrimary">
                  {stop.name}
                </h3>

                {stop.description && (
                  <p className="mt-2 text-textSecondary">
                    {stop.description}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default RouteDetail