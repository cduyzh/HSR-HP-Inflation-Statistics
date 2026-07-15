const JSON_CACHE_PREFIX = 'hsr-endgame:json:'
const jsonMemoryCache = new Map()
const jsonRequestCache = new Map()

export const MODES = {
  moc: {
    key: 'moc',
    label: '忘却之庭',
    listPath: ver => `/hsr/${ver}/maze.json`,
    detailPath: (ver, id, locale) => `/hsr/${ver}/${locale}/maze/${id}.json`,
    idMin: 1000,
  },
  fiction: {
    key: 'fiction',
    label: '虚构叙事',
    listPath: ver => `/hsr/${ver}/maze_extra.json`,
    detailPath: (ver, id, locale) => `/hsr/${ver}/${locale}/story/${id}.json`,
    idMin: 1000,
  },
  doom: {
    key: 'doom',
    label: '末日幻影',
    listPath: ver => `/hsr/${ver}/maze_boss.json`,
    detailPath: (ver, id, locale) => `/hsr/${ver}/${locale}/boss/${id}.json`,
    idMin: 1000,
  },
  peak: {
    key: 'peak',
    label: '异相仲裁',
    listPath: ver => `/hsr/${ver}/maze_peak.json`,
    detailPath: (ver, id, locale) => `/hsr/${ver}/${locale}/peak/${id}.json`,
    idMin: 0,
  },
}

function getCacheKey(path) {
  return `${JSON_CACHE_PREFIX}${path}`
}

function canUseStorage() {
  return typeof window !== 'undefined' && !!window.localStorage
}

function isJsonResponse(res) {
  const contentType = res.headers.get('content-type') || ''
  return contentType.includes('application/json') || contentType.includes('+json')
}

function readPersistentCache(path) {
  if (!canUseStorage()) return null
  try {
    const raw = window.localStorage.getItem(getCacheKey(path))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writePersistentCache(path, data) {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(getCacheKey(path), JSON.stringify(data))
  } catch {
    // 忽略缓存写入失败，避免影响正常展示
  }
}

export async function fetchJson(path, { signal, force = false } = {}) {
  if (!force && jsonMemoryCache.has(path)) return jsonMemoryCache.get(path)

  if (!force && jsonRequestCache.has(path)) return jsonRequestCache.get(path)

  const request = (async () => {
    if (typeof window === 'undefined') {
      throw new Error(`当前环境不支持读取本地静态数据：${path}`)
    }

    try {
      const local = await fetch(`/local-cache${path}`, { signal })
      if (!local.ok) throw new Error(`本地静态数据缺失：${path}`)
      if (!isJsonResponse(local)) throw new Error(`本地静态数据格式错误：${path}`)

      const data = await local.json()
      jsonMemoryCache.set(path, data)
      writePersistentCache(path, data)
      return data
    } catch (error) {
      if (signal?.aborted) throw error
      const cached = readPersistentCache(path)
      if (cached === null) throw error
      jsonMemoryCache.set(path, cached)
      return cached
    }
  })()

  jsonRequestCache.set(path, request)

  try {
    return await request
  } finally {
    jsonRequestCache.delete(path)
  }
}

export async function getManifest({ signal, force = false } = {}) {
  return await fetchJson('/manifest.json', { signal, force })
}

export async function getCachePlan(ver, { signal, force = false } = {}) {
  if (!ver) throw new Error('缺少 HSR 数据版本，无法读取 cache-plan')
  return await fetchJson(`/hsr/${ver}/cache-plan.json`, { signal, force })
}

export async function getHsrVersions({ signal, force = false } = {}) {
  const manifest = await getManifest({ signal, force })
  const hsr = manifest?.hsr
  if (!hsr?.latest) throw new Error('manifest.hsr.latest 不存在，无法确定数据版本')
  return {
    latest: hsr.latest,
    live: hsr.live || hsr.latest,
    available: Array.isArray(hsr.available) ? hsr.available : [],
  }
}

export function normalizeSeasonList(listJson, { idMin }) {
  const items = Object.entries(listJson || {})
    .map(([key, it]) => ({
      id: Number(it?.id ?? it?.Id ?? it?.ID ?? key),
      zh: stripRichText(it.zh ?? it.name ?? String(it.id ?? '')),
      en: stripRichText(it.en ?? ''),
      begin: it.begin ?? it.begin_time ?? '',
      end: it.end ?? it.end_time ?? '',
    }))
    .filter(it => Number.isFinite(it.id))
    .filter(it => it.id >= idMin)
    .sort((a, b) => a.id - b.id)

  return items
}

export function stripRichText(input) {
  return String(input ?? '')
    .replaceAll('\\n', '\n')
    .replace(/<unbreak>|<\/unbreak>/g, '')
    .replace(/<color=[^>]+>|<\/color>/g, '')
    .replace(/<u>|<\/u>/g, '')
    .replace(/<br\s*\/?>/g, '\n')
    .trim()
}

export function applyParams(desc, param = []) {
  let out = stripRichText(desc)
  out = out.replace(/#(\d+)\[i\]%/g, (_m, idx) => {
    const v = param[Number(idx) - 1]
    if (typeof v !== 'number') return ''
    const n = v * 100
    const s = Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '')
    return `${s}%`
  })
  out = out.replace(/#(\d+)\[i\]/g, (_m, idx) => {
    const v = param[Number(idx) - 1]
    if (v === undefined || v === null) return ''
    if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v)
    return String(v)
  })
  return out
}

export function formatEffects(entries = []) {
  return entries
    .filter(Boolean)
    .map(it => ({
      name: it.name ?? it.group_name ?? '',
      desc: applyParams(it.desc ?? '', it.param ?? it.param_fix ?? []),
    }))
    .filter(it => it.name || it.desc)
}

export function formatBossEffects(rootJson) {
  const main = rootJson?.buff ? [{ name: rootJson.buff?.name, desc: applyParams(rootJson.buff?.desc, rootJson.buff?.param) }] : []
  const l1 = formatEffects(rootJson?.buff_list1)
  const l2 = formatEffects(rootJson?.buff_list2)
  const l3 = formatEffects(rootJson?.buff_list3)
  return [...main, ...l1, ...l2, ...l3].filter(it => it.name || it.desc)
}

export function formatStoryEffects(rootJson) {
  const opts = formatEffects(rootJson?.option)
  const sub = formatEffects(rootJson?.sub_option)
  return [...opts, ...sub].filter(it => it.name || it.desc)
}
