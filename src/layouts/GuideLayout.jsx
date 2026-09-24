import { CalendarDays, ClipboardList, Compass, PlusCircle } from 'lucide-react'
import WorkspaceLayout from './WorkspaceLayout'

const GUIDE_LINKS = [
  { to: '/guide', label: 'ตารางงานของฉัน', icon: CalendarDays, end: true },
  { to: '/guide/incidents', label: 'เหตุการณ์ของฉัน', icon: ClipboardList },
  { to: '/incidents/new', label: 'แจ้งเหตุใหม่', icon: PlusCircle },
]

export default function GuideLayout({ children }) {
  return (
    <WorkspaceLayout
      eyebrow="Guide workspace"
      title="งานนำเที่ยวของฉัน"
      icon={Compass}
      links={GUIDE_LINKS}
    >
      {children}
    </WorkspaceLayout>
  )
}
