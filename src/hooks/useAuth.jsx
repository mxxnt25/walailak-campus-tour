import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'
import { getProfile } from '../services/profileService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)

  async function loadProfile(userId) {
    setProfileLoading(true)
    try {
      const p = await getProfile(userId)
      setProfile(p)
    } catch (err) {
      console.error('Failed to load profile:', err.message)
      setProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) {
        loadProfile(data.session.user.id)
      } else {
        setProfileLoading(false)
      }
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        loadProfile(newSession.user.id)
      } else {
        setProfile(null)
        setProfileLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        setProfile,
        loading,
        profileLoading,
        refreshProfile: () => session?.user && loadProfile(session.user.id),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}