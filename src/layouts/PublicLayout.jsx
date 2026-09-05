import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { signOut } from '../services/authService'
import Button from '../components/common/Button'

export default function PublicLayout({ children }) {
  const { session, profile } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

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

          {/* LOGO - ซ้ายสุด */}
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


          {/* ทุกอย่างฝั่งขวา */}
          <div
            className="
              ml-auto
              hidden
              items-center
              gap-6
              md:flex
            "
          >

            {/* เมนู */}
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

                <Link
                  to="/profile"
                  className="
                    text-sm
                    font-medium
                    text-textPrimary
                    transition
                    hover:text-primary
                  "
                >
                  โปรไฟล์
                </Link>
              </>
            )}


            {/* เส้นแบ่งก่อนปุ่มบัญชี */}
            <div className="h-6 w-px bg-border" />


            {/* ACCOUNT */}
            {session ? (
              <>
                {profile?.role === 'ADMIN' && (
                  <Link to="/admin/users">
                    <Button variant="ghost">
                      จัดการระบบ
                    </Button>
                  </Link>
                )}

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


        {/* จอเล็ก */}
        <div
          className="
            flex
            items-center
            justify-end
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

          {session && (
            <>
              <Link
                to="/my-bookings"
                className="whitespace-nowrap text-xs font-medium text-textPrimary"
              >
                การจองของฉัน
              </Link>

              <Link
                to="/reviews"
                className="whitespace-nowrap text-xs font-medium text-textPrimary"
              >
                รีวิว
              </Link>

              <Link
                to="/profile"
                className="whitespace-nowrap text-xs font-medium text-textPrimary"
              >
                โปรไฟล์
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