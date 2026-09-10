import { Link } from 'react-router-dom'

export default function GuideLayout({ children }) {
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-56 bg-surface border-r border-border p-4">
        <span className="text-primary font-bold">Guide</span>

        <nav className="mt-6 flex flex-col gap-2">
          <Link
            to="/"
            className="
              px-3
              py-2
              rounded-button
              text-sm
              text-textPrimary
              hover:bg-background
            "
          >
            ← กลับหน้าแรก
          </Link>

          <Link
            to="/guide/incidents"
            className="
              px-3
              py-2
              rounded-button
              text-sm
              text-textPrimary
              hover:bg-background
            "
          >
            🚨 เหตุการณ์ของฉัน
          </Link>

          <Link
            to="/incidents/new"
            className="
              px-3
              py-2
              rounded-button
              text-sm
              text-textPrimary
              hover:bg-background
            "
          >
            ➕ แจ้งเหตุใหม่
          </Link>
        </nav>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
