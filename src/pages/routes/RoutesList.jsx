import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { getCachedActiveRoutes, listActiveRoutes } from '../../services/routeService'
import { filterDiscoverableRoutes } from '../../utils/routeDiscovery'
import RouteCover from '../../components/routes/RouteCover'
import RouteRating from '../../components/reviews/RouteRating'

export default function RoutesList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const keyword = searchParams.get('search')?.trim() ?? ''
  const [routes, setRoutes] = useState(() => getCachedActiveRoutes() ?? [])
  const [loading, setLoading] = useState(() => getCachedActiveRoutes() === null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    listActiveRoutes()
      .then((result) => {
        if (!active) return
        if (result.success) {
          setRoutes(result.data ?? [])
        } else {
          setError(result.error?.message || 'ไม่สามารถโหลดเส้นทางได้')
        }
      })
      .catch(() => {
        if (active) setError('ไม่สามารถโหลดเส้นทางได้ กรุณาลองใหม่อีกครั้ง')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  function handleSearch(event) {
    event.preventDefault()
    const nextKeyword = String(new FormData(event.currentTarget).get('search') ?? '').trim()
    setSearchParams(nextKeyword ? { search: nextKeyword } : {})
  }

  const visibleRoutes = filterDiscoverableRoutes(routes, keyword)

  return (
    <div className="mx-auto w-full max-w-6xl py-8 sm:py-10">
      <div className="mb-7">
        <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-primary">ค้นพบมหาวิทยาลัย</p>
        <h1 className="text-3xl font-bold text-textPrimary">เส้นทางนำเที่ยว</h1>
        <p className="mt-2 text-textSecondary">ค้นหาเส้นทางหรือชื่อจุดแวะชมภายในมหาวิทยาลัย</p>
      </div>

      <form onSubmit={handleSearch} role="search" className="mb-7 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="route-search" className="relative block min-w-0 flex-1">
          <span className="sr-only">ค้นหาเส้นทางหรือสถานที่</span>
          <Search size={19} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary" />
          <input
            key={keyword}
            id="route-search"
            name="search"
            type="search"
            defaultValue={keyword}
            placeholder="ชื่อเส้นทางหรือจุดแวะชม เช่น สวนวลัยลักษณ์"
            className="w-full rounded-2xl border border-border bg-white py-3 pl-11 pr-4 text-textPrimary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <button type="submit" className="rounded-2xl bg-primary px-7 py-3 font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">ค้นหา</button>
        {keyword && (
          <button type="button" onClick={() => setSearchParams({})} className="inline-flex items-center justify-center gap-1 rounded-2xl border border-border bg-white px-4 py-3 font-medium text-textSecondary hover:text-primary">
            <X size={16} aria-hidden="true" /> ล้างคำค้น
          </button>
        )}
      </form>

      {loading ? (
        <div role="status" className="rounded-2xl border border-border bg-white p-8 text-center text-textSecondary">กำลังโหลดเส้นทาง...</div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-danger/30 bg-white p-6 text-danger">{error}</div>
      ) : visibleRoutes.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-10 text-center">
          <p className="font-semibold text-textPrimary">{keyword ? 'ไม่พบเส้นทางที่ตรงกับคำค้น' : 'ยังไม่มีเส้นทางที่เปิดให้เข้าชม'}</p>
          <p className="mt-2 text-sm text-textSecondary">{keyword ? `ลองใช้ชื่ออื่นแทน “${keyword}” หรือดูเส้นทางทั้งหมด` : 'เมื่อมีเส้นทางเปิดให้เข้าชม ระบบจะแสดงที่นี่'}</p>
          {keyword && <button type="button" onClick={() => setSearchParams({})} className="mt-4 rounded-xl border border-primary px-5 py-2 font-medium text-primary hover:bg-primary/5">ดูเส้นทางทั้งหมด</button>}
        </div>
      ) : (
        <>
          <p role="status" className="mb-4 text-sm text-textSecondary">
            {keyword ? `พบ ${visibleRoutes.length} เส้นทางสำหรับ “${keyword}”` : `เส้นทางทั้งหมด ${visibleRoutes.length} เส้นทาง`}
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleRoutes.map((route) => (
              <Link key={route.id} to={`/routes/${route.id}`} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                <RouteCover src={route.cover_image_url} alt={`ภาพเส้นทาง ${route.name}`} className="h-44 w-full" />
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="line-clamp-2 text-xl font-semibold text-textPrimary group-hover:text-primary">{route.name}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-textSecondary">{route.description || 'สำรวจเส้นทางท่องเที่ยวภายในมหาวิทยาลัย'}</p>
                  <RouteRating rating={route.review_rating} count={route.review_count} className="mt-2" />
                  <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-sm">
                    <span className="text-textSecondary">{route.duration_minutes ? `ประมาณ ${route.duration_minutes} นาที` : 'ยังไม่ระบุระยะเวลา'}</span>
                    <span className="shrink-0 font-semibold text-primary">รายละเอียด →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
