export function fmtInt(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '0'
  return Math.round(v).toLocaleString('en-US')
}

export function fmtShort(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '0'
  const abs = Math.abs(v)
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2).replace(/\.00$/, '')}B`
  if (abs >= 1e6) return `${(v / 1e6).toFixed(2).replace(/\.00$/, '')}M`
  if (abs >= 1e3) return `${(v / 1e3).toFixed(2).replace(/\.00$/, '')}K`
  return fmtInt(v)
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

export function fmtPct(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '0%'
  const p = n * 100
  return `${p.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}%`
}

export function safeText(v) {
  return String(v ?? '').trim()
}
