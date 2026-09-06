import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import Button from '../../components/common/Button'
import {
  getRouteDetail,
  listRouteStops,
} from '../../services/routeService'
import { listOpenSchedules } from '../../services/scheduleService'
import CampusMap from './CampusMap'

function formatTourDate(value) {
  if (!value) return '-'

  const [year, month, day] = value.split('-').map(Number)

  if (!year || !month || !day) {
    return value
  }

  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

function formatTime(value) {
  if (!value) return '-'
  return value.slice(0, 5)
}

function RouteDetail() {
  const { id } = useParams()

  const [route, setRoute] = useState(null)
  const [stops, setStops] = useState([])
  const [schedules, setSchedules] = useState([])
  const [selectedDate, setSelectedDate] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [scheduleError, setScheduleError] = useState(null)

  useEffect(() => {
    let active = true

    async function loadRoute() {
      const routeResult = await getRouteDetail(id)

      if (!active) return

      if (!routeResult.success) {
        setError(
          routeResult.error?.message ||
            'ไม่สามารถโหลดข้อมูลเส้นทางได้',
        )
        setLoading(false)
        return
      }

      const [stopsResult, schedulesResult] = await Promise.all([
        listRouteStops(id),
        listOpenSchedules(id),
      ])

      if (!active) return

      setRoute(routeResult.data)

      if (stopsResult.success) {
        setStops(stopsResult.data)
      } else {
        setError(
          stopsResult.error?.message ||
            'ไม่สามารถโหลดจุดแวะชมได้',
        )
      }

      if (schedulesResult.success) {
        const openSchedules = schedulesResult.data ?? []

        setSchedules(openSchedules)
        setSelectedDate(openSchedules[0]?.tour_date ?? '')
      } else {
        setScheduleError(
          schedulesResult.error?.message ||
            'ไม่สามารถโหลดรอบนำเที่ยวได้',
        )
      }

      setLoading(false)
    }

    loadRoute()

    return () => {
      active = false
    }
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

  const availableDates = [
    ...new Set(schedules.map((schedule) => schedule.tour_date)),
  ]

  const filteredSchedules = selectedDate
    ? schedules.filter(
        (schedule) => schedule.tour_date === selectedDate,
      )
    : []

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
          รอบนำเที่ยวที่เปิดรับจอง
        </h2>

        {scheduleError ? (
          <div className="mt-4 rounded-xl border border-border bg-white p-6 text-danger">
            {scheduleError}
          </div>
        ) : schedules.length === 0 ? (
          <div className="mt-4 rounded-xl border border-border bg-white p-6 text-textSecondary">
            ยังไม่มีรอบนำเที่ยวที่เปิดรับจอง
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            <div className="max-w-sm">
              <label
                htmlFor="tourDate"
                className="mb-2 block text-sm font-medium text-textPrimary"
              >
                เลือกวันที่ต้องการเข้าร่วม
              </label>

              <select
                id="tourDate"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full rounded-xl border border-border bg-white px-4 py-3 text-textPrimary outline-none focus:border-primary"
              >
                {availableDates.map((date) => (
                  <option key={date} value={date}>
                    {formatTourDate(date)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <h3 className="font-semibold text-textPrimary">
                รอบที่เปิดรับจองในวันที่เลือก
              </h3>

              {filteredSchedules.length === 0 ? (
                <div className="mt-3 rounded-xl border border-border bg-white p-6 text-textSecondary">
                  ไม่มีรอบนำเที่ยวที่เปิดรับจองในวันที่เลือก
                </div>
              ) : (
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  {filteredSchedules.map((schedule) => (
                    <article
                      key={schedule.id}
                      className="rounded-xl border border-border bg-white p-5 shadow-sm"
                    >
                      <p className="font-semibold text-textPrimary">
                        {formatTourDate(schedule.tour_date)}
                      </p>

                      <p className="mt-2 text-sm text-textSecondary">
                        เวลา {formatTime(schedule.start_time)}
                        {schedule.end_time
                          ? ` - ${formatTime(schedule.end_time)}`
                          : ''}
                      </p>

                      <p className="mt-2 text-sm text-textSecondary">
                        รองรับสูงสุด {schedule.max_participants} คน
                      </p>

                      <div className="mt-4">
                        <Link to={`/book/${schedule.id}`}>
                          <Button>จองรอบนี้</Button>
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
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

      <section className="mt-8">
        <h2 className="text-2xl font-semibold text-textPrimary">
          แผนที่เส้นทาง
        </h2>

        <div className="mt-4">
          <CampusMap stops={stops} />
        </div>
      </section>
    </div>
  )
}

export default RouteDetail