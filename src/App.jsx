import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'
import RoleGuard from './components/common/RoleGuard'

import Register from './pages/auth/Register'
import Login from './pages/auth/Login'
import Profile from './pages/auth/Profile'
import AdminUsers from './pages/admin/AdminUsers'

import AdminSchedules from './pages/admin/Schedules'
import GuideDashboard from './pages/guide/Dashboard'
import TourDetail from './pages/guide/TourDetail'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public / Member Routes */}
          <Route path="/" element={<PublicLayout><div className="p-6">หน้าแรก</div></PublicLayout>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* อนุญาตเฉพาะ MEMBER, GUIDE, ADMIN, SUPER_ADMIN */}
          <Route 
            path="/profile" 
            element={
              <RoleGuard allowedRoles={['MEMBER', 'GUIDE', 'ADMIN', 'SUPER_ADMIN']}>
                <Profile />
              </RoleGuard>
            } 
          />

          {/* Guide Routes (โมดูล M4) */}
          {/* อนุญาตเฉพาะ GUIDE */}
          <Route
            path="/guide"
            element={
              <RoleGuard allowedRoles={['GUIDE']}>
                <GuideDashboard />
              </RoleGuard>
            }
          />
          <Route
            path="/guide/tours/:scheduleId"
            element={
              <RoleGuard allowedRoles={['GUIDE']}>
                <TourDetail />
              </RoleGuard>
            }
          />

          {/* Admin Routes (โมดูล M1 และ M4) */}
          {/* อนุญาตเฉพาะ ADMIN และ SUPER_ADMIN */}
          <Route
            path="/admin/users"
            element={
              <RoleGuard allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                <AdminLayout><AdminUsers /></AdminLayout>
              </RoleGuard>
            }
          />
          <Route
            path="/admin/schedules"
            element={
              <RoleGuard allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                <AdminLayout><AdminSchedules /></AdminLayout>
              </RoleGuard>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App