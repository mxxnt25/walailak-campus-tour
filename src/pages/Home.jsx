import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listActiveRoutes } from '../services/routeService'

export default function Home() {
  const navigate = useNavigate()

  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadRoutes()
  }, [])

  async function loadRoutes() {
    setLoading(true)
    setError('')

    const result = await listActiveRoutes()

    if (!result?.success) {
      setError(
        result?.error?.message ||
          'ไม่สามารถโหลดเส้นทางแนะนำได้ในขณะนี้'
      )
      setRoutes([])
      setLoading(false)
      return
    }

    setRoutes(result.data || [])
    setLoading(false)
  }

  const featuredRoutes = useMemo(() => {
    return routes.slice(0, 4)
  }, [routes])

  function handleSearch(event) {
    event.preventDefault()

    const keyword = search.trim()

    if (!keyword) {
      navigate('/routes')
      return
    }

    navigate(`/routes?search=${encodeURIComponent(keyword)}`)
  }

  return (
    <div className="w-full">

      {/* HERO */}
      <section
        className="
          grid
          w-full
          grid-cols-1
          items-center
          gap-8
          py-8

          lg:grid-cols-[0.95fr_1.05fr]
          lg:gap-12
          xl:gap-16
          xl:py-10
        "
      >

        {/* LEFT */}
        <div className="order-2 lg:order-1">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
            WALAILAK CAMPUS TOUR
          </p>

          <h1
            className="
              font-bold
              leading-[1.15]
              text-textPrimary
              text-3xl

              md:text-4xl
              xl:text-[46px]
              2xl:text-[52px]
            "
          >
            ค้นพบเส้นทางท่องเที่ยว
            <br />
            มหาวิทยาลัยวลัยลักษณ์
          </h1>

          <p
            className="
              mt-5
              max-w-2xl
              text-sm
              leading-7
              text-textSecondary

              xl:text-base
            "
          >
            เลือกเส้นทางที่ใช่สำหรับคุณ
            และเพลิดเพลินกับการเดินทางเพื่อค้นพบสถานที่น่าสนใจ
            ภายในมหาวิทยาลัยวลัยลักษณ์
          </p>

          {/* SEARCH */}
          <form
            onSubmit={handleSearch}
            className="
              mt-7
              flex
              w-full
              max-w-2xl
              overflow-hidden
              rounded-lg
              border
              border-border
              bg-white
              shadow-sm
            "
          >
            <div className="flex min-w-0 flex-1 items-center gap-3 px-4">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5 shrink-0 text-textSecondary"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                type="text"
                placeholder="ค้นหาเส้นทางหรือสถานที่..."
                className="
                  min-w-0
                  w-full
                  bg-transparent
                  py-3
                  text-sm
                  text-textPrimary
                  outline-none
                "
              />
            </div>

            <button
              type="submit"
              className="
                shrink-0
                bg-primary
                px-8
                py-3
                text-sm
                font-semibold
                text-white
                transition
                hover:opacity-90
              "
            >
              ค้นหา
            </button>
          </form>
        </div>

        {/* RIGHT IMAGE */}
        <div
          className="
            order-1
            overflow-hidden
            rounded-2xl
            bg-white
            shadow-lg

            lg:order-2
          "
        >
          <img
            src="/images/home-campus.jpg"
            alt="มหาวิทยาลัยวลัยลักษณ์"
            className="
              h-[260px]
              w-full
              object-cover

              md:h-[300px]
              lg:h-[320px]
              xl:h-[340px]
              2xl:h-[360px]
            "
          />
        </div>
      </section>

      {/* FEATURED ROUTES */}
      <section className="w-full pb-12 pt-2">

        {/* HEADER */}
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-textPrimary">
              เส้นทางแนะนำ
            </h2>

            <p className="mt-1 text-sm text-textSecondary">
              เลือกเส้นทางที่คุณสนใจแล้วดูรายละเอียดเพิ่มเติม
            </p>
          </div>

          <Link
            to="/routes"
            className="shrink-0 text-sm font-semibold text-primary hover:underline"
          >
            ดูทั้งหมด
          </Link>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-xl border border-border bg-white"
              >
                <div className="h-40 animate-pulse bg-gray-200" />

                <div className="space-y-3 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={loadRoutes}
              className="mt-3 text-sm font-semibold text-primary hover:underline"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {/* EMPTY */}
        {!loading && !error && featuredRoutes.length === 0 && (
          <div className="rounded-xl border border-border bg-white p-8 text-center">
            <p className="font-medium text-textPrimary">
              ยังไม่มีเส้นทางแนะนำ
            </p>

            <p className="mt-1 text-sm text-textSecondary">
              เมื่อมีเส้นทางเปิดให้บริการ ระบบจะแสดงที่นี่
            </p>
          </div>
        )}

        {/* ROUTE CARDS */}
        {!loading && !error && featuredRoutes.length > 0 && (
          <div
            className="
              grid
              w-full
              grid-cols-1
              gap-5

              sm:grid-cols-2
              lg:grid-cols-4
            "
          >
            {featuredRoutes.map((route) => (
              <Link
                key={route.id}
                to={`/routes/${route.id}`}
                className="
                  group
                  overflow-hidden
                  rounded-xl
                  border
                  border-border
                  bg-white
                  shadow-sm
                  transition

                  hover:-translate-y-1
                  hover:shadow-md
                "
              >
                <div className="relative h-44 overflow-hidden">
                  <img
                    src="/images/home-campus.jpg"
                    alt={route.name}
                    className="
                      h-full
                      w-full
                      object-cover
                      transition
                      duration-300
                      group-hover:scale-105
                    "
                  />

                  <span
                    className="
                      absolute
                      left-3
                      top-3
                      rounded-full
                      bg-primary
                      px-3
                      py-1
                      text-xs
                      font-semibold
                      text-white
                    "
                  >
                    แนะนำ
                  </span>
                </div>

                <div className="p-4">
                  <h3 className="line-clamp-1 font-bold text-textPrimary">
                    {route.name}
                  </h3>

                  <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-textSecondary">
                    {route.description ||
                      'สำรวจเส้นทางท่องเที่ยวภายในมหาวิทยาลัย'}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-2 text-xs text-textSecondary">
                    <span>
                      ⏱ {route.duration_minutes || '-'} นาที
                    </span>

                    <span className="font-semibold text-primary">
                      รายละเอียด →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

    </div>
  )
}