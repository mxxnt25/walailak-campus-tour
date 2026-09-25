import test from 'node:test'
import assert from 'node:assert/strict'
import {
  initialPasswordRecoveryState,
  invalidPasswordRecoveryState,
  nextPasswordRecoveryState,
} from '../src/utils/passwordRecoveryState.js'

test('normal or absent initial session never unlocks reset form', () => {
  assert.deepEqual(
    nextPasswordRecoveryState(initialPasswordRecoveryState, 'INITIAL_SESSION', {
      user: { id: 'member-a' },
    }),
    invalidPasswordRecoveryState,
  )
  assert.deepEqual(
    nextPasswordRecoveryState(initialPasswordRecoveryState, 'INITIAL_SESSION', null),
    invalidPasswordRecoveryState,
  )
})

test('only a Supabase recovery event with a user unlocks the form', () => {
  const ready = nextPasswordRecoveryState(initialPasswordRecoveryState, 'PASSWORD_RECOVERY', {
    user: { id: 'member-a' },
  })
  assert.deepEqual(ready, { status: 'ready', userId: 'member-a' })
  assert.deepEqual(
    nextPasswordRecoveryState(initialPasswordRecoveryState, 'PASSWORD_RECOVERY', null),
    invalidPasswordRecoveryState,
  )
})

test('sign-out or switching account invalidates the recovery grant', () => {
  const ready = { status: 'ready', userId: 'member-a' }
  assert.deepEqual(
    nextPasswordRecoveryState(ready, 'SIGNED_OUT', null),
    invalidPasswordRecoveryState,
  )
  assert.deepEqual(
    nextPasswordRecoveryState(ready, 'SIGNED_IN', { user: { id: 'member-b' } }),
    invalidPasswordRecoveryState,
  )
  assert.equal(
    nextPasswordRecoveryState(ready, 'TOKEN_REFRESHED', { user: { id: 'member-a' } }),
    ready,
  )
})
