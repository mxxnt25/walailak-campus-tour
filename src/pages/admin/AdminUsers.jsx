import { useEffect, useState } from 'react'
import {
  listAllProfiles,
  updateUserRole,
  deleteUserProfile,
} from '../../services/profileService'

import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'
import { useAuth } from '../../hooks/useAuth'

const ORDINARY_ROLES = ['MEMBER', 'GUIDE']

const ALL_ROLES = [
  'MEMBER',
  'GUIDE',
  'ADMIN',
  'SUPER_ADMIN',
]

const ROLE_LABELS = {
  MEMBER: 'สมาชิก',
  GUIDE: 'ไกด์นำเที่ยว',
  ADMIN: 'ผู้ดูแลระบบ',
  SUPER_ADMIN: 'ผู้ดูแลระบบสูงสุด',
}

const ROLE_COLORS = {
  MEMBER: 'primary',
  GUIDE: 'warning',
  ADMIN: 'danger',
  SUPER_ADMIN: 'danger',
}

export default function AdminUsers() {
  const { session, profile } = useAuth()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const currentUserId = session?.user?.id
  const currentRole = profile?.role

  async function load() {
    setLoading(true)
    setError('')

    try {
      const data = await listAllProfiles()
      setUsers(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function canManageUser(user) {
    if (!user.is_active) {
      return false
    }

    if (currentRole === 'SUPER_ADMIN') {
      return true
    }

    if (currentRole === 'ADMIN') {
      return ['MEMBER', 'GUIDE'].includes(user.role)
    }

    return false
  }

  function getAllowedRoles(user) {
    if (!user.is_active) {
      return []
    }

    if (currentRole === 'SUPER_ADMIN') {
      return ALL_ROLES
    }

    if (
      currentRole === 'ADMIN' &&
      ['MEMBER', 'GUIDE'].includes(user.role)
    ) {
      return ORDINARY_ROLES
    }

    return []
  }

  async function handleRoleChange(user, newRole) {
    if (!canManageUser(user)) {
      alert('คุณไม่มีสิทธิ์เปลี่ยน Role ของบัญชีนี้')
      return
    }

    if (user.role === newRole) return

    const confirmed = window.confirm(
      `ยืนยันเปลี่ยน Role ของ "${user.full_name}" จาก ${user.role} เป็น ${newRole}?`
    )

    if (!confirmed) return

    try {
      await updateUserRole(user.id, newRole)
      await load()
    } catch (err) {
      alert('เปลี่ยน Role ไม่สำเร็จ: ' + err.message)
    }
  }

  async function handleDelete(user) {
    if (user.id === currentUserId) {
      alert('ไม่สามารถจัดการบัญชีที่กำลังใช้งานอยู่ได้')
      return
    }

    if (!user.is_active) {
      alert('บัญชีนี้ถูกปิดใช้งานแล้ว')
      return
    }

    if (!canManageUser(user)) {
      alert('คุณไม่มีสิทธิ์จัดการบัญชีนี้')
      return
    }

    const confirmed = window.confirm(
      `ยืนยันจัดการบัญชี "${user.full_name}" (${user.email})?\n\n` +
      'หากบัญชีไม่มีประวัติการใช้งาน ระบบจะลบบัญชีถาวร\n' +
      'หากมีประวัติ Booking / Review / Assignment / Incident ระบบจะเก็บประวัติและปิดการใช้งานบัญชีแทน'
    )

    if (!confirmed) return

    try {
      await deleteUserProfile(user.id)
      await load()
    } catch (err) {
      alert('จัดการบัญชีไม่สำเร็จ: ' + err.message)
    }
  }

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return <ErrorState message={error} />
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">
          จัดการผู้ใช้
        </h1>

        <p className="text-textSecondary text-sm mt-1">
          ทั้งหมด {users.length} บัญชี
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {users.map((user) => {
          const allowedRoles = getAllowedRoles(user)
          const manageable = canManageUser(user)
          const isCurrentUser = user.id === currentUserId
          const isInactive = user.is_active === false

          return (
            <Card
              key={user.id}
              className={`
                flex
                items-center
                justify-between
                transition
                ${
                  isInactive
                    ? 'opacity-60 bg-gray-50'
                    : 'hover:shadow-md'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div
                  className="
                    w-10
                    h-10
                    rounded-full
                    bg-primary/10
                    text-primary
                    flex
                    items-center
                    justify-center
                    font-bold
                  "
                >
                  {(user.full_name || '?')
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-textPrimary">
                      {user.full_name}
                    </p>

                    {isCurrentUser && (
                      <span className="text-xs text-textSecondary">
                        (คุณ)
                      </span>
                    )}

                    {isInactive && (
                      <span
                        className="
                          text-xs
                          font-medium
                          bg-gray-200
                          text-gray-600
                          px-2
                          py-1
                          rounded-full
                        "
                      >
                        ปิดใช้งานแล้ว
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-textSecondary">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge color={ROLE_COLORS[user.role]}>
                  {ROLE_LABELS[user.role] || user.role}
                </Badge>

                {isInactive ? (
                  <span className="text-sm text-textSecondary px-2">
                    บัญชีถูกปิดใช้งาน
                  </span>
                ) : manageable && allowedRoles.length > 0 ? (
                  <select
                    value={user.role}
                    onChange={(e) =>
                      handleRoleChange(
                        user,
                        e.target.value
                      )
                    }
                    className="
                      rounded-input
                      border
                      border-border
                      px-2
                      py-1.5
                      text-sm
                      bg-surface
                      focus:outline-none
                      focus:ring-2
                      focus:ring-primary
                    "
                  >
                    {allowedRoles.map((role) => (
                      <option
                        key={role}
                        value={role}
                      >
                        {ROLE_LABELS[role] || role}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-textSecondary px-2">
                    ไม่มีสิทธิ์แก้ไข
                  </span>
                )}

                {!isInactive &&
                  manageable &&
                  !isCurrentUser && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        handleDelete(user)
                      }
                    >
                      🗑️ Delete / Deactivate
                    </Button>
                  )}
              </div>
            </Card>
          )
        })}

        {users.length === 0 && (
          <p className="text-center text-textSecondary py-10">
            ยังไม่มีผู้ใช้ในระบบ
          </p>
        )}
      </div>
    </div>
  )
}