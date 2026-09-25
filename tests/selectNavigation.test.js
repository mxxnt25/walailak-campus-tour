import test from 'node:test'
import assert from 'node:assert/strict'
import { firstEnabledIndex, nextEnabledIndex } from '../src/utils/selectNavigation.js'

const options = [
  { disabled: false },
  { disabled: true },
  { disabled: false },
]

test('dropdown arrow navigation skips disabled items and wraps in both directions', () => {
  assert.equal(nextEnabledIndex(options, 0, 1), 2)
  assert.equal(nextEnabledIndex(options, 2, 1), 0)
  assert.equal(nextEnabledIndex(options, 0, -1), 2)
  assert.equal(nextEnabledIndex(options, 2, -1), 0)
})

test('dropdown Home/End select the first and last enabled item', () => {
  assert.equal(firstEnabledIndex(options), 0)
  assert.equal(firstEnabledIndex(options, true), 2)
  assert.equal(firstEnabledIndex([{ disabled: true }]), -1)
  assert.equal(nextEnabledIndex([{ disabled: true }], 0, 1), -1)
  assert.equal(nextEnabledIndex([], 0, -1), -1)
})
