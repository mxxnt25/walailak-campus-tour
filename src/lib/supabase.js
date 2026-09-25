import { createClient } from '@supabase/supabase-js'
import {
  initialPasswordRecoveryState,
  invalidPasswordRecoveryState,
  nextPasswordRecoveryState,
} from '../utils/passwordRecoveryState'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Listen before React mounts: Supabase may consume the recovery URL on startup.
let passwordRecoveryState = initialPasswordRecoveryState
const passwordRecoveryListeners = new Set()

function publishPasswordRecovery(next) {
  if (
    next.status === passwordRecoveryState.status &&
    next.userId === passwordRecoveryState.userId
  ) return

  passwordRecoveryState = next
  for (const listener of passwordRecoveryListeners) listener()
}

export function getPasswordRecoveryState() {
  return passwordRecoveryState
}

export function subscribePasswordRecovery(listener) {
  passwordRecoveryListeners.add(listener)
  return () => passwordRecoveryListeners.delete(listener)
}

export function clearPasswordRecovery() {
  publishPasswordRecovery(invalidPasswordRecoveryState)
}

supabase.auth.onAuthStateChange((event, session) => {
  publishPasswordRecovery(
    nextPasswordRecoveryState(passwordRecoveryState, event, session),
  )
})
