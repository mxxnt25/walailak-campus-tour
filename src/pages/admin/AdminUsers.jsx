import { useEffect, useState } from 'react'
import { listAllProfiles, updateUserRole } from '../../services/profileService'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'

const ROLES = ['ADMIN', 'GUIDE', 'VISITOR']

export default function AdminUsers() {
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

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  return (
    <div>
      <h1 className="text-xl font-bold text-primary mb-4">จัดการผู้ใช้</h1>
      <div className="flex flex-col gap-3">
        {users.map((u) => (
          <Card key={u.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{u.full_name}</p>
              <p className="text-sm text-textSecondary">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge color={u.role === 'ADMIN' ? 'danger' : u.role === 'GUIDE' ? 'warning' : 'primary'}>
                {u.role}
              </Badge>
              <select
                value={u.role}
                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                className="rounded-input border border-border px-2 py-1 text-sm bg-surface"
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}