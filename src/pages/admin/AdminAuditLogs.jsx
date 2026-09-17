import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  ShieldCheck,
  ScrollText,
  RefreshCw,
  UserCog,
  UserRoundX,
  Trash2,
  ArrowRightLeft,
} from 'lucide-react'

import { listAuditLogs } from '../../services/auditService'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'
import Button from '../../components/common/Button'

const ACTION_LABELS = {
  USER_ROLE_CHANGED: 'เปลี่ยน Role',
  ADMIN_GRANTED: 'แต่งตั้ง Admin',
  ADMIN_REVOKED: 'ยกเลิกสิทธิ์ Admin',
  USER_DELETED: 'ลบบัญชี',
  USER_DEACTIVATED: 'ปิดใช้งานบัญชี',
}

const ACTION_STYLES = {
  USER_ROLE_CHANGED:
    'bg-blue-50 text-blue-700 border-blue-200',

  ADMIN_GRANTED:
    'bg-purple-50 text-purple-700 border-purple-200',

  ADMIN_REVOKED:
    'bg-orange-50 text-orange-700 border-orange-200',

  USER_DELETED:
    'bg-red-50 text-red-700 border-red-200',

  USER_DEACTIVATED:
    'bg-gray-100 text-gray-700 border-gray-200',
}

const ACTION_FILTERS = [
  { value: 'ALL', label: 'ทุกการดำเนินการ' },
  { value: 'USER_ROLE_CHANGED', label: 'เปลี่ยน Role' },
  { value: 'ADMIN_GRANTED', label: 'แต่งตั้ง Admin' },
  { value: 'ADMIN_REVOKED', label: 'ยกเลิกสิทธิ์ Admin' },
  { value: 'USER_DELETED', label: 'ลบบัญชี' },
  { value: 'USER_DEACTIVATED', label: 'ปิดใช้งานบัญชี' },
]

function formatData(data) {
  if (!data) return '-'

  if (
    data.role &&
    data.account_status
  ) {
    return `${data.role} / ${data.account_status}`
  }

  if (data.role) {
    return data.role
  }

  if (data.account_status) {
    return data.account_status
  }

  try {
    return JSON.stringify(data)
  } catch {
    return '-'
  }
}

