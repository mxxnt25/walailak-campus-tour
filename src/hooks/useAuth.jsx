import {
  useState,
  useEffect,
  createContext,
  useContext,
} from 'react'

import { supabase } from '../lib/supabase'
import { getProfile } from '../services/profileService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] =
    useState(true)

  async function loadProfile(userId) {
    setProfileLoading(true)

    try {
      const result = await getProfile(userId)

      if (!result.success) {
        throw new Error(result.error.message)
      }

      setProfile(result.data)
    } catch (err) {
      console.error(
        'Failed to load profile:',
        err.message
      )

      setProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session)

        if (data.session?.user) {
          loadProfile(data.session.user.id)
        } else {
          setProfile(null)
          setProfileLoading(false)
        }

        setLoading(false)
      })

    const { data: listener } =
      supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          setSession(newSession)

          if (newSession?.user) {
            loadProfile(newSession.user.id)
          } else {
            setProfile(null)
            setProfileLoading(false)
          }
        }
      )

    return () =>
      listener.subscription.unsubscribe()
  }, [])

  async function refreshProfile() {
    if (!session?.user) {
      setProfile(null)
      return
    }

    await loadProfile(session.user.id)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        setProfile,
        loading,
        profileLoading,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
