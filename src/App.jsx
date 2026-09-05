import {
  BrowserRouter,
  Routes,
  Route,
} from 'react-router-dom'

import { AuthProvider } from './hooks/useAuth'

import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'

import RoleGuard from './components/common/RoleGuard'

/* =========================
   M1: HOME / AUTH
========================= */
import Home from './pages/Home'
import Register from './pages/auth/Register'
import Login from './pages/auth/Login'
import Profile from './pages/auth/Profile'
import AdminUsers from './pages/admin/AdminUsers'

/* =========================
   M2: ROUTES & MAP
========================= */
import RoutesList from './pages/routes/RoutesList'
import RouteDetail from './pages/routes/RouteDetail'

import RouteEdit from './pages/admin/RouteEdit'
import RouteCreate from './pages/admin/RouteCreate'
import AdminRoutes from './pages/admin/AdminRoutes'

/* =========================
   M3: BOOKING
========================= */
import BookTour from './pages/bookings/BookTour'
import MyBookings from './pages/bookings/MyBookings'
import BookingDetail from './pages/bookings/BookingDetail'

/* =========================
   M6: REVIEW
========================= */
import Review from './pages/reviews/Review'


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* =========================
              M1: HOME
          ========================= */}
          <Route
            path="/"
            element={
              <PublicLayout>
                <Home />
              </PublicLayout>
            }
          />


          {/* =========================
              M1: AUTH
          ========================= */}
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


          {/* =========================
              M2: CAMPUS ROUTES & MAP
          ========================= */}
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


          {/* =========================
              M3: TOUR BOOKING
          ========================= */}

          {/* จองรอบทัวร์ */}
          <Route
            path="/book/:scheduleId"
            element={
              <PublicLayout>
                <BookTour />
              </PublicLayout>
            }
          />

          {/* ดูรายการจองของตัวเอง */}
          <Route
            path="/my-bookings"
            element={
              <PublicLayout>
                <MyBookings />
              </PublicLayout>
            }
          />

          {/* รายละเอียด Booking */}
          <Route
            path="/bookings/:id"
            element={
              <PublicLayout>
                <BookingDetail />
              </PublicLayout>
            }
          />


          {/* =========================
              M6: REVIEW & FEEDBACK
          ========================= */}

          {/* หน้ารวม Review */}
          <Route
            path="/reviews"
            element={
              <PublicLayout>
                <Review />
              </PublicLayout>
            }
          />

          {/* เขียน Review จาก Booking */}
          <Route
            path="/reviews/new/:bookingId"
            element={
              <PublicLayout>
                <Review />
              </PublicLayout>
            }
          />


          {/* =========================
              ADMIN - M1
          ========================= */}
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


          {/* =========================
              ADMIN - M2
          ========================= */}
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