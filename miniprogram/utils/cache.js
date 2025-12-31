const set = (key, value, ttlMs) => {
  try {
    const expiresAt = Date.now() + Math.max(0, Number(ttlMs || 0))
    wx.setStorageSync(key, { value, expiresAt })
  } catch (_) {}
}

const get = (key) => {
  try {
    const obj = wx.getStorageSync(key)
    if (obj && typeof obj === 'object' && obj.expiresAt && typeof obj.expiresAt === 'number') {
      if (Date.now() < obj.expiresAt) return obj.value
    }
    return null
  } catch (_) { return null }
}

const clear = (key) => {
  try { wx.removeStorageSync(key) } catch (_) {}
}

module.exports = { set, get, clear }

