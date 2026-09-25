import { NavLink } from 'react-router-dom'
import PublicLayout from './PublicLayout'

function workspaceLinkClass({ isActive }) {
  return [
    'inline-flex min-w-0 items-center gap-2 rounded-button px-3 py-2.5 lg:w-full',
    'text-sm font-medium transition-colors focus-visible:outline',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    isActive
      ? 'bg-primary text-white shadow-sm'
      : 'text-textPrimary hover:bg-primary/10 hover:text-primary',
  ].join(' ')
}

// The public header and the workspace navigation are shared across Guide and Admin.
// RoleGuard remains in App.jsx; this component is presentation only.
export default function WorkspaceLayout({ title, eyebrow, icon: Icon, links, children }) {
  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-[1440px] py-6 sm:py-8">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
          <aside
            aria-label={`เมนู${title}`}
            className="h-fit min-w-0 rounded-card border border-border bg-surface p-4 shadow-sm lg:sticky lg:top-24"
          >
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {eyebrow}
                </p>
                <p className="text-sm font-semibold text-textPrimary">{title}</p>
              </div>
            </div>
            <nav
              aria-label={`เมนู${title}`}
              className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:flex-col"
            >
              {links.map(({ to, label, icon: LinkIcon, end }) => (
                <NavLink key={to} to={to} end={end} className={workspaceLinkClass}>
                  <LinkIcon size={18} aria-hidden="true" className="shrink-0" />
                  <span className="min-w-0 leading-snug">{label}</span>
                </NavLink>
              ))}
            </nav>
          </aside>
          <section className="min-w-0" aria-label={`เนื้อหา${title}`}>
            {children}
          </section>
        </div>
      </div>
    </PublicLayout>
  )
}
