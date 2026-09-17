import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera,
  User,
  Lock,
  Image as ImageIcon,
  LogOut,
  Shield,
  Home,
  Mail,
  Phone,
  MapPin,
  Compass,
  Settings,
} from 'lucide-react'

import { useAuth } from '../../hooks/useAuth'
import {
  updateProfile,
  uploadAvatar,
} from '../../services/profileService'
import {
  signOut,
  changePassword,
} from '../../services/authService'

import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Badge from '../../components/common/Badge'
import LoadingState from '../../components/common/LoadingState'

const ROLE_LABELS = {
  MEMBER: 'สมาชิก',
  GUIDE: 'ไกด์นำเที่ยว',
  ADMIN: 'ผู้ดูแลระบบ',
  SUPER_ADMIN: 'ผู้ดูแลระบบสูงสุด',
}

const MEMBER_TYPE_LABELS = {
  STUDENT: 'นักศึกษา',
  STAFF: 'บุคลากร',
  EXTERNAL: 'บุคคลภายนอก',
}

const ROLE_COLORS = {
  MEMBER: 'primary',
  GUIDE: 'warning',
  ADMIN: 'danger',
  SUPER_ADMIN: 'danger',
}

const TABS = [
  {
    id: 'info',
    label: 'ข้อมูลส่วนตัว',
    icon: User,
  },
  {
    id: 'avatar',
    label: 'เปลี่ยนรูปโปรไฟล์',
    icon: ImageIcon,
  },
  {
    id: 'password',
    label: 'เปลี่ยนรหัสผ่าน',
    icon: Lock,
  },
]

