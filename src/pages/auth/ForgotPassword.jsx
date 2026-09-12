import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail } from 'lucide-react'

import { supabase } from '../../lib/supabase'
import Button from '../../components/common/Button'

export default function ForgotPassword() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()

    setLoading(true)
    setMessage('')
    setError('')

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })

      if (error) throw error

      setMessage(
        'ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านแล้ว กรุณาตรวจสอบอีเมลของคุณ'
      )
    } catch (err) {
      setError(
        err.message || 'ไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-lg p-8">
        <div className="mb-7">
          <p className="text-sm font-semibold text-primary mb-2">
            PASSWORD RECOVERY
          </p>

          <h1 className="text-2xl font-bold text-textPrimary">
            ลืมรหัสผ่าน
          </h1>

          <p className="text-sm text-textSecondary mt-2">
            กรอกอีเมลที่ใช้สมัครสมาชิก
            ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้คุณ
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-textPrimary mb-2"
            >
              อีเมล
            </label>

            <div className="relative">
              <Mail
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
                id="email"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="example@email.com"
                required
                className="
                  w-full
                  rounded-full
                  border
                  border-border
                  bg-background
                  pl-11
                  pr-4
                  py-3
                  text-textPrimary
                  focus:outline-none
                  focus:ring-2
                  focus:ring-primary
                "
              />
            </div>
          </div>

          {message && (
            <div className="rounded-xl bg-success/10 text-success px-4 py-3 text-sm">
              {message}
            </div>
          )}

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
              ? 'กำลังส่ง...'
              : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link
            to="/login"
            className="text-primary font-medium hover:underline"
          >
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full mt-4 text-sm text-textSecondary hover:text-primary"
        >
          กลับหน้าแรก
        </button>
      </div>
    </div>
  )
}