import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, User, Lock, Image as ImageIcon, LogOut, Shield } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { updateProfile, uploadAvatar } from '../../services/profileService'
import { signOut, changePassword } from '../../services/authService'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Badge from '../../components/common/Badge'
import LoadingState from '../../components/common/LoadingState'

const ROLE_LABELS = { ADMIN: 'ผู้ดูแลระบบ', GUIDE: 'ไกด์นำทาง', VISITOR: 'ผู้เยี่ยมชม' }
const VISITOR_LABELS = { STUDENT: 'นักศึกษา', STAFF: 'บุคลากร', EXTERNAL: 'บุคคลภายนอก' }
const ROLE_COLORS = { ADMIN: 'danger', GUIDE: 'warning', VISITOR: 'primary' }

const TABS = [
  { id: 'info', label: 'ข้อมูลส่วนตัว', icon: User },
  { id: 'avatar', label: 'เปลี่ยนรูปโปรไฟล์', icon: ImageIcon },
  { id: 'password', label: 'เปลี่ยนรหัสผ่าน', icon: Lock },
]

export default function Profile() {
  const { profile, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [activeTab, setActiveTab] = useState('info')
  const [form, setForm] = useState({ full_name: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMessage, setPwMessage] = useState('')

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState />
      </div>
    )
  }
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-textSecondary">กรุณาเข้าสู่ระบบ</p>
      </div>
    )
  }

  // เติมค่าเริ่มต้นของฟอร์มข้อมูลส่วนตัวจาก profile ปัจจุบัน (ทำครั้งแรกที่มี profile)
  if (form.full_name === '' && form.phone === '' && profile.full_name && !saving) {
    if (form._init !== profile.id) {
      setForm({ full_name: profile.full_name || '', phone: profile.phone || '', _init: profile.id })
    }
  }

  async function handleSaveInfo(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile(profile.id, { full_name: form.full_name, phone: form.phone })
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
      await updateProfile(profile.id, { avatar_url: url })
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
      setPwForm({ password: '', confirm: '' })
    } catch (err) {
      setPwMessage('เปลี่ยนรหัสผ่านไม่สำเร็จ: ' + err.message)
    } finally {
      setPwSaving(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const initial = (profile.full_name || '?').charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-primary to-primary/90 text-white flex flex-col p-6">
        <div className="flex flex-col items-center text-center border-b border-white/20 pb-6 mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-white/30 bg-white/10 flex items-center justify-center text-2xl font-bold overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white text-primary flex items-center justify-center shadow-md hover:bg-white/90"
              title="เปลี่ยนรูปโปรไฟล์"
            >
              <Camera size={12} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <h2 className="font-bold mt-3">{profile.full_name}</h2>
          <div className="mt-1">
            <Badge color={ROLE_COLORS[profile.role]}>{profile.role}</Badge>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-button text-sm text-left transition ${
                activeTab === tab.id ? 'bg-white/20 font-medium' : 'hover:bg-white/10'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}

          {profile.role === 'ADMIN' && (
            <button
              onClick={() => navigate('/admin/users')}
              className="flex items-center gap-3 px-3 py-2.5 rounded-button text-sm text-left hover:bg-white/10 mt-2"
            >
              <Shield size={16} />
              จัดการผู้ใช้
            </button>
          )}
        </nav>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-button text-sm hover:bg-white/10 mt-4 border-t border-white/20 pt-4"
        >
          <LogOut size={16} />
          ออกจากระบบ
        </button>
      </aside>

      {/* เนื้อหาหลัก */}
      <main className="flex-1 p-8">
        <div className="max-w-xl">
          <h1 className="text-2xl font-bold text-textPrimary mb-6">บัญชีผู้ใช้ของฉัน</h1>

          {/* แท็บของหน้าจอเล็ก (ซ่อน sidebar ไม่ได้ตัด แค่โชว์คู่กัน) */}
          <div className="flex gap-2 mb-6 border-b border-border">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-textSecondary hover:text-textPrimary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: ข้อมูลส่วนตัว */}
          {activeTab === 'info' && (
            <form onSubmit={handleSaveInfo} className="bg-surface border border-border rounded-card p-6 flex flex-col gap-4">
              <Input label="ชื่อ-นามสกุล" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              <Input label="เบอร์โทร" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08x-xxx-xxxx" />
              <Input label="อีเมล" value={profile.email} disabled />
              {profile.visitor_type && (
                <Input label="ประเภท" value={VISITOR_LABELS[profile.visitor_type]} disabled />
              )}
              <Button type="submit" disabled={saving} className="self-start mt-2">
                {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </Button>
            </form>
          )}

          {/* Tab: เปลี่ยนรูปโปรไฟล์ */}
          {activeTab === 'avatar' && (
            <div className="bg-surface border border-border rounded-card p-6 flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary overflow-hidden border-4 border-background shadow">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              {uploading && <p className="text-sm text-textSecondary">กำลังอัปโหลด...</p>}
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                เลือกรูปใหม่
              </Button>
              <p className="text-xs text-textSecondary">รองรับไฟล์รูปภาพ ขนาดไม่เกิน 3MB</p>
            </div>
          )}

          {/* Tab: เปลี่ยนรหัสผ่าน */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="bg-surface border border-border rounded-card p-6 flex flex-col gap-4">
              <Input
                label="รหัสผ่านใหม่"
                type="password"
                value={pwForm.password}
                onChange={(e) => setPwForm({ ...pwForm, password: e.target.value })}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                required
              />
              <Input
                label="ยืนยันรหัสผ่านใหม่"
                type="password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                required
              />
              {pwMessage && (
                <p className={`text-sm ${pwMessage.includes('สำเร็จ') ? 'text-success' : 'text-danger'}`}>
                  {pwMessage}
                </p>
              )}
              <Button type="submit" disabled={pwSaving} className="self-start mt-2">
                {pwSaving ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}