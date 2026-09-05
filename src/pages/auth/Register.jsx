import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Mail, Lock } from 'lucide-react'

import { signUp } from '../../services/authService'
import Button from '../../components/common/Button'
import campusBg from '../../assets/campus-bg.jpg'

import Home from '../Home'
import PublicLayout from '../../layouts/PublicLayout'

export default function Register() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    visitorType: 'STUDENT',
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
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
    <div
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-background
        cursor-pointer
      "
      onClick={() => navigate('/')}
    >
      {/* =====================================================
          หน้า Home อยู่ด้านหลังแบบจาง ๆ
      ===================================================== */}
      <div
        className="
          absolute
          inset-0
          z-0
          pointer-events-none
          opacity-60
          blur-[1px]
        "
      >
        <PublicLayout>
          <Home />
        </PublicLayout>
      </div>

      {/* =====================================================
          ชั้นสีขาวจาง ๆ คลุม Home
      ===================================================== */}
      <div
        className="
          absolute
          inset-0
          z-10
          bg-white/40
          pointer-events-none
        "
      />

      {/* =====================================================
          REGISTER CARD
      ===================================================== */}
      <div
        className="
          relative
          z-20
          min-h-screen
          flex
          items-center
          justify-center
          px-6
          py-8
        "
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="
            w-[25cm]
            h-[15cm]
            max-w-[calc(100vw-80px)]
            max-h-[calc(100vh-80px)]
            flex
            rounded-card
            overflow-hidden
            shadow-2xl
            bg-surface
            cursor-default
          "
        >
          {/* ===================================================
              ฝั่งซ้าย - รูปภาพ
          =================================================== */}
          <div
            className="
              relative
              w-1/2
              h-full
              bg-cover
              bg-center
              flex
              flex-col
              items-center
              justify-end
              p-8
            "
            style={{
              backgroundImage: `url(${campusBg})`,
            }}
          >
            {/* Overlay สีม่วง */}
            <div
              className="
                absolute
                inset-0
                bg-gradient-to-t
                from-primary/90
                via-primary/50
                to-primary/20
              "
            />

            {/* ข้อความ */}
            <div
              className="
                relative
                text-white
                text-center
                mb-[2cm]
              "
            >
              <h1
                className="
                  text-4xl
                  font-bold
                  leading-tight
                "
              >
                เริ่มต้นการเดินทาง!
              </h1>

              <p
                className="
                  text-white/80
                  text-lg
                  mt-3
                "
              >
                สมัครสมาชิกเพื่อจองทัวร์มหาวิทยาลัยวลัยลักษณ์
              </p>
            </div>
          </div>

          {/* ===================================================
              ฝั่งขวา - Register Form
          =================================================== */}
          <div
            className="
              w-1/2
              h-full
              flex
              items-center
              justify-center
              p-10
              overflow-y-auto
            "
          >
            <div className="w-full max-w-sm">
              <h2
                className="
                  text-2xl
                  font-bold
                  text-textPrimary
                  mb-5
                "
              >
                สมัครสมาชิก
              </h2>

              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-3"
              >
                {/* Full Name */}
                <div className="relative">
                  <User
                    className="
                      absolute
                      left-4
                      top-1/2
                      -translate-y-1/2
                      text-textSecondary
                    "
                    size={18}
                  />

                  <input
                    name="fullName"
                    type="text"
                    placeholder="ชื่อ-นามสกุล"
                    value={form.fullName}
                    onChange={handleChange}
                    required
                    className="
                      w-full
                      rounded-full
                      border
                      border-border
                      pl-11
                      pr-4
                      py-2.5
                      text-base
                      bg-background
                      text-textPrimary
                      focus:outline-none
                      focus:ring-2
                      focus:ring-primary
                    "
                  />
                </div>

                {/* Email */}
                <div className="relative">
                  <Mail
                    className="
                      absolute
                      left-4
                      top-1/2
                      -translate-y-1/2
                      text-textSecondary
                    "
                    size={18}
                  />

                  <input
                    name="email"
                    type="email"
                    placeholder="อีเมล"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="
                      w-full
                      rounded-full
                      border
                      border-border
                      pl-11
                      pr-4
                      py-2.5
                      text-base
                      bg-background
                      text-textPrimary
                      focus:outline-none
                      focus:ring-2
                      focus:ring-primary
                    "
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <Lock
                    className="
                      absolute
                      left-4
                      top-1/2
                      -translate-y-1/2
                      text-textSecondary
                    "
                    size={18}
                  />

                  <input
                    name="password"
                    type="password"
                    placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                    value={form.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    className="
                      w-full
                      rounded-full
                      border
                      border-border
                      pl-11
                      pr-4
                      py-2.5
                      text-base
                      bg-background
                      text-textPrimary
                      focus:outline-none
                      focus:ring-2
                      focus:ring-primary
                    "
                  />
                </div>

                {/* Visitor Type */}
                <select
                  name="visitorType"
                  value={form.visitorType}
                  onChange={handleChange}
                  className="
                    w-full
                    rounded-full
                    border
                    border-border
                    px-4
                    py-2.5
                    text-base
                    bg-background
                    text-textPrimary
                    focus:outline-none
                    focus:ring-2
                    focus:ring-primary
                  "
                >
                  <option value="STUDENT">🎓 นักศึกษา</option>
                  <option value="STAFF">💼 บุคลากร</option>
                  <option value="EXTERNAL">👤 บุคคลภายนอก</option>
                </select>

                {/* Error */}
                {error && (
                  <div
                    className="
                      bg-danger/10
                      border
                      border-danger/30
                      text-danger
                      text-sm
                      rounded-input
                      px-3
                      py-2
                    "
                  >
                    {error}
                  </div>
                )}

                {/* Register Button */}
                <Button
                  type="submit"
                  size="md"
                  disabled={loading}
                  className="!rounded-full mt-2"
                >
                  {loading
                    ? 'กำลังสมัคร...'
                    : 'สมัครสมาชิก'}
                </Button>
              </form>

              {/* Login Link */}
              <p
                className="
                  text-center
                  text-sm
                  text-textSecondary
                  mt-5
                "
              >
                มีบัญชีแล้ว?{' '}

                <Link
                  to="/login"
                  onClick={(e) => e.stopPropagation()}
                  className="
                    text-primary
                    font-medium
                    hover:underline
                  "
                >
                  เข้าสู่ระบบ
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}