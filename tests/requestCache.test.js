import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequestCache } from '../src/utils/requestCache.js'

test('reuses the in-flight public request and its fresh result', async () => {
  let calls = 0
  let finish
  const cache = createRequestCache({ ttlMs: 30_000 })
  const loader = () => {
    calls++
    return new Promise((resolve) => { finish = resolve })
  }
  const first = cache.load(loader)
  const second = cache.load(loader)
  await Promise.resolve()
  assert.equal(calls, 1)
  assert.equal(first, second)
  finish({ success: true, data: [{ id: 'route-1' }] })
  assert.deepEqual((await first).data, [{ id: 'route-1' }])
  assert.deepEqual((await cache.load(loader)).data, [{ id: 'route-1' }])
  assert.equal(calls, 1)
})

test('expires entries and does not cache unsuccessful responses', async () => {
  let time = 0
  let calls = 0
  const cache = createRequestCache({ ttlMs: 10, now: () => time })
  const loader = async () => ({ success: ++calls > 1, data: calls })
  assert.equal((await cache.load(loader)).success, false)
  assert.equal(cache.peek(), null)
  assert.equal((await cache.load(loader)).data, 2)
  assert.equal((await cache.load(loader)).data, 2)
  time = 10
  assert.equal(cache.peek(), null)
  assert.equal((await cache.load(loader)).data, 3)
})

test('invalidation prevents a stale in-flight read repopulating the cache', async () => {
  let finish
  const cache = createRequestCache()
  const oldRequest = cache.load(() => new Promise((resolve) => { finish = resolve }))
  await Promise.resolve()
  cache.invalidate()
  const fresh = await cache.load(async () => ({ success: true, data: 'new' }))
  finish({ success: true, data: 'old' })
  assert.equal((await oldRequest).data, 'old')
  assert.equal(fresh.data, 'new')
  assert.equal(cache.peek().data, 'new')
})

test('a rejected fetch can be retried normally', async () => {
  const cache = createRequestCache()
  await assert.rejects(cache.load(async () => { throw new Error('network down') }))
  assert.equal(cache.peek(), null)
  assert.deepEqual((await cache.load(async () => ({ success: true, data: [] }))).data, [])
})
