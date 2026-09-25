import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Menu, UserRound } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { signOut } from '../../services/authService'

const ROLE_LABELS = {
  MEMBER: 'สมาชิก',
  GUIDE: 'ไกด์นำเที่ยว',
  ADMIN: 'ผู้ดูแลระบบ',
  SUPER_ADMIN: 'ผู้ดูแลระบบสูงสุด',
}

const baseLinks = [
  { to: '/', label: 'หน้าแรก', end: true },
  { to: '/routes', label: 'เส้นทางท่องเที่ยว' },
]

function getPrimaryLinks(role) {
  if (role === 'MEMBER') return [...baseLinks, { to: '/my-bookings', label: 'การจองของฉัน' }]
  if (role === 'GUIDE') return [...baseLinks, { to: '/guide', label: 'งานนำเที่ยว' }]
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return [...baseLinks, { to: '/admin', label: 'จัดการระบบ' }]
  }
  return baseLinks
}

const desktopLinkClass = ({ isActive }) =>
  `rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${isActive ? 'bg-primary/10 text-primary' : 'text-textPrimary hover:bg-background hover:text-primary'}`

const mobileLinkClass = ({ isActive }) =>
  `block rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${isActive ? 'bg-primary/10 text-primary' : 'text-textPrimary hover:bg-background'}`

export default function SiteHeader() {
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const desktopAccountRef = useRef(null)
  const mobileMenuRef = useRef(null)
  const [signOutError, setSignOutError] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  const displayName = profile?.full_name?.trim() || profile?.email || 'ผู้ใช้งาน'
  const roleLabel = ROLE_LABELS[profile?.role] || 'สมาชิก'
  const initial = displayName.charAt(0).toUpperCase()
  const links = getPrimaryLinks(session ? profile?.role : null)

  function closeMenus() {
    if (desktopAccountRef.current) desktopAccountRef.current.open = false
    if (mobileMenuRef.current) mobileMenuRef.current.open = false
  }

  useEffect(() => {
    function handlePointerDown(event) {
      for (const menu of [desktopAccountRef.current, mobileMenuRef.current]) {
        if (menu?.open && !menu.contains(event.target)) menu.open = false
      }
    }
    function handleEscape(event) {
      if (event.key === 'Escape') {
        if (desktopAccountRef.current) desktopAccountRef.current.open = false
        if (mobileMenuRef.current) mobileMenuRef.current.open = false
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    setSignOutError('')
    try {
      const result = await signOut()
      if (result?.success === false) {
        setSignOutError(result.error?.message || 'ออกจากระบบไม่สำเร็จ กรุณาลองใหม่')
        return
      }
      closeMenus()
      navigate('/login', { replace: true })
    } catch {
      setSignOutError('ออกจากระบบไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setSigningOut(false)
    }
  }

  const avatar = (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold text-primary">
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
      ) : initial}
    </span>
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white shadow-sm">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-[60] focus:rounded-lg focus:bg-white focus:p-3 focus:text-primary">
        ข้ามไปยังเนื้อหา
      </a>
      <div className="mx-auto flex h-[72px] w-full max-w-[1520px] items-center justify-between gap-4 px-[3vw] 2xl:px-[4vw]">
        <Link to="/" onClick={closeMenus} className="flex shrink-0 items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label="Walailak Campus Tour หน้าแรก">
          <img src="/images/wu-logo.jpg" alt="" className="h-10 w-10 shrink-0 object-contain" />
          <span className="leading-tight">
            <span className="block text-sm font-bold text-primary">WALAILAK</span>
            <span className="block text-[10px] font-semibold text-textSecondary">CAMPUS TOUR</span>
          </span>
        </Link>

        <nav aria-label="เมนูหลัก" className="ml-auto hidden items-center gap-1 xl:flex">
          {links.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={desktopLinkClass}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-3 border-l border-border pl-4 xl:flex">
          {session ? (
            <details ref={desktopAccountRef} className="group relative">
              <summary className="flex max-w-[230px] cursor-pointer list-none items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden" aria-label={`บัญชีผู้ใช้ ${displayName}`}>
                {avatar}
                <span className="min-w-0 text-left leading-tight">
                  <span className="block truncate text-sm font-semibold text-textPrimary">{displayName}</span>
                  <span className="block truncate text-xs text-primary">{roleLabel}</span>
                </span>
                <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-textSecondary transition group-open:rotate-180" />
              </summary>
              <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-border bg-white p-2 shadow-xl">
                <NavLink to="/profile" onClick={closeMenus} className={mobileLinkClass}>
                  <span className="flex items-center gap-2"><UserRound size={17} aria-hidden="true" /> บัญชีของฉัน</span>
                </NavLink>
                <button type="button" disabled={signingOut} onClick={handleSignOut} className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-semibold text-danger transition hover:bg-danger/10 disabled:opacity-50">
                  <LogOut size={17} aria-hidden="true" /> {signingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}
                </button>
                {signOutError && <p role="alert" className="px-3 pb-2 text-xs text-danger">{signOutError}</p>}
              </div>
            </details>
          ) : (
            <>
              <Link to="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-textPrimary hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">เข้าสู่ระบบ</Link>
              <Link to="/register" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">สมัครสมาชิก</Link>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 xl:hidden">
          {!session && <Link to="/register" onClick={closeMenus} className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white">สมัครสมาชิก</Link>}
          <details ref={mobileMenuRef} className="group relative">
            <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-border text-textPrimary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden" aria-label="เปิดเมนูนำทาง">
              <Menu size={22} aria-hidden="true" />
            </summary>
            <div className="absolute right-0 top-full z-50 mt-3 w-[min(88vw,320px)] rounded-2xl border border-border bg-white p-3 shadow-xl">
              {session && (
                <div className="mb-2 flex min-w-0 items-center gap-3 border-b border-border px-2 pb-3">
                  {avatar}
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold">{displayName}</span><span className="block text-xs text-primary">{roleLabel}</span></span>
                </div>
              )}
              <nav aria-label="เมนูมือถือ" className="space-y-1">
                {links.map(({ to, label, end }) => (
                  <NavLink key={to} to={to} end={end} onClick={closeMenus} className={mobileLinkClass}>{label}</NavLink>
                ))}
              </nav>
              <div className="mt-2 border-t border-border pt-2">
                {session ? (
                  <>
                    <NavLink to="/profile" onClick={closeMenus} className={mobileLinkClass}>บัญชีของฉัน</NavLink>
                    <button type="button" disabled={signingOut} onClick={handleSignOut} className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-50">{signingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}</button>
                    {signOutError && <p role="alert" className="px-3 text-xs text-danger">{signOutError}</p>}
                  </>
                ) : (
                  <Link to="/login" onClick={closeMenus} className="block rounded-xl px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/10">เข้าสู่ระบบ</Link>
                )}
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  )
}
