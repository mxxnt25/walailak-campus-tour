import { useAuth } from '../../hooks/useAuth'
import { signOut } from '../../services/authService'
import { useNavigate } from 'react-router-dom'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import LoadingState from '../../components/common/LoadingState'

export default function Profile() {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()

  if (loading) return <LoadingState />
  if (!profile) return <p className="text-textSecondary">กรุณาเข้าสู่ระบบ</p>

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <Card>
        <h1 className="text-xl font-bold text-primary mb-2">โปรไฟล์ของฉัน</h1>
        <div className="flex flex-col gap-2 mt-4">
          <p><span className="text-textSecondary">ชื่อ:</span> {profile.full_name}</p>
          <p><span className="text-textSecondary">อีเมล:</span> {profile.email}</p>
          <p>
            <span className="text-textSecondary">สิทธิ์:</span>{' '}
            <Badge color={profile.role === 'ADMIN' ? 'danger' : profile.role === 'GUIDE' ? 'warning' : 'primary'}>
              {profile.role}
            </Badge>
          </p>
          {profile.visitor_type && <p><span className="text-textSecondary">ประเภท:</span> {profile.visitor_type}</p>}
        </div>
        <Button variant="secondary" onClick={handleSignOut} className="mt-6">
          ออกจากระบบ
        </Button>
      </Card>
    </div>
  )
}