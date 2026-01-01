const PREFIX = 'pk_web_cache_'

const makeKey = (key) => PREFIX + String(key || '')

export const setCache = (key, value) => {
  try {
    const payload = { t: Date.now(), v: value }
    localStorage.setItem(makeKey(key), JSON.stringify(payload))
  } catch (_) {}
}

export const getCache = (key, ttlMs) => {
  try {
    const raw = localStorage.getItem(makeKey(key))
    if (!raw) return null
    const payload = JSON.parse(raw)
    if (!payload || typeof payload.t !== 'number') return null
    if (ttlMs && ttlMs > 0 && Date.now() - payload.t > ttlMs) return null
    return payload.v
  } catch (_) {
    return null
  }
}

