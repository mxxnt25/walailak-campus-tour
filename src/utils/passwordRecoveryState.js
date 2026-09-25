// Only a Supabase PASSWORD_RECOVERY event can unlock the reset form.
// An ordinary cached login session or a URL query parameter is not proof.
export const initialPasswordRecoveryState = Object.freeze({
  status: 'checking',
  userId: null,
})

export const invalidPasswordRecoveryState = Object.freeze({
  status: 'invalid',
  userId: null,
})

export function nextPasswordRecoveryState(current, event, session) {
  if (event === 'PASSWORD_RECOVERY') {
    return session?.user?.id
      ? { status: 'ready', userId: session.user.id }
      : invalidPasswordRecoveryState
  }

  if (event === 'SIGNED_OUT') return invalidPasswordRecoveryState

  if (event === 'INITIAL_SESSION' && current.status === 'checking') {
    return invalidPasswordRecoveryState
  }

  if (
    event === 'SIGNED_IN' &&
    current.status === 'ready' &&
    session?.user?.id !== current.userId
  ) {
    return invalidPasswordRecoveryState
  }

  return current
}