export default function Profile() {
  const {
    profile,
    loading,
    refreshProfile,
  } = useAuth()

  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [activeTab, setActiveTab] = useState('info')

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
  })

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [pwForm, setPwForm] = useState({
    password: '',
    confirm: '',
  })

  const [pwSaving, setPwSaving] = useState(false)
  const [pwMessage, setPwMessage] = useState('')

  useEffect(() => {
    if (!profile) return

    setForm({
      full_name: profile.full_name || '',
      phone: profile.phone || '',
    })
  }, [profile])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingState />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-textSecondary">
          กรุณาเข้าสู่ระบบ
        </p>

        <Button onClick={() => navigate('/login')}>
          เข้าสู่ระบบ
        </Button>
      </div>
    )
  }

  async function handleSaveInfo(e) {
    e.preventDefault()
    setSaving(true)

    try {
      const result = await updateProfile(
        profile.id,
        {
          full_name: form.full_name,
          phone: form.phone,
        }
      )

      if (!result.success) {
        throw new Error(result.error.message)
      }

      await refreshProfile()
    } catch (err) {
      alert(
        'บันทึกไม่สำเร็จ: ' + err.message
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น')
      return
    }

    if (file.size > 3 * 1024 * 1024) {
      alert('ไฟล์ต้องมีขนาดไม่เกิน 3MB')
      return
    }

    setUploading(true)

    try {
      const uploadResult = await uploadAvatar(
        profile.id,
        file
      )

      if (!uploadResult.success) {
        throw new Error(
          uploadResult.error.message
        )
      }

      const updateResult = await updateProfile(
        profile.id,
        {
          avatar_url: uploadResult.data,
        }
      )

      if (!updateResult.success) {
        throw new Error(
          updateResult.error.message
        )
      }

      await refreshProfile()
    } catch (err) {
      alert(
        'อัปโหลดรูปไม่สำเร็จ: ' +
          err.message
      )
    } finally {
      setUploading(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()

    setPwMessage('')

    if (pwForm.password.length < 6) {
      setPwMessage(
        'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
      )
      return
    }

    if (pwForm.password !== pwForm.confirm) {
      setPwMessage(
        'รหัสผ่านทั้งสองช่องไม่ตรงกัน'
      )
      return
    }

    setPwSaving(true)

    try {
      const result = await changePassword(
        pwForm.password
      )

      if (!result.success) {
        throw new Error(
          result.error.message
        )
      }

      setPwMessage(
        'เปลี่ยนรหัสผ่านสำเร็จแล้ว'
      )

      setPwForm({
        password: '',
        confirm: '',
      })
    } catch (err) {
      setPwMessage(
        'เปลี่ยนรหัสผ่านไม่สำเร็จ: ' +
          err.message
      )
    } finally {
      setPwSaving(false)
    }
  }

  async function handleSignOut() {
    const result = await signOut()

    if (!result.success) {
      alert(result.error.message)
      return
    }

    navigate('/login')
  }

  const initial = (
    profile.full_name || '?'
  )
    .charAt(0)
    .toUpperCase()

  const roleLabel =
    ROLE_LABELS[profile.role] ||
    profile.role

  const memberTypeLabel =
    profile.member_type
      ? MEMBER_TYPE_LABELS[
          profile.member_type
        ] || profile.member_type
      : '-'

  const isAdmin = [
    'ADMIN',
    'SUPER_ADMIN',
  ].includes(profile.role)

  return (
    <div className="min-h-screen bg-background">
      {/* HERO */}
      <section
        className="
          relative
          overflow-hidden
          border-b
          border-border
          bg-white
        "
      >
        <img
          src="/images/home-campus.jpg"
          alt="มหาวิทยาลัยวลัยลักษณ์"
          className="
            absolute
            inset-0
            h-full
            w-full
            object-cover
            opacity-[0.12]
          "
        />

        <div
          className="
            absolute
            inset-0
            bg-gradient-to-r
            from-white
            via-white/95
            to-white/70
          "
        />

        <div
          className="
            relative
            mx-auto
            flex
            max-w-[1500px]
            flex-col
            gap-6
            px-[4vw]
            py-8
            lg:flex-row
            lg:items-center
            lg:justify-between
            lg:py-10
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
              <Compass size={14} />
              WALAILAK CAMPUS TOUR
            </div>

            <h1
              className="
                text-3xl
                font-bold
                text-textPrimary
                lg:text-4xl
              "
            >
              บัญชีผู้ใช้ของฉัน
            </h1>

            <p
              className="
                mt-3
                max-w-2xl
                text-sm
                leading-6
                text-textSecondary
              "
            >
              จัดการข้อมูลส่วนตัว
              รูปโปรไฟล์
              และความปลอดภัยของบัญชี
              สำหรับการใช้งาน Walailak Campus Tour
            </p>
          </div>

          <Button
            variant="ghost"
            onClick={() => navigate('/')}
          >
            <Home size={17} />
            กลับหน้าแรก
          </Button>
        </div>
      </section>

      {/* CONTENT */}
      <main
        className="
          mx-auto
          grid
          w-full
          max-w-[1500px]
          grid-cols-1
          gap-7
          px-[4vw]
          py-8
          lg:grid-cols-[280px_minmax(0,1fr)]
          lg:py-10
        "
      >
        {/* LEFT PROFILE PANEL */}
        <aside
          className="
            h-fit
            overflow-hidden
            rounded-2xl
            border
            border-border
            bg-white
            shadow-sm
          "
        >
          {/* PROFILE HEADER */}
          <div
            className="
              relative
              overflow-hidden
              bg-gradient-to-br
              from-primary
              to-primary/80
              px-6
              py-7
              text-white
            "
          >
            <MapPin
              size={90}
              className="
                absolute
                -bottom-5
                -right-5
                text-white/10
              "
            />

            <div className="relative z-10">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div
                    className="
                      flex
                      h-20
                      w-20
                      items-center
                      justify-center
                      overflow-hidden
                      rounded-full
                      border-4
                      border-white/30
                      bg-white/10
                      text-2xl
                      font-bold
                      shadow-lg
                    "
                  >
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initial
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="
                      absolute
                      -bottom-1
                      -right-1
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-full
                      bg-white
                      text-primary
                      shadow-md
                      transition
                      hover:scale-105
                    "
                    title="เปลี่ยนรูปโปรไฟล์"
                  >
                    <Camera size={14} />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>

                <div className="min-w-0">
                  <h2
                    className="
                      truncate
                      text-lg
                      font-bold
                    "
                  >
                    {profile.full_name}
                  </h2>

                  <p
                    className="
                      mt-1
                      truncate
                      text-xs
                      text-white/75
                    "
                  >
                    {profile.email}
                  </p>

                  <div className="mt-3">
                    <span
                      className="
                        inline-flex
                        rounded-full
                        bg-white/15
                        px-3
                        py-1
                        text-xs
                        font-semibold
                        backdrop-blur-sm
                      "
                    >
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MENU */}
          <div className="p-4">
            <p
              className="
                mb-3
                px-3
                text-[11px]
                font-semibold
                uppercase
                tracking-wider
                text-textSecondary
              "
            >
              Account Settings
            </p>

            <nav className="flex flex-col gap-1">
              {TABS.map((tab) => {
                const Icon = tab.icon

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setActiveTab(tab.id)
                    }
                    className={`
                      flex
                      w-full
                      items-center
                      gap-3
                      rounded-xl
                      px-4
                      py-3
                      text-left
                      text-sm
                      transition
                      ${
                        activeTab === tab.id
                          ? 'bg-primary/10 font-semibold text-primary'
                          : 'text-textPrimary hover:bg-background'
                      }
                    `}
                  >
                    <Icon size={17} />

                    {tab.label}
                  </button>
                )
              })}

              {isAdmin && (
                <>
                  <div className="my-3 border-t border-border" />

                  <p
                    className="
                      mb-2
                      px-3
                      text-[11px]
                      font-semibold
                      uppercase
                      tracking-wider
                      text-textSecondary
                    "
                  >
                    Administration
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      navigate('/admin/users')
                    }
                    className="
                      flex
                      w-full
                      items-center
                      gap-3
                      rounded-xl
                      px-4
                      py-3
                      text-left
                      text-sm
                      text-textPrimary
                      transition
                      hover:bg-background
                    "
                  >
                    <Shield size={17} />
                    จัดการระบบ
                  </button>
                </>
              )}
            </nav>

            <div className="my-4 border-t border-border" />

            <button
              type="button"
              onClick={handleSignOut}
              className="
                flex
                w-full
                items-center
                gap-3
                rounded-xl
                px-4
                py-3
                text-left
                text-sm
                font-medium
                text-red-600
                transition
                hover:bg-red-50
              "
            >
              <LogOut size={17} />
              ออกจากระบบ
            </button>
          </div>
        </aside>

        {/* RIGHT CONTENT */}
        <section className="min-w-0">
          {/* INFO */}
          {activeTab === 'info' && (
            <div
              className="
                grid
                grid-cols-1
                gap-7
                xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]
              "
            >
              <form
                onSubmit={handleSaveInfo}
                className="
                  rounded-2xl
                  border
                  border-border
                  bg-white
                  p-7
                  shadow-sm
                "
              >
                <div className="mb-7">
                  <div
                    className="
                      mb-3
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
                    <User size={20} />
                  </div>

                  <h2
                    className="
                      text-xl
                      font-bold
                      text-textPrimary
                    "
                  >
                    ข้อมูลส่วนตัว
                  </h2>

                  <p
                    className="
                      mt-1
                      text-sm
                      text-textSecondary
                    "
                  >
                    แก้ไขข้อมูลพื้นฐานของบัญชีผู้ใช้
                  </p>
                </div>

                <div
                  className="
                    grid
                    grid-cols-1
                    gap-5
                    lg:grid-cols-2
                  "
                >
                  <Input
                    label="ชื่อ-นามสกุล"
                    value={form.full_name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        full_name:
                          e.target.value,
                      })
                    }
                    required
                  />

                  <Input
                    label="เบอร์โทร"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        phone:
                          e.target.value,
                      })
                    }
                    placeholder="08x-xxx-xxxx"
                  />

                  <Input
                    label="อีเมล"
                    value={profile.email}
                    disabled
                  />

                  {profile.member_type && (
                    <Input
                      label="ประเภทสมาชิก"
                      value={memberTypeLabel}
                      disabled
                    />
                  )}
                </div>

                <div className="mt-7">
                  <Button
                    type="submit"
                    disabled={saving}
                  >
                    {saving
                      ? 'กำลังบันทึก...'
                      : 'บันทึกข้อมูล'}
                  </Button>
                </div>
              </form>

              {/* ACCOUNT SUMMARY */}
              <div
                className="
                  h-fit
                  rounded-2xl
                  border
                  border-border
                  bg-white
                  p-7
                  shadow-sm
                "
              >
                <div className="mb-6">
                  <h2
                    className="
                      text-lg
                      font-bold
                      text-textPrimary
                    "
                  >
                    ข้อมูลบัญชี
                  </h2>

                  <p
                    className="
                      mt-1
                      text-sm
                      text-textSecondary
                    "
                  >
                    ข้อมูลสรุปของบัญชีปัจจุบัน
                  </p>
                </div>

                <div
                  className="
                    mb-7
                    flex
                    flex-col
                    items-center
                    text-center
                  "
                >
                  <div
                    className="
                      flex
                      h-28
                      w-28
                      items-center
                      justify-center
                      overflow-hidden
                      rounded-full
                      border-4
                      border-background
                      bg-primary/10
                      text-4xl
                      font-bold
                      text-primary
                      shadow-md
                    "
                  >
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initial
                    )}
                  </div>

                  <h3
                    className="
                      mt-4
                      text-lg
                      font-bold
                      text-textPrimary
                    "
                  >
                    {profile.full_name}
                  </h3>

                  <div className="mt-2">
                    <Badge
                      color={
                        ROLE_COLORS[
                          profile.role
                        ]
                      }
                    >
                      {roleLabel}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-xl
                      bg-background
                      p-4
                    "
                  >
                    <Mail
                      size={18}
                      className="shrink-0 text-primary"
                    />

                    <div className="min-w-0">
                      <p className="text-xs text-textSecondary">
                        อีเมล
                      </p>

                      <p
                        className="
                          truncate
                          text-sm
                          font-medium
                          text-textPrimary
                        "
                      >
                        {profile.email}
                      </p>
                    </div>
                  </div>

                  <div
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-xl
                      bg-background
                      p-4
                    "
                  >
                    <Phone
                      size={18}
                      className="shrink-0 text-primary"
                    />

                    <div>
                      <p className="text-xs text-textSecondary">
                        เบอร์โทร
                      </p>

                      <p
                        className="
                          text-sm
                          font-medium
                          text-textPrimary
                        "
                      >
                        {profile.phone ||
                          'ยังไม่ได้ระบุ'}
                      </p>
                    </div>
                  </div>

                  <div
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-xl
                      bg-background
                      p-4
                    "
                  >
                    <User
                      size={18}
                      className="shrink-0 text-primary"
                    />

                    <div>
                      <p className="text-xs text-textSecondary">
                        ประเภทสมาชิก
                      </p>

                      <p
                        className="
                          text-sm
                          font-medium
                          text-textPrimary
                        "
                      >
                        {memberTypeLabel}
                      </p>
                    </div>
                  </div>

                  <div
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-xl
                      bg-background
                      p-4
                    "
                  >
                    <Shield
                      size={18}
                      className="shrink-0 text-primary"
                    />

                    <div>
                      <p className="text-xs text-textSecondary">
                        สิทธิ์การใช้งาน
                      </p>

                      <p
                        className="
                          text-sm
                          font-medium
                          text-textPrimary
                        "
                      >
                        {roleLabel}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AVATAR */}
          {activeTab === 'avatar' && (
            <div
              className="
                grid
                grid-cols-1
                gap-7
                xl:grid-cols-2
              "
            >
              <div
                className="
                  flex
                  min-h-[430px]
                  flex-col
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-border
                  bg-white
                  p-8
                  text-center
                  shadow-sm
                "
              >
                <div
                  className="
                    flex
                    h-44
                    w-44
                    items-center
                    justify-center
                    overflow-hidden
                    rounded-full
                    border-4
                    border-background
                    bg-primary/10
                    text-5xl
                    font-bold
                    text-primary
                    shadow-lg
                  "
                >
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initial
                  )}
                </div>

                <h2
                  className="
                    mt-6
                    text-xl
                    font-bold
                    text-textPrimary
                  "
                >
                  รูปโปรไฟล์ปัจจุบัน
                </h2>

                <p
                  className="
                    mt-2
                    max-w-sm
                    text-sm
                    leading-6
                    text-textSecondary
                  "
                >
                  รูปนี้จะแสดงทั้งในหน้าโปรไฟล์
                  และบริเวณบัญชีผู้ใช้บนแถบนำทาง
                </p>
              </div>

              <div
                className="
                  flex
                  min-h-[430px]
                  flex-col
                  justify-center
                  rounded-2xl
                  border
                  border-border
                  bg-white
                  p-8
                  shadow-sm
                "
              >
                <div
                  className="
                    mb-5
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-xl
                    bg-primary/10
                    text-primary
                  "
                >
                  <Camera size={22} />
                </div>

                <h2
                  className="
                    text-xl
                    font-bold
                    text-textPrimary
                  "
                >
                  เปลี่ยนรูปโปรไฟล์
                </h2>

                <p
                  className="
                    mt-2
                    mb-7
                    max-w-lg
                    text-sm
                    leading-6
                    text-textSecondary
                  "
                >
                  รองรับไฟล์รูปภาพทั่วไป เช่น JPG
                  และ PNG โดยไฟล์ต้องมีขนาดไม่เกิน
                  3MB
                </p>

                {uploading && (
                  <p
                    className="
                      mb-4
                      text-sm
                      text-textSecondary
                    "
                  >
                    กำลังอัปโหลด...
                  </p>
                )}

                <Button
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={uploading}
                  className="self-start"
                >
                  <Camera size={17} />
                  เลือกรูปใหม่
                </Button>
              </div>
            </div>
          )}

          {/* PASSWORD */}
          {activeTab === 'password' && (
            <div
              className="
                grid
                grid-cols-1
                gap-7
                xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]
              "
            >
              <form
                onSubmit={handleChangePassword}
                className="
                  rounded-2xl
                  border
                  border-border
                  bg-white
                  p-8
                  shadow-sm
                "
              >
                <div
                  className="
                    mb-5
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-xl
                    bg-primary/10
                    text-primary
                  "
                >
                  <Lock size={22} />
                </div>

                <h2
                  className="
                    text-xl
                    font-bold
                    text-textPrimary
                  "
                >
                  เปลี่ยนรหัสผ่าน
                </h2>

                <p
                  className="
                    mt-1
                    mb-7
                    text-sm
                    text-textSecondary
                  "
                >
                  ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ
                </p>

                <div
                  className="
                    grid
                    grid-cols-1
                    gap-5
                    lg:grid-cols-2
                  "
                >
                  <Input
                    label="รหัสผ่านใหม่"
                    type="password"
                    value={pwForm.password}
                    onChange={(e) =>
                      setPwForm({
                        ...pwForm,
                        password:
                          e.target.value,
                      })
                    }
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    required
                  />

                  <Input
                    label="ยืนยันรหัสผ่านใหม่"
                    type="password"
                    value={pwForm.confirm}
                    onChange={(e) =>
                      setPwForm({
                        ...pwForm,
                        confirm:
                          e.target.value,
                      })
                    }
                    required
                  />
                </div>

                {pwMessage && (
                  <p
                    className={`
                      mt-5
                      rounded-xl
                      px-4
                      py-3
                      text-sm
                      ${
                        pwMessage.includes(
                          'สำเร็จ'
                        )
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }
                    `}
                  >
                    {pwMessage}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={pwSaving}
                  className="mt-7"
                >
                  {pwSaving
                    ? 'กำลังบันทึก...'
                    : 'เปลี่ยนรหัสผ่าน'}
                </Button>
              </form>

              <div
                className="
                  h-fit
                  rounded-2xl
                  border
                  border-primary/20
                  bg-primary/5
                  p-8
                "
              >
                <div
                  className="
                    mb-5
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-xl
                    bg-white
                    text-primary
                    shadow-sm
                  "
                >
                  <Shield size={22} />
                </div>

                <h3
                  className="
                    text-lg
                    font-bold
                    text-textPrimary
                  "
                >
                  ความปลอดภัยของบัญชี
                </h3>

                <p
                  className="
                    mt-3
                    text-sm
                    leading-6
                    text-textSecondary
                  "
                >
                  รหัสผ่านใหม่ควรมีอย่างน้อย
                  6 ตัวอักษร
                  และไม่ควรใช้รหัสผ่านเดียวกับบริการอื่น
                  เพื่อช่วยรักษาความปลอดภัยของบัญชี
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}