import { useEffect, useState } from 'react'
import { listAllProfiles, updateUserRole, deleteUserProfile } from '../../services/profileService'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'
import { useAuth } from '../../hooks/useAuth'

const ROLES = ['ADMIN', 'GUIDE', 'VISITOR']
const ROLE_COLORS = { ADMIN: 'danger', GUIDE: 'warning', VISITOR: 'primary' }

export default function AdminUsers() {
  const { session } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const data = await listAllProfiles()
      setUsers(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleRoleChange(userId, newRole) {
    try {
      await updateUserRole(userId, newRole)
      load()
    } catch (err) {
      alert('เปลี่ยน role ไม่สำเร็จ: ' + err.message)
    }
  }

  async function handleDelete(user) {
    if (user.id === session?.user?.id) {
      alert('ไม่สามารถลบบัญชีตัวเองได้')
      return
    }
    const confirmed = window.confirm(`ยืนยันลบผู้ใช้ "${user.full_name}" (${user.email})? การลบนี้ไม่สามารถย้อนกลับได้`)
    if (!confirmed) return
    try {
      await deleteUserProfile(user.id)
      load()
    } catch (err) {
      alert('ลบไม่สำเร็จ: ' + err.message)
    }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">จัดการผู้ใช้</h1>
        <p className="text-textSecondary text-sm mt-1">ทั้งหมด {users.length} บัญชี</p>
      </div>

      <div className="flex flex-col gap-3">
        {users.map((u) => (
          <Card key={u.id} className="flex items-center justify-between hover:shadow-md transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                {(u.full_name || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-textPrimary">{u.full_name}</p>
                <p className="text-sm text-textSecondary">{u.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge color={ROLE_COLORS[u.role]}>{u.role}</Badge>
              <select
                value={u.role}
                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                className="rounded-input border border-border px-2 py-1.5 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <Button variant="danger" size="sm" onClick={() => handleDelete(u)}>
                🗑️ Delete
              </Button>
            </div>
          </Card>
        ))}

        {users.length === 0 && (
          <p className="text-center text-textSecondary py-10">ยังไม่มีผู้ใช้ในระบบ</p>
        )}
      </div>
    </div>
  )
}