import { useState, useSyncExternalStore } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'

import {
  clearPasswordRecovery,
  getPasswordRecoveryState,
  subscribePasswordRecovery,
  supabase,
} from '../../lib/supabase'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'

export default function ResetPassword() {
  const navigate = useNavigate()
  const recovery = useSyncExternalStore(
    subscribePasswordRecovery,
    getPasswordRecoveryState,
    getPasswordRecoveryState,
  )

  const [form, setForm] = useState({
    password: '',
    confirm: '',
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()

    setMessage('')
    setError('')

    if (recovery.status !== 'ready' || !recovery.userId) {
      setError('ลิงก์ตั้งรหัสผ่านไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่')
      return
    }

    if (form.password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }

    if (form.password !== form.confirm) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
      return
    }

    setLoading(true)

    try {
      // A regular logged-in session must not unlock the recovery form.
      const { data, error: userError } = await supabase.auth.getUser()
      if (userError || data?.user?.id !== recovery.userId) {
        clearPasswordRecovery()
        throw new Error('ลิงก์ตั้งรหัสผ่านไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่')
      }

      const { error } = await supabase.auth.updateUser({
        password: form.password,
      })

      if (error) throw error

      setMessage('ตั้งรหัสผ่านใหม่สำเร็จแล้ว')

      setForm({
        password: '',
        confirm: '',
      })
      clearPasswordRecovery()

      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1500)
    } catch (err) {
      setError(
        err.message || 'ไม่สามารถตั้งรหัสผ่านใหม่ได้'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-background flex items-center justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-lg p-8">
        <div className="mb-7">
          <Lock
            size={36}
            className="text-primary mb-4"
          />

          <p className="text-sm font-semibold text-primary mb-2">
            RESET PASSWORD
          </p>

          <h1 className="text-2xl font-bold text-textPrimary">
            ตั้งรหัสผ่านใหม่
          </h1>

          <p className="text-sm text-textSecondary mt-2">
            กรุณากำหนดรหัสผ่านใหม่สำหรับบัญชีของคุณ
          </p>
        </div>

        {message ? (
          <div role="status" className="rounded-xl bg-success/10 text-success px-4 py-3 text-sm">
            {message}
          </div>
        ) : recovery.status === 'checking' ? (
          <p role="status" className="text-sm text-textSecondary">
            กำลังตรวจสอบลิงก์ตั้งรหัสผ่าน...
          </p>
        ) : recovery.status !== 'ready' ? (
          <div className="flex flex-col gap-4">
            <p role="alert" className="text-sm text-danger">
              ลิงก์ตั้งรหัสผ่านไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่
            </p>
            <Link
              to="/forgot-password"
              className="rounded-button bg-primary px-4 py-3 text-center text-sm font-medium text-white"
            >
              ขอลิงก์ตั้งรหัสผ่านใหม่
            </Link>
          </div>
        ) : (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <Input
            label="รหัสผ่านใหม่"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) =>
              setForm({
                ...form,
                password: e.target.value,
              })
            }
            placeholder="อย่างน้อย 6 ตัวอักษร"
            required
          />

          <Input
            label="ยืนยันรหัสผ่านใหม่"
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={(e) =>
              setForm({
                ...form,
                confirm: e.target.value,
              })
            }
            required
          />

          {error && (
            <div className="rounded-xl bg-danger/10 text-danger px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading
              ? 'กำลังบันทึก...'
              : 'ตั้งรหัสผ่านใหม่'}
          </Button>
        </form>
        )}

        <button
          type="button"
          onClick={() => navigate('/login')}
          className="w-full mt-5 text-sm text-textSecondary hover:text-primary"
        >
          กลับไปหน้าเข้าสู่ระบบ
        </button>
      </div>
    </div>
  )
}