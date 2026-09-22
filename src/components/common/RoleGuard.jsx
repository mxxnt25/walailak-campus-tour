import {
  Navigate,
  useLocation,
} from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import LoadingState from './LoadingState'

function getRoleHome(role) {
  switch (role) {
    case 'GUIDE':
      return '/guide'

    case 'ADMIN':
    case 'SUPER_ADMIN':
      return '/admin'

    case 'MEMBER':
    default:
      return '/'
  }
}

export default function RoleGuard({
  allowedRoles,
  children,
}) {
  const {
    session,
    profile,
    loading,
    profileLoading,
  } = useAuth()

  const location = useLocation()

  if (
    loading ||
    (session && profileLoading && !profile)
  ) {
    return <LoadingState />
  }

  if (!session) {
    const returnTo =
      location.pathname +
      location.search +
      location.hash

    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(returnTo)}`}
        replace
        state={{
          from: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
        }}
      />
    )
  }

  if (
    allowedRoles &&
    !allowedRoles.includes(profile?.role)
  ) {
    return (
      <Navigate
        to={getRoleHome(profile?.role)}
        replace
      />
    )
  }

  return children
}