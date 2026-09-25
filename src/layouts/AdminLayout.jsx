import {
  CalendarDays,
  Map,
  ScrollText,
  ShieldCheck,
  Star,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import WorkspaceLayout from './WorkspaceLayout'

const ADMIN_LINKS = [
  { to: '/admin/users', label: 'จัดการผู้ใช้', icon: Users },
  { to: '/admin/routes', label: 'จัดการเส้นทาง', icon: Map },
  { to: '/admin/schedules', label: 'ตารางและไกด์', icon: CalendarDays },
  { to: '/admin/incidents', label: 'จัดการเหตุการณ์', icon: TriangleAlert },
  { to: '/admin/reviews', label: 'จัดการรีวิว', icon: Star },
]

export default function AdminLayout({ children }) {
  const { profile } = useAuth()
  const links = profile?.role === 'SUPER_ADMIN'
    ? [...ADMIN_LINKS, { to: '/admin/audit-logs', label: 'ประวัติการดำเนินการ', icon: ScrollText }]
    : ADMIN_LINKS

  return (
    <WorkspaceLayout
      eyebrow="Admin workspace"
      title={profile?.role === 'SUPER_ADMIN' ? 'ระบบจัดการ · Super Admin' : 'ระบบจัดการ'}
      icon={ShieldCheck}
      links={links}
    >
      {children}
    </WorkspaceLayout>
  )
}
