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
} from 'lucide-react'

import { useAuth } from '../../hooks/useAuth'
import { updateProfile, uploadAvatar } from '../../services/profileService'
import { signOut, changePassword } from '../../services/authService'

import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Badge from '../../components/common/Badge'
import LoadingState from '../../components/common/LoadingState'

const ROLE_LABELS = {
  ADMIN: 'ผู้ดูแลระบบ',
  GUIDE: 'ไกด์นำทาง',
  VISITOR: 'ผู้เยี่ยมชม',
}

const VISITOR_LABELS = {
  STUDENT: 'นักศึกษา',
  STAFF: 'บุคลากร',
  EXTERNAL: 'บุคคลภายนอก',
}

const ROLE_COLORS = {
  ADMIN: 'danger',
  GUIDE: 'warning',
  VISITOR: 'primary',
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
  const { profile, loading, refreshProfile } = useAuth()
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col gap-4 items-center justify-center">
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
      await updateProfile(profile.id, {
        full_name: form.full_name,
        phone: form.phone,
      })

      await refreshProfile()
    } catch (err) {
      alert('บันทึกไม่สำเร็จ: ' + err.message)
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
      const url = await uploadAvatar(profile.id, file)

      await updateProfile(profile.id, {
        avatar_url: url,
      })

      await refreshProfile()
    } catch (err) {
      alert('อัปโหลดรูปไม่สำเร็จ: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()

    setPwMessage('')

    if (pwForm.password.length < 6) {
      setPwMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }

    if (pwForm.password !== pwForm.confirm) {
      setPwMessage('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
      return
    }

    setPwSaving(true)

    try {
      await changePassword(pwForm.password)

      setPwMessage('เปลี่ยนรหัสผ่านสำเร็จแล้ว')

      setPwForm({
        password: '',
        confirm: '',
      })
    } catch (err) {
      setPwMessage(
        'เปลี่ยนรหัสผ่านไม่สำเร็จ: ' + err.message
      )
    } finally {
      setPwSaving(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const initial = (profile.full_name || '?')
    .charAt(0)
    .toUpperCase()

  return (
    <div className="min-h-screen w-full bg-background flex">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}
      <aside
        className="
          w-[280px]
          shrink-0
          min-h-screen
          bg-gradient-to-b
          from-primary
          to-primary/90
          text-white
          flex
          flex-col
          px-5
          py-6
        "
      >

        {/* กลับหน้าแรก */}
        <button
          onClick={() => navigate('/')}
          className="
            flex
            items-center
            gap-2
            text-sm
            text-white/80
            hover:text-white
            transition
            mb-7
          "
        >
          <Home size={17} />
          กลับหน้าแรก
        </button>

        {/* PROFILE SUMMARY */}
        <div
          className="
            flex
            flex-col
            items-center
            text-center
            border-b
            border-white/20
            pb-6
            mb-6
          "
        >
          <div className="relative">
            <div
              className="
                w-24
                h-24
                rounded-full
                border-4
                border-white/30
                bg-white/10
                flex
                items-center
                justify-center
                text-3xl
                font-bold
                overflow-hidden
                shadow-lg
              "
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="avatar"
                  className="w-full h-full object-cover"
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
                bottom-0
                right-0
                w-8
                h-8
                rounded-full
                bg-white
                text-primary
                flex
                items-center
                justify-center
                shadow-md
                hover:bg-white/90
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

          <h2 className="font-bold text-lg mt-4">
            {profile.full_name}
          </h2>

          <p className="text-xs text-white/70 mt-1">
            {profile.email}
          </p>

          <div className="mt-3">
            <Badge color={ROLE_COLORS[profile.role]}>
              {ROLE_LABELS[profile.role] || profile.role}
            </Badge>
          </div>
        </div>

        {/* MENU */}
        <nav className="flex flex-col gap-2 flex-1">
          {TABS.map((tab) => {
            const Icon = tab.icon

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex
                  items-center
                  gap-3
                  px-4
                  py-3
                  rounded-xl
                  text-sm
                  text-left
                  transition

                  ${
                    activeTab === tab.id
                      ? 'bg-white/20 font-semibold shadow-sm'
                      : 'hover:bg-white/10'
                  }
                `}
              >
                <Icon size={17} />
                {tab.label}
              </button>
            )
          })}

          {profile.role === 'ADMIN' && (
            <button
              onClick={() => navigate('/admin/users')}
              className="
                flex
                items-center
                gap-3
                px-4
                py-3
                rounded-xl
                text-sm
                text-left
                hover:bg-white/10
                transition
                mt-2
              "
            >
              <Shield size={17} />
              จัดการผู้ใช้
            </button>
          )}
        </nav>

        {/* LOGOUT */}
        <button
          onClick={handleSignOut}
          className="
            flex
            items-center
            gap-3
            px-4
            py-3
            rounded-xl
            text-sm
            hover:bg-white/10
            border-t
            border-white/20
            mt-4
            pt-5
          "
        >
          <LogOut size={17} />
          ออกจากระบบ
        </button>
      </aside>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}
      <main
        className="
          flex-1
          min-w-0
          min-h-screen
          px-[4vw]
          py-8
          lg:px-[5vw]
          xl:px-[6vw]
        "
      >

        {/* HEADER */}
        <div
          className="
            flex
            items-end
            justify-between
            gap-5
            mb-8
            border-b
            border-border
            pb-6
          "
        >
          <div>
            <p
              className="
                text-sm
                font-semibold
                uppercase
                tracking-wider
                text-primary
                mb-2
              "
            >
              MY ACCOUNT
            </p>

            <h1
              className="
                text-3xl
                font-bold
                text-textPrimary
              "
            >
              บัญชีผู้ใช้ของฉัน
            </h1>

            <p className="text-sm text-textSecondary mt-2">
              จัดการข้อมูลส่วนตัว รูปโปรไฟล์
              และการตั้งค่าความปลอดภัยของบัญชี
            </p>
          </div>

          <Button
            variant="ghost"
            onClick={() => navigate('/')}
          >
            กลับหน้าแรก
          </Button>
        </div>

        {/* ===================================================
            INFO TAB
        =================================================== */}
        {activeTab === 'info' && (
          <div
            className="
              grid
              grid-cols-1
              xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.7fr)]
              gap-7
              w-full
            "
          >

            {/* FORM */}
            <form
              onSubmit={handleSaveInfo}
              className="
                bg-surface
                border
                border-border
                rounded-2xl
                shadow-sm
                p-7
                w-full
              "
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-textPrimary">
                  ข้อมูลส่วนตัว
                </h2>

                <p className="text-sm text-textSecondary mt-1">
                  แก้ไขข้อมูลพื้นฐานของบัญชีผู้ใช้
                </p>
              </div>

              <div
                className="
                  grid
                  grid-cols-1
                  lg:grid-cols-2
                  gap-5
                "
              >
                <Input
                  label="ชื่อ-นามสกุล"
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      full_name: e.target.value,
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
                      phone: e.target.value,
                    })
                  }
                  placeholder="08x-xxx-xxxx"
                />

                <Input
                  label="อีเมล"
                  value={profile.email}
                  disabled
                />

                {profile.visitor_type && (
                  <Input
                    label="ประเภทผู้ใช้งาน"
                    value={
                      VISITOR_LABELS[
                        profile.visitor_type
                      ] || profile.visitor_type
                    }
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
                bg-surface
                border
                border-border
                rounded-2xl
                shadow-sm
                p-7
                h-fit
              "
            >
              <h2 className="text-lg font-bold text-textPrimary">
                ข้อมูลบัญชี
              </h2>

              <p className="text-sm text-textSecondary mt-1 mb-6">
                ข้อมูลสรุปของบัญชีปัจจุบัน
              </p>

              <div className="flex flex-col items-center text-center mb-7">
                <div
                  className="
                    w-28
                    h-28
                    rounded-full
                    bg-primary/10
                    text-primary
                    flex
                    items-center
                    justify-center
                    text-4xl
                    font-bold
                    overflow-hidden
                    border-4
                    border-background
                    shadow-md
                  "
                >
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initial
                  )}
                </div>

                <h3 className="font-bold text-lg mt-4 text-textPrimary">
                  {profile.full_name}
                </h3>

                <Badge
                  color={ROLE_COLORS[profile.role]}
                >
                  {ROLE_LABELS[profile.role] ||
                    profile.role}
                </Badge>
              </div>

              <div className="space-y-4">
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
                    className="text-primary"
                  />

                  <div className="min-w-0">
                    <p className="text-xs text-textSecondary">
                      อีเมล
                    </p>

                    <p className="text-sm font-medium text-textPrimary truncate">
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
                    className="text-primary"
                  />

                  <div>
                    <p className="text-xs text-textSecondary">
                      เบอร์โทร
                    </p>

                    <p className="text-sm font-medium text-textPrimary">
                      {profile.phone || 'ยังไม่ได้ระบุ'}
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
                    className="text-primary"
                  />

                  <div>
                    <p className="text-xs text-textSecondary">
                      ประเภท
                    </p>

                    <p className="text-sm font-medium text-textPrimary">
                      {profile.visitor_type
                        ? VISITOR_LABELS[
                            profile.visitor_type
                          ]
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            AVATAR TAB
        =================================================== */}
        {activeTab === 'avatar' && (
          <div
            className="
              grid
              grid-cols-1
              xl:grid-cols-[1fr_1fr]
              gap-7
              w-full
            "
          >
            <div
              className="
                bg-surface
                border
                border-border
                rounded-2xl
                shadow-sm
                p-8
                min-h-[420px]
                flex
                flex-col
                items-center
                justify-center
                text-center
              "
            >
              <div
                className="
                  w-44
                  h-44
                  rounded-full
                  bg-primary/10
                  flex
                  items-center
                  justify-center
                  text-5xl
                  font-bold
                  text-primary
                  overflow-hidden
                  border-4
                  border-background
                  shadow-lg
                "
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initial
                )}
              </div>

              <h2 className="text-xl font-bold text-textPrimary mt-6">
                รูปโปรไฟล์ปัจจุบัน
              </h2>

              <p className="text-sm text-textSecondary mt-2">
                ใช้รูปภาพที่มองเห็นใบหน้าได้ชัดเจน
              </p>
            </div>

            <div
              className="
                bg-surface
                border
                border-border
                rounded-2xl
                shadow-sm
                p-8
                min-h-[420px]
                flex
                flex-col
                justify-center
              "
            >
              <ImageIcon
                size={38}
                className="text-primary mb-5"
              />

              <h2 className="text-xl font-bold text-textPrimary">
                เปลี่ยนรูปโปรไฟล์
              </h2>

              <p className="text-sm text-textSecondary mt-2 mb-7">
                รองรับไฟล์รูปภาพ JPG, PNG
                และไฟล์รูปภาพทั่วไป ขนาดไม่เกิน 3MB
              </p>

              {uploading && (
                <p className="text-sm text-textSecondary mb-4">
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

        {/* ===================================================
            PASSWORD TAB
        =================================================== */}
        {activeTab === 'password' && (
          <div
            className="
              grid
              grid-cols-1
              xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]
              gap-7
              w-full
            "
          >
            <form
              onSubmit={handleChangePassword}
              className="
                bg-surface
                border
                border-border
                rounded-2xl
                shadow-sm
                p-8
              "
            >
              <h2 className="text-xl font-bold text-textPrimary">
                เปลี่ยนรหัสผ่าน
              </h2>

              <p className="text-sm text-textSecondary mt-1 mb-7">
                ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Input
                  label="รหัสผ่านใหม่"
                  type="password"
                  value={pwForm.password}
                  onChange={(e) =>
                    setPwForm({
                      ...pwForm,
                      password: e.target.value,
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
                      confirm: e.target.value,
                    })
                  }
                  required
                />
              </div>

              {pwMessage && (
                <p
                  className={`
                    text-sm
                    mt-5

                    ${
                      pwMessage.includes('สำเร็จ')
                        ? 'text-success'
                        : 'text-danger'
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

            {/* SECURITY INFO */}
            <div
              className="
                rounded-2xl
                border
                border-primary/20
                bg-primary/5
                p-8
                h-fit
              "
            >
              <Shield
                size={34}
                className="text-primary mb-5"
              />

              <h3 className="text-lg font-bold text-textPrimary">
                ความปลอดภัยของบัญชี
              </h3>

              <p className="text-sm text-textSecondary mt-3 leading-6">
                รหัสผ่านใหม่ควรมีอย่างน้อย 6 ตัวอักษร
                และไม่ควรใช้รหัสผ่านเดียวกับบริการอื่น
                เพื่อช่วยรักษาความปลอดภัยของบัญชี
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}