// In-memory, success-only cache. Reuse in-flight work and ignore results from
// requests started before a mutation invalidated the cache.
export function createRequestCache({ ttlMs = 30_000, now = Date.now } = {}) {
  let cached = null
  let expiresAt = 0
  let pending = null
  let generation = 0

  function peek() {
    return cached && now() < expiresAt ? cached : null
  }

  function load(loader) {
    const warm = peek()
    if (warm) return Promise.resolve(warm)
    if (pending) return pending

    const requestGeneration = generation
    const work = Promise.resolve()
      .then(loader)
      .then((result) => {
        if (result?.success && generation === requestGeneration) {
          cached = result
          expiresAt = now() + ttlMs
        }
        return result
      })
      .finally(() => {
        if (pending === work) pending = null
      })
    pending = work
    return work
  }

  function invalidate() {
    generation += 1
    cached = null
    expiresAt = 0
    pending = null
  }

  return { peek, load, invalidate }
}