function formatDate(value) {
  if (!value) return '-'

  return new Date(value).toLocaleString(
    'th-TH',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  )
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] =
    useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] =
    useState('ALL')

  async function load(showRefresh = false) {
    if (showRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const data = await listAuditLogs()
      setLogs(data || [])
    } catch (err) {
      setError(
        err?.message ||
          'ไม่สามารถโหลด Audit Logs ได้'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filteredLogs = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase()

    return logs.filter((log) => {
      const matchesAction =
        actionFilter === 'ALL' ||
        log.action === actionFilter

      const searchableText = [
        ACTION_LABELS[log.action],
        log.action,
        log.actor_id,
        log.target_id,
        log.target_type,
        formatData(log.old_data),
        formatData(log.new_data),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch =
        !keyword ||
        searchableText.includes(keyword)

      return matchesAction && matchesSearch
    })
  }, [logs, search, actionFilter])

  const summary = useMemo(() => {
    return {
      total: logs.length,
      roleChanges: logs.filter(
        (log) =>
          log.action ===
          'USER_ROLE_CHANGED'
      ).length,
      deactivated: logs.filter(
        (log) =>
          log.action ===
          'USER_DEACTIVATED'
      ).length,
      deleted: logs.filter(
        (log) =>
          log.action === 'USER_DELETED'
      ).length,
    }
  }, [logs])

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
            SUPER ADMIN ONLY
          </div>

          <h1
            className="
              text-3xl
              font-bold
              text-textPrimary
            "
          >
            Audit Logs
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
            ตรวจสอบประวัติการดำเนินการที่สำคัญ
            เช่น การเปลี่ยนสิทธิ์ การปิดใช้งาน
            และการลบบัญชีผู้ใช้
          </p>
        </div>

        <Button
          variant="ghost"
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

      {/* SUMMARY */}
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
          icon={ScrollText}
          label="รายการทั้งหมด"
          value={summary.total}
        />

        <SummaryCard
          icon={ArrowRightLeft}
          label="เปลี่ยน Role"
          value={summary.roleChanges}
        />

        <SummaryCard
          icon={UserRoundX}
          label="ปิดใช้งาน"
          value={summary.deactivated}
        />

        <SummaryCard
          icon={Trash2}
          label="ลบบัญชี"
          value={summary.deleted}
        />
      </div>

      {/* FILTERS */}
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
            lg:grid-cols-[minmax(0,1fr)_260px]
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
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="ค้นหา Action, Actor ID หรือ Target ID..."
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

          <select
            value={actionFilter}
            onChange={(event) =>
              setActionFilter(
                event.target.value
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
            {ACTION_FILTERS.map(
              (item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              )
            )}
          </select>
        </div>

        <p
          className="
            mt-4
            text-xs
            text-textSecondary
          "
        >
          แสดง {filteredLogs.length} จาก{' '}
          {logs.length} รายการ
        </p>
      </div>

      {/* AUDIT TABLE */}
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
        {filteredLogs.length === 0 ? (
          <div
            className="
              px-6
              py-16
              text-center
            "
          >
            <ScrollText
              size={40}
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
              ไม่พบประวัติการดำเนินการ
            </p>

            <p
              className="
                mt-1
                text-sm
                text-textSecondary
              "
            >
              ลองเปลี่ยนคำค้นหาหรือตัวกรอง
              แล้วลองอีกครั้ง
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="
                w-full
                min-w-[1100px]
                text-sm
              "
            >
              <thead>
                <tr
                  className="
                    border-b
                    border-border
                    bg-background
                    text-left
                    text-xs
                    uppercase
                    tracking-wide
                    text-textSecondary
                  "
                >
                  <th
                    className="
                      px-6
                      py-4
                      font-semibold
                    "
                  >
                    การดำเนินการ
                  </th>

                  <th
                    className="
                      px-4
                      py-4
                      font-semibold
                    "
                  >
                    ก่อน
                  </th>

                  <th
                    className="
                      px-4
                      py-4
                      font-semibold
                    "
                  >
                    หลัง
                  </th>

                  <th
                    className="
                      px-4
                      py-4
                      font-semibold
                    "
                  >
                    ผู้ดำเนินการ
                  </th>

                  <th
                    className="
                      px-4
                      py-4
                      font-semibold
                    "
                  >
                    เป้าหมาย
                  </th>

                  <th
                    className="
                      px-6
                      py-4
                      font-semibold
                    "
                  >
                    วันเวลา
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredLogs.map(
                  (log) => (
                    <tr
                      key={log.id}
                      className="
                        border-b
                        border-border/60
                        transition
                        last:border-b-0
                        hover:bg-background/60
                      "
                    >
                      {/* ACTION */}
                      <td
                        className="
                          px-6
                          py-5
                          align-top
                        "
                      >
                        <span
                          className={`
                            inline-flex
                            rounded-full
                            border
                            px-3
                            py-1.5
                            text-xs
                            font-semibold
                            ${
                              ACTION_STYLES[
                                log.action
                              ] ||
                              'border-gray-200 bg-gray-50 text-gray-700'
                            }
                          `}
                        >
                          {ACTION_LABELS[
                            log.action
                          ] ||
                            log.action}
                        </span>
                      </td>

                      {/* OLD */}
                      <td
                        className="
                          px-4
                          py-5
                          align-top
                        "
                      >
                        <DataValue
                          value={formatData(
                            log.old_data
                          )}
                        />
                      </td>

                      {/* NEW */}
                      <td
                        className="
                          px-4
                          py-5
                          align-top
                        "
                      >
                        <DataValue
                          value={formatData(
                            log.new_data
                          )}
                        />
                      </td>

                      {/* ACTOR */}
                      <td
                        className="
                          px-4
                          py-5
                          align-top
                        "
                      >
                        <IdValue
                          value={
                            log.actor_id
                          }
                          fallback="SYSTEM"
                        />
                      </td>

                      {/* TARGET */}
                      <td
                        className="
                          px-4
                          py-5
                          align-top
                        "
                      >
                        <div>
                          {log.target_type && (
                            <p
                              className="
                                mb-1
                                text-xs
                                font-semibold
                                text-textPrimary
                              "
                            >
                              {log.target_type}
                            </p>
                          )}

                          <IdValue
                            value={
                              log.target_id
                            }
                          />
                        </div>
                      </td>

                      {/* DATE */}
                      <td
                        className="
                          whitespace-nowrap
                          px-6
                          py-5
                          align-top
                          text-sm
                          text-textSecondary
                        "
                      >
                        {formatDate(
                          log.created_at
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECURITY NOTE */}
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
              Audit Logs เป็นข้อมูลแบบอ่านอย่างเดียว
            </p>

            <p
              className="
                mt-1
                text-sm
                leading-6
                text-textSecondary
              "
            >
              หน้านี้ใช้สำหรับตรวจสอบประวัติการดำเนินการของระบบ
              และถูกจำกัดให้เฉพาะ SUPER_ADMIN
              เพื่อช่วยติดตามการเปลี่ยนแปลงด้านสิทธิ์และบัญชีผู้ใช้
            </p>
          </div>
        </div>
      </div>
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

function DataValue({ value }) {
  return (
    <span
      className="
        inline-block
        max-w-[220px]
        break-words
        rounded-lg
        bg-background
        px-3
        py-2
        text-xs
        leading-5
        text-textSecondary
      "
      title={value}
    >
      {value}
    </span>
  )
}

function IdValue({
  value,
  fallback = '-',
}) {
  const display = value || fallback

  return (
    <span
      className="
        block
        max-w-[180px]
        truncate
        font-mono
        text-xs
        text-textSecondary
      "
      title={display}
    >
      {display}
    </span>
  )
}
