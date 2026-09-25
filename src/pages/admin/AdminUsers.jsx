import AppSelect from '../../components/common/AppSelect'
import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  Users,
  ShieldCheck,
  UserRound,
  UserCog,
  Trash2,
  RefreshCw,
} from 'lucide-react'

import {
  listAllProfiles,
  updateUserRole,
  deleteUserProfile,
} from '../../services/profileService'

import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import ConfirmModal from '../../components/common/ConfirmModal'
import Toast from '../../components/common/Toast'
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

const ROLE_FILTERS = [
  { value: 'ALL', label: 'ทุกสิทธิ์' },
  { value: 'MEMBER', label: 'สมาชิก' },
  { value: 'GUIDE', label: 'ไกด์นำเที่ยว' },
  { value: 'ADMIN', label: 'ผู้ดูแลระบบ' },
  { value: 'SUPER_ADMIN', label: 'ผู้ดูแลระบบสูงสุด' },
]

const STATUS_FILTERS = [
  { value: 'ALL', label: 'ทุกสถานะ' },
  { value: 'ACTIVE', label: 'ใช้งานอยู่' },
  { value: 'DEACTIVATED', label: 'ปิดใช้งาน' },
]

export default function AdminUsers() {
  const { session, profile } = useAuth()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [refreshing, setRefreshing] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  const currentUserId = session?.user?.id
  const currentRole = profile?.role

  async function load(showRefresh = false) {
    if (showRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const result = await listAllProfiles()

      if (!result.success) {
        throw new Error(result.error.message)
      }

      setUsers(result.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  function canManageUser(user) {
    if (user.account_status !== 'ACTIVE') {
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
    if (user.account_status !== 'ACTIVE') {
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

  function handleRoleChange(user, newRole) {
    if (user.id === currentUserId || !canManageUser(user)) {
      setNotice({ tone: 'danger', message: 'คุณไม่มีสิทธิ์เปลี่ยนบทบาทของบัญชีนี้' })
      return
    }
    if (user.role === newRole) return
    if (!getAllowedRoles(user).includes(newRole)) {
      setNotice({ tone: 'danger', message: 'บทบาทที่เลือกไม่อยู่ในสิทธิ์ของคุณ' })
      return
    }
    setPendingAction({ kind: 'role', user, newRole })
  }

  function handleDelete(user) {
    if (user.id === currentUserId) {
      setNotice({ tone: 'danger', message: 'ไม่สามารถจัดการบัญชีที่กำลังใช้งานอยู่ได้' })
      return
    }
    if (user.account_status !== 'ACTIVE' || !canManageUser(user)) {
      setNotice({ tone: 'danger', message: 'คุณไม่มีสิทธิ์จัดการบัญชีนี้' })
      return
    }
    setPendingAction({ kind: 'delete', user })
  }

  async function confirmPendingAction() {
    if (!pendingAction || actionBusy) return
    const { kind, user, newRole } = pendingAction
    setActionBusy(true)
    setNotice(null)
    try {
      // Recheck the original page-level guard. DB policies remain authoritative.
      if (user.id === currentUserId || !canManageUser(user)) {
        throw new Error('คุณไม่มีสิทธิ์จัดการบัญชีนี้')
      }
      const result = kind === 'role'
        ? await updateUserRole(user.id, newRole)
        : await deleteUserProfile(user.id)
      if (!result.success) {
        throw new Error(result.error?.message || 'ดำเนินการไม่สำเร็จ')
      }
      setPendingAction(null)
      await load(true)
      setNotice({
        tone: 'success',
        message: kind === 'role' ? 'เปลี่ยนบทบาทเรียบร้อยแล้ว' : 'จัดการบัญชีเรียบร้อยแล้ว',
      })
    } catch (err) {
      setNotice({ tone: 'danger', message: err?.message || 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่' })
      setPendingAction(null)
    } finally {
      setActionBusy(false)
    }
  }

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return users.filter((user) => {
      const matchesSearch =
        !keyword ||
        (user.full_name || '')
          .toLowerCase()
          .includes(keyword) ||
        (user.email || '')
          .toLowerCase()
          .includes(keyword)

      const matchesRole =
        roleFilter === 'ALL' ||
        user.role === roleFilter

      const matchesStatus =
        statusFilter === 'ALL' ||
        user.account_status === statusFilter

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      )
    })
  }, [
    users,
    search,
    roleFilter,
    statusFilter,
  ])

  const summary = useMemo(() => {
    return {
      total: users.length,
      active: users.filter(
        (user) =>
          user.account_status === 'ACTIVE'
      ).length,
      guides: users.filter(
        (user) => user.role === 'GUIDE'
      ).length,
      admins: users.filter((user) =>
        ['ADMIN', 'SUPER_ADMIN'].includes(
          user.role
        )
      ).length,
    }
  }, [users])

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return <ErrorState message={error} />
  }

  return (
    <div className="space-y-7">
      {/* PAGE HEADER */}
      <div
        className="
          flex
          flex-col
          gap-4
          xl:flex-row
          xl:items-end
          xl:justify-between
        "
      >
        <div>
          <div
            className="
              mb-3
              inline-flex
              items-center
              gap-2
              rounded-full
              bg-primary/10
              px-3
              py-1.5
              text-xs
              font-semibold
              text-primary
            "
          >
            <ShieldCheck size={14} />
            USER MANAGEMENT
          </div>

          <h1
            className="
              text-3xl
              font-bold
              text-textPrimary
            "
          >
            จัดการผู้ใช้
          </h1>

          <p
            className="
              mt-2
              max-w-2xl
              text-sm
              leading-6
              text-textSecondary
            "
          >
            ตรวจสอบข้อมูลผู้ใช้ จัดการสิทธิ์
            และสถานะบัญชีตามระดับสิทธิ์ของผู้ดูแลระบบ
          </p>
        </div>

        <Button
          variant="ghost"
          className="inline-flex items-center gap-2 self-start"
          onClick={() => load(true)}
          disabled={refreshing}
        >
          <RefreshCw
            size={16}
            className={
              refreshing
                ? 'animate-spin'
                : ''
            }
          />
          {refreshing
            ? 'กำลังโหลด...'
            : 'รีเฟรชข้อมูล'}
        </Button>
      </div>

      {/* SUMMARY CARDS */}
      <div
        className="
          grid
          grid-cols-1
          gap-4
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >
        <SummaryCard
          icon={Users}
          label="ผู้ใช้ทั้งหมด"
          value={summary.total}
        />

        <SummaryCard
          icon={UserRound}
          label="บัญชีที่ใช้งาน"
          value={summary.active}
        />

        <SummaryCard
          icon={UserCog}
          label="ไกด์นำเที่ยว"
          value={summary.guides}
        />

        <SummaryCard
          icon={ShieldCheck}
          label="ผู้ดูแลระบบ"
          value={summary.admins}
        />
      </div>

      {/* FILTER BAR */}
      <div
        className="
          rounded-2xl
          border
          border-border
          bg-white
          p-5
          shadow-sm
        "
      >
        <div
          className="
            grid
            grid-cols-1
            gap-4
            lg:grid-cols-[minmax(0,1fr)_220px_220px]
          "
        >
          <div className="relative">
            <Search
              size={18}
              className="
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                text-textSecondary
              "
            />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="ค้นหาจากชื่อหรืออีเมล..."
              className="
                w-full
                rounded-xl
                border
                border-border
                bg-white
                py-3
                pl-11
                pr-4
                text-sm
                text-textPrimary
                outline-none
                transition
                placeholder:text-gray-400
                focus:border-primary
                focus:ring-4
                focus:ring-primary/10
              "
            />
          </div>

          <AppSelect
            aria-label="กรองผู้ใช้ตามบทบาท"
            value={roleFilter}
            onChange={(e) =>
              setRoleFilter(e.target.value)
            }
            className="
              rounded-xl
              border
              border-border
              bg-white
              px-4
              py-3
              text-sm
              text-textPrimary
              outline-none
              transition
              focus:border-primary
              focus:ring-4
              focus:ring-primary/10
            "
          >
            {ROLE_FILTERS.map((item) => (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label}
              </option>
            ))}
          </AppSelect>

          <AppSelect
            aria-label="กรองผู้ใช้ตามสถานะ"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value
              )
            }
            className="
              rounded-xl
              border
              border-border
              bg-white
              px-4
              py-3
              text-sm
              text-textPrimary
              outline-none
              transition
              focus:border-primary
              focus:ring-4
              focus:ring-primary/10
            "
          >
            {STATUS_FILTERS.map((item) => (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label}
              </option>
            ))}
          </AppSelect>
        </div>

        <p
          className="
            mt-4
            text-xs
            text-textSecondary
          "
        >
          แสดง {filteredUsers.length} จาก{' '}
          {users.length} บัญชี
        </p>
      </div>

      {/* USER LIST */}
      <div
        className="
          overflow-hidden
          rounded-2xl
          border
          border-border
          bg-white
          shadow-sm
        "
      >
        <div
          className="
            hidden
            grid-cols-[minmax(260px,1.6fr)_170px_150px_minmax(280px,1fr)]
            gap-4
            border-b
            border-border
            bg-background
            px-6
            py-4
            text-xs
            font-semibold
            uppercase
            tracking-wide
            text-textSecondary
            2xl:grid
          "
        >
          <span>ผู้ใช้งาน</span>
          <span>Role</span>
          <span>สถานะ</span>
          <span className="text-right">
            การจัดการ
          </span>
        </div>

        {filteredUsers.map((user) => {
          const allowedRoles =
            getAllowedRoles(user)
          const isCurrentUser =
            user.id === currentUserId
          const manageable =
            canManageUser(user) && !isCurrentUser
          const isInactive =
            user.account_status ===
            'DEACTIVATED'

          const initial = (
            user.full_name || '?'
          )
            .charAt(0)
            .toUpperCase()

          return (
            <div
              key={user.id}
              className={`
                grid
                grid-cols-1
                gap-4
                border-b
                border-border
                px-6
                py-5
                transition
                last:border-b-0
                2xl:grid-cols-[minmax(220px,1.4fr)_130px_130px_minmax(430px,1fr)]
                2xl:items-center
                ${
                  isInactive
                    ? 'bg-gray-50/80 opacity-70'
                    : 'hover:bg-background/60'
                }
              `}
            >
              {/* USER */}
              <div
                className="
                  flex
                  min-w-0
                  items-center
                  gap-3
                "
              >
                <div
                  className="
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    overflow-hidden
                    rounded-full
                    border
                    border-border
                    bg-primary/10
                    text-sm
                    font-bold
                    text-primary
                  "
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="
                        h-full
                        w-full
                        object-cover
                      "
                    />
                  ) : (
                    initial
                  )}
                </div>

                <div className="min-w-0">
                  <div
                    className="
                      flex
                      flex-wrap
                      items-center
                      gap-2
                    "
                  >
                    <p
                      className="
                        truncate
                        font-semibold
                        text-textPrimary
                      "
                    >
                      {user.full_name ||
                        'ไม่ระบุชื่อ'}
                    </p>

                    {isCurrentUser && (
                      <span
                        className="
                          rounded-full
                          bg-primary/10
                          px-2
                          py-0.5
                          text-[10px]
                          font-semibold
                          text-primary
                        "
                      >
                        คุณ
                      </span>
                    )}
                  </div>

                  <p
                    className="
                      mt-1
                      truncate
                      text-sm
                      text-textSecondary
                    "
                  >
                    {user.email}
                  </p>
                </div>
              </div>

              {/* ROLE */}
              <div>
                <Badge
                  color={
                    ROLE_COLORS[user.role]
                  }
                >
                  {ROLE_LABELS[user.role] ||
                    user.role}
                </Badge>
              </div>

              {/* STATUS */}
              <div>
                {isInactive ? (
                  <span
                    className="
                      inline-flex
                      rounded-full
                      bg-gray-200
                      px-3
                      py-1
                      text-xs
                      font-semibold
                      text-gray-600
                    "
                  >
                    ปิดใช้งาน
                  </span>
                ) : (
                  <span
                    className="
                      inline-flex
                      rounded-full
                      bg-green-50
                      px-3
                      py-1
                      text-xs
                      font-semibold
                      text-green-700
                    "
                  >
                    ใช้งานอยู่
                  </span>
                )}
              </div>

              {/* ACTIONS */}
              <div
                className="
                  flex
                  flex-col
                  gap-2
                  sm:flex-row
                  sm:flex-wrap
                  sm:items-center
                  2xl:flex-nowrap
                  2xl:justify-end
                "
              >
                {isInactive ? (
                  <span
                    className="
                      text-sm
                      text-textSecondary
                    "
                  >
                    บัญชีถูกปิดใช้งานแล้ว
                  </span>
                ) : manageable &&
                  allowedRoles.length > 0 ? (
                  <AppSelect
                    aria-label={`เปลี่ยนบทบาทของ ${user.full_name || user.email || 'ผู้ใช้'}`}
                    value={user.role}
                    disabled={actionBusy || Boolean(pendingAction)}
                    onChange={(e) =>
                      handleRoleChange(
                        user,
                        e.target.value
                      )
                    }
                    className="
                      min-w-[220px]
                      sm:w-[220px]
                      rounded-xl
                      border
                      border-border
                      bg-white
                      px-3
                      py-2.5
                      text-sm
                      text-textPrimary
                      outline-none
                      transition
                      focus:border-primary
                      focus:ring-4
                      focus:ring-primary/10
                    "
                  >
                    {allowedRoles.map(
                      (role) => (
                        <option
                          key={role}
                          value={role}
                        >
                          {ROLE_LABELS[
                            role
                          ] || role}
                        </option>
                      )
                    )}
                  </AppSelect>
                ) : (
                  <span
                    className="
                      text-xs
                      text-textSecondary
                    "
                  >
                    ไม่มีสิทธิ์แก้ไข
                  </span>
                )}

                {!isInactive &&
                  manageable &&
                  !isCurrentUser && (
                    <button
                      type="button"
                      disabled={actionBusy || Boolean(pendingAction)}
                      onClick={() =>
                        handleDelete(user)
                      }
                      className="
                        inline-flex
                        w-full
                        shrink-0
                        sm:w-auto
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        border
                        border-red-200
                        bg-white
                        px-3
                        py-2.5
                        text-sm
                        font-semibold
                        text-red-600
                        transition
                        hover:bg-red-50
                      "
                    >
                      <Trash2 size={16} />
                      ลบ / ปิดใช้งาน
                    </button>
                  )}
              </div>
            </div>
          )
        })}

        {filteredUsers.length === 0 && (
          <div
            className="
              px-6
              py-16
              text-center
            "
          >
            <Users
              size={38}
              className="
                mx-auto
                mb-4
                text-textSecondary
              "
            />

            <p
              className="
                font-semibold
                text-textPrimary
              "
            >
              ไม่พบผู้ใช้
            </p>

            <p
              className="
                mt-1
                text-sm
                text-textSecondary
              "
            >
              ลองเปลี่ยนคำค้นหา
              หรือตัวกรองแล้วลองอีกครั้ง
            </p>
          </div>
        )}
      </div>

      {/* PERMISSION NOTE */}
      <div
        className="
          rounded-2xl
          border
          border-primary/20
          bg-primary/5
          p-5
        "
      >
        <div
          className="
            flex
            items-start
            gap-3
          "
        >
          <ShieldCheck
            size={19}
            className="
              mt-0.5
              shrink-0
              text-primary
            "
          />

          <div>
            <p
              className="
                text-sm
                font-semibold
                text-textPrimary
              "
            >
              ขอบเขตสิทธิ์การจัดการ
            </p>

            <p
              className="
                mt-1
                text-sm
                leading-6
                text-textSecondary
              "
            >
              ADMIN สามารถเปลี่ยนสิทธิ์ได้เฉพาะ
              MEMBER และ GUIDE ส่วน SUPER_ADMIN
              สามารถจัดการสิทธิ์ระดับผู้ดูแลได้
              ระบบจะไม่อนุญาตให้จัดการบัญชีของตัวเอง
              และบัญชีที่ถูกปิดใช้งานจะไม่สามารถแก้ไข Role ได้
            </p>
          </div>
        </div>
      </div>
      <Toast
        message={notice?.message || ''}
        tone={notice?.tone || 'success'}
        onClose={() => setNotice(null)}
      />
      <ConfirmModal
        open={Boolean(pendingAction)}
        title={pendingAction?.kind === 'role' ? 'ยืนยันเปลี่ยนบทบาท' : 'ยืนยันจัดการบัญชี'}
        description={pendingAction?.kind === 'role'
          ? `เปลี่ยนบทบาทของ ${pendingAction.user.full_name || pendingAction.user.email} จาก ${ROLE_LABELS[pendingAction.user.role] || pendingAction.user.role} เป็น ${ROLE_LABELS[pendingAction.newRole] || pendingAction.newRole}?`
          : `จัดการบัญชี ${pendingAction?.user.full_name || pendingAction?.user.email || ''}?\nบัญชีที่มีประวัติจะถูกปิดใช้งานเพื่อเก็บข้อมูล ส่วนบัญชีที่ไม่มีประวัติอาจถูกลบถาวร`}
        confirmLabel={pendingAction?.kind === 'role' ? 'เปลี่ยนบทบาท' : 'ลบ / ปิดใช้งาน'}
        confirmVariant={pendingAction?.kind === 'delete' ? 'danger' : 'primary'}
        busy={actionBusy}
        onCancel={() => { if (!actionBusy) setPendingAction(null) }}
        onConfirm={confirmPendingAction}
      />
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-border
        bg-white
        p-5
        shadow-sm
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          gap-4
        "
      >
        <div>
          <p
            className="
              text-sm
              text-textSecondary
            "
          >
            {label}
          </p>

          <p
            className="
              mt-2
              text-2xl
              font-bold
              text-textPrimary
            "
          >
            {value}
          </p>
        </div>

        <div
          className="
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-xl
            bg-primary/10
            text-primary
          "
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}
