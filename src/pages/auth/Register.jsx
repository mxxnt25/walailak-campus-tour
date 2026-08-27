import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signUp } from '../../services/authService'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Card from '../../components/common/Card'

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
    <div className="max-w-md mx-auto mt-10">
      <Card>
        <h1 className="text-xl font-bold text-primary mb-4">สมัครสมาชิก</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input name="fullName" label="ชื่อ-นามสกุล" value={form.fullName} onChange={handleChange} required />
          <Input name="email" type="email" label="อีเมล" value={form.email} onChange={handleChange} required />
          <Input name="password" type="password" label="รหัสผ่าน" value={form.password} onChange={handleChange} required minLength={6} />
          <div className="flex flex-col gap-1">
            <label className="text-sm text-textSecondary">ประเภทผู้เยี่ยมชม</label>
            <select
              name="visitorType"
              value={form.visitorType}
              onChange={handleChange}
              className="rounded-input border border-border px-3 py-2 bg-surface text-textPrimary"
            >
              <option value="STUDENT">นักศึกษา</option>
              <option value="STAFF">บุคลากร</option>
              <option value="EXTERNAL">บุคคลภายนอก</option>
            </select>
          </div>
          {error && <span className="text-sm text-danger">{error}</span>}
          <Button type="submit" disabled={loading}>
            {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
          </Button>
        </form>
        <p className="text-sm text-textSecondary mt-4">
          มีบัญชีแล้ว? <Link to="/login" className="text-primary">เข้าสู่ระบบ</Link>
        </p>
      </Card>
    </div>
  )
}