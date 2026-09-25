import {
  useState,
  useEffect,
  useRef,
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
  // Ignore profile responses belonging to a previous session or request.
  const profileRequestRef = useRef(0)
  const currentUserIdRef = useRef(null)

  async function loadProfile(userId) {
    const requestId = ++profileRequestRef.current
    setProfileLoading(true)

    try {
      const result = await getProfile(userId)

      if (
        requestId !== profileRequestRef.current ||
        currentUserIdRef.current !== userId
      ) return

      if (!result.success) {
        throw new Error(result.error?.message || 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้')
      }

      setProfile(result.data)
    } catch (err) {
      if (
        requestId !== profileRequestRef.current ||
        currentUserIdRef.current !== userId
      ) return

      console.error(
        'Failed to load profile:',
        err?.message || err
      )

      setProfile(null)
    } finally {
      if (
        requestId === profileRequestRef.current &&
        currentUserIdRef.current === userId
      ) setProfileLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    let receivedAuthEvent = false
    const requestRef = profileRequestRef

    function applySession(nextSession) {
      if (!active) return

      const nextUserId = nextSession?.user?.id || null
      const userChanged = currentUserIdRef.current !== nextUserId
      currentUserIdRef.current = nextUserId
      setSession(nextSession)

      if (userChanged) {
        ++profileRequestRef.current
        setProfile(null)
      }

      if (nextUserId) {
        loadProfile(nextUserId)
      } else {
        ++profileRequestRef.current
        setProfile(null)
        setProfileLoading(false)
      }

      setLoading(false)
    }

    supabase.auth.getSession()
      .then(({ data, error }) => {
        // An auth event can be newer than the initial getSession response.
        if (!active || receivedAuthEvent) return
        if (error) console.error('Failed to initialize session:', error.message)
        applySession(data?.session || null)
      })
      .catch((err) => {
        if (!active || receivedAuthEvent) return
        console.error('Failed to initialize session:', err)
        applySession(null)
      })

    const { data: listener } =
      supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          receivedAuthEvent = true
          applySession(newSession)
        }
      )

    return () => {
      active = false
      ++requestRef.current
      listener.subscription.unsubscribe()
    }
  }, [])

  async function refreshProfile() {
    if (!session?.user || currentUserIdRef.current !== session.user.id) {
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
