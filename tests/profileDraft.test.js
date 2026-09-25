import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveProfileForm, updateProfileDraft } from '../src/utils/profileDraft.js'

const userA = { id: 'member-a', full_name: 'ชื่อเดิม', phone: '0811111111' }

test('shows saved values before the member edits a field', () => {
  assert.deepEqual(resolveProfileForm(userA, null), {
    full_name: 'ชื่อเดิม',
    phone: '0811111111',
  })
})

test('keeps unsaved edits when the same user profile refreshes after tab focus', () => {
  const draft = updateProfileDraft(userA, null, { full_name: 'ชื่อที่ยังไม่บันทึก' })
  const withPhone = updateProfileDraft(userA, draft, { phone: '0899999999' })
  const refreshedProfile = { ...userA, full_name: 'ชื่อเดิม' }

  assert.deepEqual(resolveProfileForm(refreshedProfile, withPhone), {
    full_name: 'ชื่อที่ยังไม่บันทึก',
    phone: '0899999999',
  })
})

test('does not show one member\'s draft to another account', () => {
  const draft = updateProfileDraft(userA, null, { full_name: 'ข้อมูลเฉพาะบัญชี A' })
  const userB = { id: 'member-b', full_name: 'บัญชี B', phone: '0822222222' }

  assert.deepEqual(resolveProfileForm(userB, draft), {
    full_name: 'บัญชี B',
    phone: '0822222222',
  })
})

test('uses saved normalized values instead of the previous draft', () => {
  const draft = updateProfileDraft(userA, null, { full_name: '  ชื่อใหม่  ' })
  const savedDraft = updateProfileDraft(userA, null, {
    full_name: 'ชื่อใหม่',
    phone: '',
  })

  assert.equal(resolveProfileForm(userA, draft).full_name, '  ชื่อใหม่  ')
  assert.deepEqual(resolveProfileForm({ ...userA, full_name: 'ชื่อใหม่' }, savedDraft), {
    full_name: 'ชื่อใหม่',
    phone: '',
  })
})
