import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'

import { listAuditLogs } from '../../services/auditService'
import Card from '../../components/common/Card'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'

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

function formatData(data) {
  if (!data) return '-'

  if (data.role) {
    return data.role
  }

  return JSON.stringify(data)
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      const data = await listAuditLogs()
      setLogs(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return <ErrorState message={error} />
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div
            className="
              w-10
              h-10
              rounded-xl
              bg-primary/10
              text-primary
              flex
              items-center
              justify-center
            "
          >
            <ShieldCheck size={21} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-primary">
              Audit Logs
            </h1>

            <p className="text-sm text-textSecondary mt-1">
              ประวัติการดำเนินการด้านสิทธิ์และบัญชีผู้ใช้
            </p>
          </div>
        </div>
      </div>

      <Card>
        {logs.length === 0 ? (
          <p className="text-center text-textSecondary py-10">
            ยังไม่มีประวัติการดำเนินการ
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 px-3 font-semibold">
                    การดำเนินการ
                  </th>

                  <th className="py-3 px-3 font-semibold">
                    ก่อน
                  </th>

                  <th className="py-3 px-3 font-semibold">
                    หลัง
                  </th>

                  <th className="py-3 px-3 font-semibold">
                    ผู้ดำเนินการ
                  </th>

                  <th className="py-3 px-3 font-semibold">
                    เป้าหมาย
                  </th>

                  <th className="py-3 px-3 font-semibold">
                    วันเวลา
                  </th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="
                      border-b
                      border-border/60
                      hover:bg-background
                      transition
                    "
                  >
                    {/* Action */}
                    <td className="py-4 px-3">
                      <span
                        className={`
                          inline-flex
                          rounded-full
                          border
                          px-2.5
                          py-1
                          text-xs
                          font-medium
                          ${
                            ACTION_STYLES[log.action] ||
                            'bg-gray-50 text-gray-700 border-gray-200'
                          }
                        `}
                      >
                        {ACTION_LABELS[log.action] ||
                          log.action}
                      </span>
                    </td>

                    {/* Old */}
                    <td className="py-4 px-3 text-textSecondary">
                      {formatData(log.old_data)}
                    </td>

                    {/* New */}
                    <td className="py-4 px-3 text-textSecondary">
                      {formatData(log.new_data)}
                    </td>

                    {/* Actor */}
                    <td className="py-4 px-3">
                      <span
                        className="
                          block
                          max-w-[180px]
                          truncate
                          font-mono
                          text-xs
                          text-textSecondary
                        "
                        title={log.actor_id || ''}
                      >
                        {log.actor_id || '-'}
                      </span>
                    </td>

                    {/* Target */}
                    <td className="py-4 px-3">
                      <span
                        className="
                          block
                          max-w-[180px]
                          truncate
                          font-mono
                          text-xs
                          text-textSecondary
                        "
                        title={log.target_id || ''}
                      >
                        {log.target_id || '-'}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-4 px-3 whitespace-nowrap text-textSecondary">
                      {log.created_at
                        ? new Date(
                            log.created_at
                          ).toLocaleString('th-TH')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}