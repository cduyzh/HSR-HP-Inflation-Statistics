export function fmtInt(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '0'
  return Math.round(v).toLocaleString('en-US')
}

export function fmtShort(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '0'
  const abs = Math.abs(v)
  const trim = value => value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
  if (abs >= 1e9) return `${trim(v / 1e9)}B`
  if (abs >= 1e6) return `${trim(v / 1e6)}M`
  if (abs >= 1e3) return `${trim(v / 1e3)}K`
  return fmtInt(v)
}

export function fmtPct(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '0%'
  const p = n * 100
  return `${p.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}%`
}

// ECharts tooltip 的 formatter 返回值按 innerHTML 渲染，插值的上游文本必须先转义。
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
