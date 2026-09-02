import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'
import RoleGuard from './components/common/RoleGuard'
import Register from './pages/auth/Register'
import Login from './pages/auth/Login'
import Profile from './pages/auth/Profile'
import AdminUsers from './pages/admin/AdminUsers'
import RoutesList from './pages/routes/RoutesList'
import RouteDetail from './pages/routes/RouteDetail'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <PublicLayout>
                <div className="p-6">หน้าแรก</div>
              </PublicLayout>
            }
          />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />

          <Route
            path="/routes"
            element={
              <PublicLayout>
                <RoutesList />
              </PublicLayout>
            }
          />

          <Route
            path="/admin/users"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <AdminLayout>
                  <AdminUsers />
                </AdminLayout>
              </RoleGuard>
            }
          />

          <Route
            path="/routes/:id"
            element={
              <PublicLayout>
                <RouteDetail />
              </PublicLayout>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App