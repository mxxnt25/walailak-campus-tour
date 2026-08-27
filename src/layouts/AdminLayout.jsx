import { Link, useNavigate } from 'react-router-dom'
import { signOut } from '../services/authService'
import Button from '../components/common/Button'

export default function AdminLayout({ children }) {
  const navigate = useNavigate()
  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-56 bg-surface border-r border-border p-4 flex flex-col">
        <span className="text-primary font-bold mb-6">⚙️ Admin</span>
        <nav className="flex flex-col gap-1 flex-1">
          <Link to="/admin/users" className="px-3 py-2 rounded-button text-sm text-textPrimary hover:bg-background">
            👥 จัดการผู้ใช้
          </Link>
          <Link to="/profile" className="px-3 py-2 rounded-button text-sm text-textPrimary hover:bg-background">
            👤 โปรไฟล์ของฉัน
          </Link>
        </nav>
        <Button variant="secondary" onClick={handleSignOut}>ออกจากระบบ</Button>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}