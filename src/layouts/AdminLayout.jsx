import { Link, useNavigate } from 'react-router-dom'
import { Home } from 'lucide-react'

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

      {/* SIDEBAR */}
      <aside className="w-56 bg-surface border-r border-border p-4 flex flex-col">

        {/* HEADER */}
        <span className="text-primary font-bold mb-4">
          ⚙️ Admin
        </span>

        {/* กลับหน้าแรก */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="
            flex
            items-center
            gap-2
            px-3
            py-2
            mb-4
            rounded-button
            text-sm
            text-textSecondary
            text-left
            transition
            hover:bg-background
            hover:text-primary
          "
        >
          <Home size={16} />
          กลับหน้าแรก
        </button>

        {/* MENU */}
        <nav className="flex flex-col gap-1 flex-1">

          <Link
            to="/admin/users"
            className="
              px-3
              py-2
              rounded-button
              text-sm
              text-textPrimary
              hover:bg-background
            "
          >
            👥 จัดการผู้ใช้
          </Link>

          <Link
            to="/admin/routes"
            className="
              px-3
              py-2
              rounded-button
              text-sm
              text-textPrimary
              hover:bg-background
            "
          >
            🗺️ จัดการเส้นทาง
          </Link>

          <Link
            to="/profile"
            className="
              px-3
              py-2
              rounded-button
              text-sm
              text-textPrimary
              hover:bg-background
            "
          >
            👤 โปรไฟล์ของฉัน
          </Link>
        </nav>

        {/* LOGOUT */}
        <Button
          variant="secondary"
          onClick={handleSignOut}
        >
          ออกจากระบบ
        </Button>

      </aside>

      {/* CONTENT */}
      <main className="flex-1 p-6">
        {children}
      </main>

    </div>
  )
}