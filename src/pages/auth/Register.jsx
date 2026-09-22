import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Mail, Lock, IdCard } from 'lucide-react'

import { signUp } from '../../services/authService'
import Button from '../../components/common/Button'
import campusBg from '../../assets/campus-bg.jpg'

import Home from '../Home'
import PublicLayout from '../../layouts/PublicLayout'

function validateForm(form) {
  const fullName = form.fullName.trim()
  const email = form.email.trim()
  const institutionalId = form.institutionalId.trim()

  if (!fullName) {
    return 'กรุณากรอกชื่อ-นามสกุล'
  }

  if (!email) {
    return 'กรุณากรอกอีเมล'
  }

  if (form.password.length < 6) {
    return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
  }

  if (
    ['STUDENT', 'STAFF'].includes(form.memberType) &&
    !/^\d{8}$/.test(institutionalId)
  ) {
    return 'รหัสนักศึกษาหรือรหัสบุคลากรต้องเป็นตัวเลข 8 หลัก'
  }

  return ''
}

export default function Register() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    memberType: 'STUDENT',
    institutionalId: '',
  })

  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target

    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'memberType' && value === 'EXTERNAL'
        ? { institutionalId: '' }
        : {}),
    }))

    setError('')
    setSuccessMessage('')
  }

  async function handleSubmit(e) {
    e.preventDefault()

    setError('')
    setSuccessMessage('')

    const validationError = validateForm(form)

    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      const result = await signUp({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        memberType: form.memberType,
        institutionalId:
          form.memberType === 'EXTERNAL'
            ? null
            : form.institutionalId,
      })

      if (!result.success) {
        setError(
          result.error?.message ||
            'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
        )
        return
      }

      setSuccessMessage(
        'สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ',
      )

      setForm({
        fullName: '',
        email: '',
        password: '',
        memberType: 'STUDENT',
        institutionalId: '',
      })
    } catch {
      setError(
        'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
      )
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
      {/* HOME BACKGROUND */}
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

      <div
        className="
          absolute
          inset-0
          z-10
          bg-white/40
          pointer-events-none
        "
      />

      {/* REGISTER CARD */}
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
            min-h-[15cm]
            max-w-[calc(100vw-80px)]
            max-h-[calc(100vh-40px)]
            flex
            rounded-card
            overflow-hidden
            shadow-2xl
            bg-surface
            cursor-default
          "
        >
          {/* LEFT IMAGE */}
          <div
            className="
              relative
              w-1/2
              min-h-full
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

          {/* REGISTER FORM */}
          <div
            className="
              w-1/2
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
                {/* FULL NAME */}
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
                    disabled={loading}
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
                      disabled:opacity-60
                    "
                  />
                </div>

                {/* EMAIL */}
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
                    disabled={loading}
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
                      disabled:opacity-60
                    "
                  />
                </div>

                {/* PASSWORD */}
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
                    disabled={loading}
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
                      disabled:opacity-60
                    "
                  />
                </div>

                {/* MEMBER TYPE */}
                <select
                  name="memberType"
                  value={form.memberType}
                  onChange={handleChange}
                  disabled={loading}
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
                    disabled:opacity-60
                  "
                >
                  <option value="STUDENT">🎓 นักศึกษา</option>
                  <option value="STAFF">💼 บุคลากร</option>
                  <option value="EXTERNAL">👤 บุคคลภายนอก</option>
                </select>

                {/* INSTITUTIONAL ID */}
                {form.memberType !== 'EXTERNAL' && (
                  <div className="relative">
                    <IdCard
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
                      name="institutionalId"
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      placeholder={
                        form.memberType === 'STUDENT'
                          ? 'รหัสนักศึกษา 8 หลัก'
                          : 'รหัสบุคลากร 8 หลัก'
                      }
                      value={form.institutionalId}
                      onChange={(e) => {
                        const digitsOnly =
                          e.target.value.replace(/\D/g, '')

                        setForm((current) => ({
                          ...current,
                          institutionalId: digitsOnly,
                        }))

                        setError('')
                        setSuccessMessage('')
                      }}
                      disabled={loading}
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
                        disabled:opacity-60
                      "
                    />
                  </div>
                )}

                {/* ERROR */}
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

                {/* SUCCESS */}
                {successMessage && (
                  <div
                    className="
                      border
                      border-green-200
                      bg-green-50
                      text-green-700
                      text-sm
                      rounded-input
                      px-3
                      py-2
                    "
                  >
                    {successMessage}
                  </div>
                )}

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