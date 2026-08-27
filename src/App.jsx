import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'
import RoleGuard from './components/common/RoleGuard'
import Register from './pages/auth/Register'
import Login from './pages/auth/Login'
import Profile from './pages/auth/Profile'
import AdminUsers from './pages/admin/AdminUsers'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicLayout><div className="p-6">หน้าแรก</div></PublicLayout>} />
          <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
          <Route path="/register" element={<PublicLayout><Register /></PublicLayout>} />
          <Route path="/profile" element={<PublicLayout><Profile /></PublicLayout>} />
          <Route
            path="/admin/users"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <AdminLayout><AdminUsers /></AdminLayout>
              </RoleGuard>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App