import {
  NavLink,
  useNavigate,
} from 'react-router-dom'

import {
  Home,
  Users,
  Map,
  CalendarDays,
  TriangleAlert,
  Star,
  ScrollText,
  User,
  LogOut,
  ShieldCheck,
  Compass,
} from 'lucide-react'

import { signOut } from '../services/authService'
import { useAuth } from '../hooks/useAuth'

const ROLE_LABELS = {
  ADMIN: 'ผู้ดูแลระบบ',
  SUPER_ADMIN: 'ผู้ดูแลระบบสูงสุด',
}

const MENU_ITEMS = [
  {
    label: 'จัดการผู้ใช้',
    to: '/admin/users',
    icon: Users,
  },
  {
    label: 'จัดการเส้นทาง',
    to: '/admin/routes',
    icon: Map,
  },
  {
    label: 'ตารางและไกด์',
    to: '/admin/schedules',
    icon: CalendarDays,
  },
  {
    label: 'จัดการเหตุการณ์',
    to: '/admin/incidents',
    icon: TriangleAlert,
  },
  {
    label: 'จัดการรีวิว',
    to: '/admin/reviews',
    icon: Star,
  },
]

export default function AdminLayout({
  children,
}) {
  const navigate = useNavigate()
  const { profile } = useAuth()

  async function handleSignOut() {
    const result = await signOut()

    if (result && !result.success) {
      alert(
        result.error?.message ||
          'ออกจากระบบไม่สำเร็จ'
      )
      return
    }

    navigate('/login')
  }

  const displayName =
    profile?.full_name ||
    profile?.email ||
    'ผู้ดูแลระบบ'

  const roleLabel =
    ROLE_LABELS[profile?.role] ||
    profile?.role ||
    'ADMIN'

  const initial = displayName
    .charAt(0)
    .toUpperCase()

  function menuClass({ isActive }) {
    return `
      group
      flex
      items-center
      gap-3
      rounded-xl
      px-4
      py-3
      text-sm
      transition
      ${
        isActive
          ? `
            bg-primary
            font-semibold
            text-white
            shadow-sm
          `
          : `
            font-medium
            text-textPrimary
            hover:bg-primary/10
            hover:text-primary
          `
      }
    `
  }

  return (
    <div
      className="
        flex
        min-h-screen
        bg-background
      "
    >
      {/* =========================================
          SIDEBAR
      ========================================= */}
      <aside
        className="
          fixed
          left-0
          top-0
          z-40
          flex
          h-screen
          w-[270px]
          flex-col
          border-r
          border-border
          bg-white
          shadow-sm
        "
      >
        {/* BRAND */}
        <div
          className="
            border-b
            border-border
            px-5
            py-5
          "
        >
          <button
            type="button"
            onClick={() => navigate('/')}
            className="
              flex
              w-full
              items-center
              gap-3
              text-left
              transition
              hover:opacity-80
            "
          >
            <img
              src="/images/wu-logo.jpg"
              alt="Walailak University"
              className="
                h-11
                w-11
                shrink-0
                object-contain
              "
            />

            <div className="min-w-0">
              <p
                className="
                  text-sm
                  font-bold
                  tracking-wide
                  text-primary
                "
              >
                WALAILAK
              </p>

              <p
                className="
                  mt-0.5
                  text-[10px]
                  font-semibold
                  tracking-[0.16em]
                  text-textSecondary
                "
              >
                CAMPUS TOUR
              </p>
            </div>
          </button>
        </div>

        {/* ADMIN LABEL */}
        <div
          className="
            px-5
            pb-3
            pt-5
          "
        >
          <div
            className="
              flex
              items-center
              gap-3
              rounded-xl
              bg-primary/10
              px-4
              py-3
            "
          >
            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-primary
                text-white
              "
            >
              <ShieldCheck size={18} />
            </div>

            <div>
              <p
                className="
                  text-sm
                  font-bold
                  text-textPrimary
                "
              >
                Admin Panel
              </p>

              <p
                className="
                  mt-0.5
                  text-xs
                  text-textSecondary
                "
              >
                จัดการระบบทัวร์
              </p>
            </div>
          </div>
        </div>

        {/* MENU */}
        <nav
          className="
            flex-1
            overflow-y-auto
            px-4
            py-3
          "
        >
          <p
            className="
              mb-2
              px-3
              text-[11px]
              font-semibold
              uppercase
              tracking-wider
              text-textSecondary
            "
          >
            Management
          </p>

          <div className="space-y-1">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={menuClass}
                >
                  <Icon
                    size={18}
                    className="shrink-0"
                  />

                  <span>
                    {item.label}
                  </span>
                </NavLink>
              )
            })}
          </div>

          {/* SUPER ADMIN */}
          {profile?.role ===
            'SUPER_ADMIN' && (
            <>
              <div
                className="
                  my-5
                  border-t
                  border-border
                "
              />

              <p
                className="
                  mb-2
                  px-3
                  text-[11px]
                  font-semibold
                  uppercase
                  tracking-wider
                  text-textSecondary
                "
              >
                Super Admin
              </p>

              <NavLink
                to="/admin/audit-logs"
                className={menuClass}
              >
                <ScrollText
                  size={18}
                  className="shrink-0"
                />

                <span>
                  ประวัติการดำเนินการ
                </span>
              </NavLink>
            </>
          )}

          <div
            className="
              my-5
              border-t
              border-border
            "
          />

          <p
            className="
              mb-2
              px-3
              text-[11px]
              font-semibold
              uppercase
              tracking-wider
              text-textSecondary
            "
          >
            Account
          </p>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() =>
                navigate('/')
              }
              className="
                flex
                w-full
                items-center
                gap-3
                rounded-xl
                px-4
                py-3
                text-left
                text-sm
                font-medium
                text-textPrimary
                transition
                hover:bg-primary/10
                hover:text-primary
              "
            >
              <Home size={18} />
              กลับหน้าแรก
            </button>

            <button
              type="button"
              onClick={() =>
                navigate('/profile')
              }
              className="
                flex
                w-full
                items-center
                gap-3
                rounded-xl
                px-4
                py-3
                text-left
                text-sm
                font-medium
                text-textPrimary
                transition
                hover:bg-primary/10
                hover:text-primary
              "
            >
              <User size={18} />
              โปรไฟล์ของฉัน
            </button>
          </div>
        </nav>

        {/* PROFILE / LOGOUT */}
        <div
          className="
            border-t
            border-border
            p-4
          "
        >
          <div
            className="
              mb-3
              flex
              items-center
              gap-3
              rounded-xl
              bg-background
              p-3
            "
          >
            {/* AVATAR */}
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                overflow-hidden
                rounded-full
                bg-primary/10
                text-sm
                font-bold
                text-primary
              "
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="
                    h-full
                    w-full
                    object-cover
                  "
                />
              ) : (
                initial
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p
                className="
                  truncate
                  text-sm
                  font-semibold
                  text-textPrimary
                "
              >
                {displayName}
              </p>

              <p
                className="
                  mt-0.5
                  truncate
                  text-[11px]
                  font-medium
                  text-primary
                "
              >
                {roleLabel}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-red-200
              bg-white
              px-4
              py-2.5
              text-sm
              font-semibold
              text-red-600
              transition
              hover:bg-red-50
            "
          >
            <LogOut size={17} />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* =========================================
          CONTENT
      ========================================= */}
      <div
        className="
          min-h-screen
          w-full
          pl-[270px]
        "
      >
        {/* TOP BAR */}
        <header
          className="
            sticky
            top-0
            z-30
            flex
            h-[72px]
            items-center
            justify-between
            border-b
            border-border
            bg-white/95
            px-7
            backdrop-blur
          "
        >
          <div>
            <div
              className="
                flex
                items-center
                gap-2
                text-primary
              "
            >
              <Compass size={17} />

              <p
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wider
                "
              >
                Walailak Campus Tour
              </p>
            </div>

            <p
              className="
                mt-1
                text-sm
                text-textSecondary
              "
            >
              ระบบจัดการสำหรับผู้ดูแล
            </p>
          </div>

          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <div
              className="
                hidden
                text-right
                sm:block
              "
            >
              <p
                className="
                  text-sm
                  font-semibold
                  text-textPrimary
                "
              >
                {displayName}
              </p>

              <p
                className="
                  mt-0.5
                  text-xs
                  text-textSecondary
                "
              >
                {roleLabel}
              </p>
            </div>

            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                overflow-hidden
                rounded-full
                border
                border-border
                bg-primary/10
                text-sm
                font-bold
                text-primary
              "
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="
                    h-full
                    w-full
                    object-cover
                  "
                />
              ) : (
                initial
              )}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main
          className="
            w-full
            p-7
            lg:p-8
          "
        >
          {children}
        </main>
      </div>
    </div>
  )
}