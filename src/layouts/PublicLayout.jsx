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
      <nav className="bg-surface border-b border-border px-6 py-4 flex items-center justify-between shadow-sm">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent" />
          <span className="text-primary font-bold text-lg">WU Campus Tour</span>
        </Link>

        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link to="/profile" className="text-sm text-textPrimary hover:text-primary transition">
                {profile?.full_name || 'โปรไฟล์'}
              </Link>
              {profile?.role === 'ADMIN' && (
                <Link to="/admin/users">
                  <Button variant="ghost">จัดการผู้ใช้</Button>
                </Link>
              )}
              <Button variant="secondary" onClick={handleSignOut}>
                ออกจากระบบ
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">เข้าสู่ระบบ</Button>
              </Link>
              <Link to="/register">
                <Button variant="primary">สมัครสมาชิก</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}