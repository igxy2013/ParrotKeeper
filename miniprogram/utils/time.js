function parseServerTime(value) {
  if (!value) return null
  try {
    if (value instanceof Date) return value
    if (typeof value === 'number') {
      const dNum = new Date(value)
      return isNaN(dNum.getTime()) ? null : dNum
    }
    if (typeof value === 'string') {
      const s = value.trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d0 = new Date(`${s}T00:00:00`)
        return isNaN(d0.getTime()) ? null : d0
      }
      if (/[Zz]|[+\-]\d{2}:?\d{2}$/.test(s)) {
        const dz = new Date(s)
        return isNaN(dz.getTime()) ? null : dz
      }
      if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(s)) {
        let local = s.replace('T', ' ').replace(/-/g, '/')
        if (/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/.test(local)) local = local + ':00'
        const dLocal = new Date(local)
        if (!isNaN(dLocal.getTime())) return dLocal
        let iso = s.includes(' ') ? s.replace(' ', 'T') : s
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(iso)) iso = iso + ':00'
        const dIso = new Date(iso)
        if (!isNaN(dIso.getTime())) return dIso
      }
      const dDirect = new Date(s)
      if (!isNaN(dDirect.getTime())) return dDirect
      const dUtc = new Date(s + 'Z')
      return isNaN(dUtc.getTime()) ? null : dUtc
    }
    return null
  } catch (_) {
    return null
  }
}

function parseServerTimestamp(value) {
  const d = parseServerTime(value)
  return d ? d.getTime() : 0
}

module.exports = { parseServerTime, parseServerTimestamp }

