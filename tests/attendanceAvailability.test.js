import test from 'node:test'
import assert from 'node:assert/strict'
import { attendanceAvailability } from '../src/services/m4/rules.js'

const schedule = {
  tour_date: '2026-09-27',
  start_time: '14:00:00',
  end_time: '15:00:00',
  status: 'FULL',
}
const start = Date.parse('2026-09-27T14:00:00+07:00')

function flags(now, overrides = {}) {
  const result = attendanceAvailability({ ...schedule, ...overrides }, now)
  return [result.canCheckIn, result.canNoShow]
}

test('two days early: neither attendance action is enabled', () => {
  assert.deepEqual(flags(start - 2 * 24 * 60 * 60_000), [false, false])
})

test('check-in opens exactly 60 minutes before the tour', () => {
  assert.deepEqual(flags(start - 60 * 60_000 - 1), [false, false])
  assert.deepEqual(flags(start - 60 * 60_000), [true, false])
})

test('no-show opens exactly 15 minutes after start', () => {
  assert.deepEqual(flags(start + 15 * 60_000 - 1), [true, false])
  assert.deepEqual(flags(start + 15 * 60_000), [true, true])
})

test('both actions close after the tour ends', () => {
  assert.deepEqual(flags(start + 60 * 60_000), [true, true])
  assert.deepEqual(flags(start + 60 * 60_000 + 1), [false, false])
})

test('closed booking-status tours can still record on-time attendance', () => {
  assert.deepEqual(flags(start, { status: 'CLOSED' }), [true, false])
})

test('completed/cancelled and malformed schedules cannot record attendance', () => {
  assert.deepEqual(flags(start, { status: 'COMPLETED' }), [false, false])
  assert.deepEqual(flags(start, { status: 'CANCELLED' }), [false, false])
  assert.deepEqual(flags(start, { end_time: '10:00:00' }), [false, false])
})
