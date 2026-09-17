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

    if (result && !result.success) {
      alert(result.error?.message || 'ออกจากระบบไม่สำเร็จ')
      return
    }

    navigate('/login')
  }

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(
    profile?.role
  )

  const displayName =
    profile?.full_name ||
    session?.user?.email ||
    'ผู้ใช้งาน'

  const roleLabel =
    ROLE_LABELS[profile?.role] ||
    profile?.role ||
    'MEMBER'

  const initial = displayName
    .charAt(0)
    .toUpperCase()

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
          bg-white/95
          shadow-sm
          backdrop-blur
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
              className="
                h-11
                w-11
                shrink-0
                object-contain
              "
            />

            <div className="leading-tight">
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
                  text-[10px]
                  font-semibold
                  tracking-[0.18em]
                  text-textSecondary
                "
              >
                CAMPUS TOUR
              </p>
            </div>
          </Link>


          {/* DESKTOP MENU */}
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

            <div className="h-7 w-px bg-border" />


            {/* ACCOUNT */}
            {session ? (
              <div className="flex items-center gap-3">

                {/* PROFILE SUMMARY */}
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
                    hover:bg-gray-50
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
                      border
                      border-border
                      bg-primary/10
                      text-sm
                      font-bold
                      text-primary
                      shadow-sm
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

                  {/* NAME + ROLE */}
                  <div
                    className="
                      hidden
                      max-w-[160px]
                      leading-tight
                      lg:block
                    "
                  >
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


                {/* ADMIN BUTTON */}
                {isAdmin && (
                  <Link to="/admin/users">
                    <Button variant="ghost">
                      จัดการระบบ
                    </Button>
                  </Link>
                )}


                {/* LOGOUT */}
                <Button
                  variant="secondary"
                  onClick={handleSignOut}
                >
                  ออกจากระบบ
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
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
              </div>
            )}
          </div>
        </div>


        {/* MOBILE MENU */}
        <div
          className="
            flex
            items-center
            gap-5
            overflow-x-auto
            border-t
            border-border
            px-4
            py-2
            md:hidden
          "
        >
          <Link
            to="/"
            className="
              whitespace-nowrap
              text-xs
              font-medium
              text-textPrimary
            "
          >
            หน้าแรก
          </Link>

          <Link
            to="/routes"
            className="
              whitespace-nowrap
              text-xs
              font-medium
              text-textPrimary
            "
          >
            เส้นทางท่องเที่ยว
          </Link>

          {session ? (
            <>
              <Link
                to="/my-bookings"
                className="
                  whitespace-nowrap
                  text-xs
                  font-medium
                  text-textPrimary
                "
              >
                การจองของฉัน
              </Link>

              <Link
                to="/reviews"
                className="
                  whitespace-nowrap
                  text-xs
                  font-medium
                  text-textPrimary
                "
              >
                รีวิว
              </Link>

              {profile?.role === 'GUIDE' && (
                <>
                  <Link
                    to="/guide/incidents"
                    className="
                      whitespace-nowrap
                      text-xs
                      font-medium
                      text-textPrimary
                    "
                  >
                    เหตุการณ์ของฉัน
                  </Link>

                  <Link
                    to="/incidents/new"
                    className="
                      whitespace-nowrap
                      text-xs
                      font-medium
                      text-textPrimary
                    "
                  >
                    แจ้งเหตุ
                  </Link>
                </>
              )}

              <Link
                to="/profile"
                className="
                  flex
                  shrink-0
                  items-center
                  gap-2
                  whitespace-nowrap
                  text-xs
                  font-semibold
                  text-primary
                "
              >
                <div
                  className="
                    flex
                    h-7
                    w-7
                    items-center
                    justify-center
                    overflow-hidden
                    rounded-full
                    bg-primary/10
                    text-[10px]
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

                {displayName}
              </Link>

              {isAdmin && (
                <Link
                  to="/admin/users"
                  className="
                    whitespace-nowrap
                    text-xs
                    font-medium
                    text-textPrimary
                  "
                >
                  จัดการระบบ
                </Link>
              )}

              <button
                type="button"
                onClick={handleSignOut}
                className="
                  whitespace-nowrap
                  text-xs
                  font-medium
                  text-red-600
                "
              >
                ออกจากระบบ
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="
                  whitespace-nowrap
                  text-xs
                  font-medium
                  text-textPrimary
                "
              >
                เข้าสู่ระบบ
              </Link>

              <Link
                to="/register"
                className="
                  whitespace-nowrap
                  text-xs
                  font-semibold
                  text-primary
                "
              >
                สมัครสมาชิก
              </Link>
            </>
          )}
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