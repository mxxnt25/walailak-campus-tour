import {
  BrowserRouter,
  Routes,
  Route,
} from 'react-router-dom'

import { AuthProvider } from './hooks/useAuth'

import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'

import RoleGuard from './components/common/RoleGuard'

import Register from './pages/auth/Register'
import Login from './pages/auth/Login'
import Profile from './pages/auth/Profile'
import AdminUsers from './pages/admin/AdminUsers'
import RouteEdit from './pages/admin/RouteEdit'
import RouteCreate from './pages/admin/RouteCreate'
import AdminRoutes from './pages/admin/AdminRoutes'

import RoutesList from './pages/routes/RoutesList'
import RouteDetail from './pages/routes/RouteDetail'

import Review from './pages/reviews/Review'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <PublicLayout>
                <div className="p-6">
                  หน้าแรก
                </div>
              </PublicLayout>
            }
          />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<Register />}
          />

          <Route
            path="/profile"
            element={<Profile />}
          />

          {/* M2: Campus Routes & Map */}
          <Route
            path="/routes"
            element={
              <PublicLayout>
                <RoutesList />
              </PublicLayout>
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

          {/* M6: Review & Feedback */}
          <Route
            path="/reviews"
            element={
              <PublicLayout>
                <Review />
              </PublicLayout>
            }
          />

          <Route
            path="/reviews/new/:bookingId"
            element={
              <PublicLayout>
                <Review />
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
            path="/admin/routes"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <AdminLayout>
                  <AdminRoutes />
                </AdminLayout>
              </RoleGuard>
            }
          />

          <Route
            path="/admin/routes/new"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <AdminLayout>
                  <RouteCreate />
                </AdminLayout>
              </RoleGuard>
            }
          />

          <Route
            path="/admin/routes/:id/edit"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <AdminLayout>
                  <RouteEdit />
                </AdminLayout>
              </RoleGuard>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App