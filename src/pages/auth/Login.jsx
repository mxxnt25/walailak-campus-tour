import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signIn } from '../../services/authService'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Card from '../../components/common/Card'

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
    <div className="max-w-md mx-auto mt-10">
      <Card>
        <h1 className="text-xl font-bold text-primary mb-4">เข้าสู่ระบบ</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input name="email" type="email" label="อีเมล" value={form.email} onChange={handleChange} required />
          <Input name="password" type="password" label="รหัสผ่าน" value={form.password} onChange={handleChange} required />
          {error && <span className="text-sm text-danger">{error}</span>}
          <Button type="submit" disabled={loading}>
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </Button>
        </form>
        <p className="text-sm text-textSecondary mt-4">
          ยังไม่มีบัญชี? <Link to="/register" className="text-primary">สมัครสมาชิก</Link>
        </p>
      </Card>
    </div>
  )
}