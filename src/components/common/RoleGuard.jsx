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
  const profileMatchesSession = Boolean(
    session?.user?.id && profile?.id === session.user.id
  )

  if (
    loading ||
    (session && profileLoading && !profileMatchesSession)
  ) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center" aria-busy="true">
        <LoadingState />
      </div>
    )
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
    (!profileMatchesSession || !allowedRoles.includes(profile?.role))
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