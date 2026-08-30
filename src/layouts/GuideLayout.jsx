export default function GuideLayout({ children }) {
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-56 bg-surface border-r border-border p-4">
        <span className="text-primary font-bold">Guide</span>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}