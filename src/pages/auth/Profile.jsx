import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { updateProfile } from '../../services/profileService'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Badge from '../../components/common/Badge'
import LoadingState from '../../components/common/LoadingState'

const ROLE_LABELS = { ADMIN: 'ผู้ดูแลระบบ', GUIDE: 'ไกด์นำทาง', VISITOR: 'ผู้เยี่ยมชม' }
const ROLE_COLORS = { ADMIN: 'danger', GUIDE: 'warning', VISITOR: 'primary' }

export default function Profile() {
  const { profile, loading, refreshProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ full_name: '', phone: '' })
  const [saving, setSaving] = useState(false)

  if (loading) return <LoadingState />
  if (!profile) return <p className="text-textSecondary text-center mt-10">กรุณาเข้าสู่ระบบ</p>

  function startEdit() {
    setForm({ full_name: profile.full_name || '', phone: profile.phone || '' })
    setEditing(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile(profile.id, form)
      await refreshProfile()
      setEditing(false)
    } catch (err) {
      alert('บันทึกไม่สำเร็จ: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const initial = (profile.full_name || '?').charAt(0).toUpperCase()

  return (
    <div className="max-w-lg mx-auto mt-6">
      <Card className="!p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-accent px-6 py-8 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-white flex items-center justify-center text-3xl font-bold text-primary shadow-md">
            {initial}
          </div>
          <h1 className="text-white font-bold text-xl mt-3">{profile.full_name}</h1>
          <div className="mt-2">
            <Badge color={ROLE_COLORS[profile.role]}>{ROLE_LABELS[profile.role] || profile.role}</Badge>
          </div>
        </div>

        <div className="p-6">
          {!editing ? (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-textSecondary text-sm">อีเมล</span>
                <span className="text-textPrimary text-sm font-medium">{profile.email}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-textSecondary text-sm">เบอร์โทร</span>
                <span className="text-textPrimary text-sm font-medium">{profile.phone || '-'}</span>
              </div>
              {profile.visitor_type && (
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-textSecondary text-sm">ประเภท</span>
                  <span className="text-textPrimary text-sm font-medium">{profile.visitor_type}</span>
                </div>
              )}
              <Button variant="secondary" onClick={startEdit} className="mt-3">
                ✏️ แก้ไขโปรไฟล์
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="flex flex-col gap-3">
              <Input label="ชื่อ-นามสกุล" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              <Input label="เบอร์โทร" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08x-xxx-xxxx" />
              <div className="flex gap-2 mt-2">
                <Button type="submit" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(false)}>ยกเลิก</Button>
              </div>
            </form>
          )}
        </div>
      </Card>
    </div>
  )
}