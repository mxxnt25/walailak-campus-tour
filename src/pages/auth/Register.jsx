import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signUp } from '../../services/authService'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', visitorType: 'STUDENT' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signUp({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        visitorType: form.visitorType,
      })
      navigate('/login')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-surface border border-border rounded-card shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-accent px-6 py-8 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-white/20 flex items-center justify-center text-2xl">
              🚌
            </div>
            <h1 className="text-white font-bold text-xl">สร้างบัญชีใหม่</h1>
            <p className="text-white/80 text-sm mt-1">เริ่มต้นสำรวจมหาวิทยาลัยวลัยลักษณ์</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            <Input name="fullName" label="ชื่อ-นามสกุล" placeholder="ชื่อของคุณ" value={form.fullName} onChange={handleChange} required />
            <Input name="email" type="email" label="อีเมล" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
            <Input name="password" type="password" label="รหัสผ่าน" placeholder="อย่างน้อย 6 ตัวอักษร" value={form.password} onChange={handleChange} required minLength={6} />

            <div className="flex flex-col gap-1">
              <label className="text-sm text-textSecondary">ประเภทผู้เยี่ยมชม</label>
              <select
                name="visitorType"
                value={form.visitorType}
                onChange={handleChange}
                className="rounded-input border border-border px-3 py-2 bg-surface text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="STUDENT">🎓 นักศึกษา</option>
                <option value="STAFF">💼 บุคลากร</option>
                <option value="EXTERNAL">👤 บุคคลภายนอก</option>
              </select>
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-input px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" disabled={loading} className="mt-2">
              {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
            </Button>
          </form>

          <div className="px-6 pb-6 text-center">
            <p className="text-sm text-textSecondary">
              มีบัญชีแล้ว?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                เข้าสู่ระบบ
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}