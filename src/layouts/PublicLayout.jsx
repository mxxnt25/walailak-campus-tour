export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-surface border-b border-border px-6 py-4">
        <span className="text-primary font-bold">WU Campus Tour</span>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}