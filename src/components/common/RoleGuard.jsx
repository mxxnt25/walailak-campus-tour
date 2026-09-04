import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import LoadingState from './LoadingState'

export default function RoleGuard({ allowedRoles, children }) {
  const { session, profile, loading, profileLoading } = useAuth()

  if (loading || (profileLoading && !profile)) {
    return <LoadingState />
  }
  if (!session) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    return <Navigate to="/profile" replace />
  }
  return children
}