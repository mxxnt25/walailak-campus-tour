// The shared header stays mounted in App; this wrapper holds each page's
// content. Guide/Admin add a role-specific sidebar inside WorkspaceLayout.
export default function PublicLayout({ children }) {
  return (
    <div className="min-h-[calc(100vh-72px)] bg-background">
      <main id="main-content" className="w-full px-[3vw] 2xl:px-[4vw]">
        {children}
      </main>
    </div>
  )
}
