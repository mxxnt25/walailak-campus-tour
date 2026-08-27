import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signIn } from '../../services/authService'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
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
      await signIn(form)
      navigate('/profile')
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
              🎓
            </div>
            <h1 className="text-white font-bold text-xl">ยินดีต้อนรับกลับมา</h1>
            <p className="text-white/80 text-sm mt-1">เข้าสู่ระบบเพื่อจองทัวร์และดูข้อมูลของคุณ</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            <Input name="email" type="email" label="อีเมล" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
            <Input name="password" type="password" label="รหัสผ่าน" placeholder="••••••••" value={form.password} onChange={handleChange} required />
            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-input px-3 py-2">
                {error}
              </div>
            )}
            <Button type="submit" size="lg" disabled={loading} className="mt-2">
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </Button>
          </form>

          <div className="px-6 pb-6 text-center">
            <p className="text-sm text-textSecondary">
              ยังไม่มีบัญชี?{' '}
              <Link to="/register" className="text-primary font-medium hover:underline">
                สมัครสมาชิก
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}