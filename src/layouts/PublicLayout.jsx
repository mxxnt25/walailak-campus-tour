import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { signOut } from '../services/authService'
import Button from '../components/common/Button'

const ROLE_LABELS = {
  MEMBER: 'สมาชิก',
  GUIDE: 'ไกด์นำเที่ยว',
  ADMIN: 'ผู้ดูแลระบบ',
  SUPER_ADMIN: 'ผู้ดูแลระบบสูงสุด',
}

export default function PublicLayout({ children }) {
  const { session, profile } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    const result = await signOut()

    if (result?.success === false) {
      return
    }

    navigate('/login', {
      replace: true,
    })
  }

  const displayName =
    profile?.full_name?.trim() ||
    profile?.email ||
    'ผู้ใช้งาน'

  const initial =
    profile?.full_name?.trim()?.charAt(0)?.toUpperCase() ||
    profile?.email?.charAt(0)?.toUpperCase() ||
    '?'

  const roleLabel =
    ROLE_LABELS[profile?.role] ||
    profile?.role ||
    'สมาชิก'

  const canManageSystem =
    profile?.role === 'ADMIN' ||
    profile?.role === 'SUPER_ADMIN'

  return (
    <div className="min-h-screen bg-background">
      {/* NAVBAR */}
      <nav
        className="
          sticky
          top-0
          z-50
          w-full
          border-b
          border-border
          bg-white
          shadow-sm
        "
      >
        <div
          className="
            flex
            w-full
            items-center
            px-[3vw]
            py-3
          "
        >
          {/* LOGO */}
          <Link
            to="/"
            className="
              flex
              shrink-0
              items-center
              gap-3
              transition
              hover:opacity-80
            "
          >
            <img
              src="/images/wu-logo.jpg"
              alt="ตรามหาวิทยาลัยวลัยลักษณ์"
              style={{
                width: '42px',
                height: '42px',
                objectFit: 'contain',
                display: 'block',
                flexShrink: 0,
              }}
            />

            <div className="leading-tight">
              <p className="text-sm font-bold text-primary">
                WALAILAK
              </p>

              <p className="text-[10px] font-semibold text-textSecondary">
                CAMPUS TOUR
              </p>
            </div>
          </Link>

          {/* DESKTOP RIGHT */}
          <div
            className="
              ml-auto
              hidden
              items-center
              gap-5
              md:flex
            "
          >
            <Link
              to="/"
              className="
                text-sm
                font-medium
                text-textPrimary
                transition
                hover:text-primary
              "
            >
              หน้าแรก
            </Link>

            <Link
              to="/routes"
              className="
                text-sm
                font-medium
                text-textPrimary
                transition
                hover:text-primary
              "
            >
              เส้นทางท่องเที่ยว
            </Link>

            {session && (
              <>
                {profile?.role === 'MEMBER' && (
                  <Link
                    to="/my-bookings"
                    className="
                      text-sm
                      font-medium
                      text-textPrimary
                      transition
                      hover:text-primary
                    "
                  >
                    การจองของฉัน
                  </Link>
                )}

                <Link
                  to="/reviews"
                  className="
                    text-sm
                    font-medium
                    text-textPrimary
                    transition
                    hover:text-primary
                  "
                >
                  รีวิว
                </Link>

                {profile?.role === 'GUIDE' && (
                  <>
                    <Link
                      to="/guide/incidents"
                      className="
                        text-sm
                        font-medium
                        text-textPrimary
                        transition
                        hover:text-primary
                      "
                    >
                      เหตุการณ์ของฉัน
                    </Link>

                    <Link
                      to="/incidents/new"
                      className="
                        text-sm
                        font-medium
                        text-textPrimary
                        transition
                        hover:text-primary
                      "
                    >
                      แจ้งเหตุ
                    </Link>
                  </>
                )}
              </>
            )}

            <div className="h-8 w-px bg-border" />

            {/* ACCOUNT */}
            {session ? (
              <>
                {canManageSystem && (
                  <Link to="/admin">
                    <Button variant="ghost">
                      จัดการระบบ
                    </Button>
                  </Link>
                )}

                <Link
                  to="/profile"
                  className="
                    flex
                    items-center
                    gap-3
                    rounded-xl
                    px-2
                    py-1.5
                    transition
                    hover:bg-background
                  "
                >
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
                      border
                      border-primary/20
                      bg-primary/10
                      text-sm
                      font-bold
                      text-primary
                    "
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="รูปโปรไฟล์"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initial
                    )}
                  </div>

                  <div className="max-w-[160px] leading-tight">
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
                        mt-1
                        truncate
                        text-[11px]
                        font-medium
                        text-primary
                      "
                    >
                      {roleLabel}
                    </p>
                  </div>
                </Link>

                <Button
                  variant="secondary"
                  onClick={handleSignOut}
                >
                  ออกจากระบบ
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">
                    เข้าสู่ระบบ
                  </Button>
                </Link>

                <Link to="/register">
                  <Button variant="primary">
                    สมัครสมาชิก
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* MOBILE */}
        <div
          className="
            border-t
            border-border
            px-4
            py-3
            md:hidden
          "
        >
          {session && (
            <Link
              to="/profile"
              className="
                mb-3
                flex
                items-center
                gap-3
                rounded-xl
                border
                border-border
                bg-background
                px-3
                py-2
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
                    alt="รูปโปรไฟล์"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initial
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-textPrimary">
                  {displayName}
                </p>

                <p className="truncate text-[10px] text-primary">
                  {roleLabel}
                </p>
              </div>
            </Link>
          )}

          <div
            className="
              flex
              items-center
              gap-5
              overflow-x-auto
            "
          >
            <Link
              to="/"
              className="whitespace-nowrap text-xs font-medium text-textPrimary"
            >
              หน้าแรก
            </Link>

            <Link
              to="/routes"
              className="whitespace-nowrap text-xs font-medium text-textPrimary"
            >
              เส้นทางท่องเที่ยว
            </Link>

            {session && profile?.role === 'MEMBER' && (
              <Link
                to="/my-bookings"
                className="whitespace-nowrap text-xs font-medium text-textPrimary"
              >
                การจองของฉัน
              </Link>
            )}

            {session && (
              <Link
                to="/reviews"
                className="whitespace-nowrap text-xs font-medium text-textPrimary"
              >
                รีวิว
              </Link>
            )}

            {session && profile?.role === 'GUIDE' && (
              <>
                <Link
                  to="/guide/incidents"
                  className="whitespace-nowrap text-xs font-medium text-textPrimary"
                >
                  เหตุการณ์ของฉัน
                </Link>

                <Link
                  to="/incidents/new"
                  className="whitespace-nowrap text-xs font-medium text-textPrimary"
                >
                  แจ้งเหตุ
                </Link>
              </>
            )}

            {session && canManageSystem && (
              <Link
                to="/admin"
                className="whitespace-nowrap text-xs font-medium text-primary"
              >
                จัดการระบบ
              </Link>
            )}

            {session ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="
                  whitespace-nowrap
                  text-xs
                  font-medium
                  text-red-500
                "
              >
                ออกจากระบบ
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="whitespace-nowrap text-xs font-medium text-textPrimary"
                >
                  เข้าสู่ระบบ
                </Link>

                <Link
                  to="/register"
                  className="whitespace-nowrap text-xs font-medium text-primary"
                >
                  สมัครสมาชิก
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* CONTENT */}
      <main
        className="
          w-full
          px-[3vw]
          2xl:px-[4vw]
        "
      >
        {children}
      </main>
    </div>
  )
}