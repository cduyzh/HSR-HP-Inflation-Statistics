import { fetchJson } from './hsrStatic.js'

const cache = new Map()

function toNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function buildHardLevelMap(rows = []) {
  const m = new Map()
  for (const r of rows) {
    const key = `${toNum(r.HardLevelGroup)}:${toNum(r.Level)}`
    m.set(key, toNum(r.HPRatio) || 1)
  }
  return m
}

function buildEliteMap(rows = []) {
  const m = new Map()
  for (const r of rows) {
    m.set(toNum(r.EliteGroup), toNum(r.HPRatio) || 1)
  }
  return m
}

function getValue(obj, key) {
  if (!obj) return undefined
  return obj[key] ?? obj[String(key)]
}

function buildUnknownIcon() {
  return 'assets/hsr/monstermiddleicon/Monster_Unknown.webp'
}

function normalizeMonsterKey(ctx, monsterId) {
  const id = toNum(monsterId)
  if (!id) return 0
  if (getValue(ctx.monstervalue, id) || getValue(ctx.monster, id)) return id
  const baseId = Math.floor(id / 100)
  if (getValue(ctx.monstervalue, baseId) || getValue(ctx.monster, baseId)) return baseId
  return id
}

function getMonsterValueRecord(ctx, monsterId) {
  const key = normalizeMonsterKey(ctx, monsterId)
  return getValue(ctx.monstervalue, key)
}

function getMonsterMetaRecord(ctx, monsterId) {
  const key = normalizeMonsterKey(ctx, monsterId)
  return getValue(ctx.monster, key)
}

function buildMonsterMiddleIcon(monsterId, fallback = '') {
  const raw = toNum(monsterId)
  const id = raw >= 1e8 ? Math.floor(raw / 100) : raw
  if (id) return `assets/hsr/monstermiddleicon/Monster_${id}.webp`
  return fallback || buildUnknownIcon()
}

function buildMonsterMiddleIconFromMeta(meta, monsterId) {
  const rawIcon = String(meta?.icon || '')
  const match = rawIcon.match(/Monster_(\d+)\.(?:png|webp)$/i)
  if (match?.[1]) return `assets/hsr/monstermiddleicon/Monster_${match[1]}.webp`
  return buildMonsterMiddleIcon(monsterId, buildUnknownIcon())
}

export async function getHpContext(ver, { signal, force = false } = {}) {
  if (!force && cache.has(ver)) return cache.get(ver)

  const promise = (async () => {
    const [monster, monstervalue, hardRows, eliteRows, infiniteEliteRows] = await Promise.all([
      fetchJson(`/hsr/${ver}/monster.json`, { signal, force }),
      fetchJson(`/hsr/${ver}/monstervalue.json`, { signal, force }),
      fetchJson(`/hsr/${ver}/HardLevelGroup.json`, { signal, force }),
      fetchJson(`/hsr/${ver}/EliteGroup.json`, { signal, force }),
      fetchJson(`/hsr/${ver}/InfiniteEliteGroup.json`, { signal, force }),
    ])

    const hardMap = buildHardLevelMap(hardRows)
    const eliteMap = new Map([...buildEliteMap(eliteRows), ...buildEliteMap(infiniteEliteRows)])

    return {
      ver,
      monster,
      monstervalue,
      hardMap,
      eliteMap,
    }
  })()

  cache.set(ver, promise)
  return promise
}

export function calcMonsterHp(ctx, monsterId, { level, hardLevelGroup, eliteGroup }) {
  const mv = getMonsterValueRecord(ctx, monsterId)
  const base = toNum(mv?.HPBase)
  const child = Array.isArray(mv?.child) ? mv.child : []
  const modify = toNum(child.find(c => toNum(c.Id) === toNum(monsterId))?.HPModifyRatio) || 1

  const hardRatio = ctx.hardMap.get(`${toNum(hardLevelGroup)}:${toNum(level)}`) || 1
  const eliteRatio = ctx.eliteMap.get(toNum(eliteGroup)) || 1

  return Math.round(base * modify * hardRatio * eliteRatio)
}

export function calcMonsterSpeed(ctx, monsterId) {
  const mv = getMonsterValueRecord(ctx, monsterId)
  const child = Array.isArray(mv?.child) ? mv.child.find(c => toNum(c.Id) === toNum(monsterId)) : null
  const base = toNum(mv?.SpeedBase)
  const ratio = toNum(child?.SpeedModifyRatio) || 1
  const bonus = toNum(child?.SpeedModifyValue)
  return Math.round(base * ratio + bonus)
}

export function calcMonsterHpMultiplier(ctx, monsterId) {
  const mv = getMonsterValueRecord(ctx, monsterId)
  const phases = Array.isArray(mv?.PhaseList) ? mv.PhaseList : []
  const total = phases.reduce((sum, phase) => sum + (toNum(phase?.phase_max_hp_ratio) || 0), 0)
  return total > 0 ? total : 1
}

function resolveInfiniteEliteGroup(ctx, eliteGroup, enabled) {
  const raw = toNum(eliteGroup)
  if (!enabled || !raw) return raw
  const mapped = raw + 296
  return ctx.eliteMap.has(mapped) ? mapped : raw
}

export function listWaveMonsters(wave, infiniteWave, { preferInfinite = false } = {}) {
  const infiniteMonsters = Array.isArray(infiniteWave?.monster_group_id_list)
    ? infiniteWave.monster_group_id_list.map(toNum).filter(Boolean)
    : []
  const waveMonsters = wave && typeof wave === 'object'
    ? Object.values(wave)
      .map(toNum)
      .filter(Boolean)
    : []
  if (!preferInfinite || !infiniteMonsters.length) return waveMonsters

  const merged = infiniteMonsters.slice()
  for (const monsterId of waveMonsters) {
    if (!merged.includes(monsterId)) merged.push(monsterId)
  }
  return merged
}

function getInfiniteWaveIndexes(infiniteList, stageId) {
  if (!infiniteList || typeof infiniteList !== 'object') return []
  const base = toNum(stageId) * 10
  return Object.keys(infiniteList)
    .map(toNum)
    .filter(id => id > base && Math.floor(id / 10) === toNum(stageId))
    .map(id => id - base)
    .filter(Boolean)
}

export function getMonsterInfo(ctx, monsterId) {
  const m = getMonsterMetaRecord(ctx, monsterId)
  const mv = getMonsterValueRecord(ctx, monsterId)
  const child = Array.isArray(mv?.child) ? mv.child.find(c => toNum(c.Id) === toNum(monsterId)) : null
  const spd = calcMonsterSpeed(ctx, monsterId)
  if (!m) return { id: monsterId, name: String(monsterId), icon: buildUnknownIcon(), weak: [], rank: '', spd }
  return {
    id: monsterId,
    name: m.zh || m.en || String(monsterId),
    icon: buildMonsterMiddleIconFromMeta(m, monsterId),
    weak: Array.isArray(child?.StanceWeakList) && child.StanceWeakList.length ? child.StanceWeakList : Array.isArray(m.weak) ? m.weak : [],
    resist: Array.isArray(m.resist) ? m.resist : [],
    rank: m.rank || '',
    spd,
  }
}

export function calcEventSide(ctx, events = [], { infiniteList, preferInfiniteMonsterList = false, preferInfiniteEliteGroup = false } = {}) {
  const waves = []
  let sideHp = 0

  for (const ev of events || []) {
    const level = toNum(ev.level)
    const hardLevelGroup = toNum(ev.hard_level_group)
    const stageId = toNum(ev.stage_id)
    const monsterList = Array.isArray(ev.monster_list) ? ev.monster_list : []
    const infiniteWaveIndexes = preferInfiniteMonsterList ? getInfiniteWaveIndexes(infiniteList, stageId) : []
    const waveCount = Math.max(monsterList.length, ...infiniteWaveIndexes)

    for (let i = 0; i < waveCount; i += 1) {
      const infiniteWave = getValue(infiniteList, stageId * 10 + (i + 1))
      const waveMonsters = listWaveMonsters(monsterList[i], infiniteWave, { preferInfinite: preferInfiniteMonsterList })
      const eliteGroupRaw =
        toNum(ev.elite_group) ||
        toNum(infiniteWave?.elite_group) ||
        toNum(infiniteWave?.EliteGroup) ||
        1
      const hpEliteGroup = resolveInfiniteEliteGroup(ctx, eliteGroupRaw, preferInfiniteEliteGroup)

      const monsterMap = new Map()
      let waveHp = 0

      for (const mid of waveMonsters) {
        const unitHp = calcMonsterHp(ctx, mid, { level, hardLevelGroup, eliteGroup: hpEliteGroup })
        const hpMultiplier = calcMonsterHpMultiplier(ctx, mid)
        waveHp += Math.round(unitHp * hpMultiplier)
        const prev = monsterMap.get(mid)
        if (prev) {
          prev.count += 1
          continue
        }
        monsterMap.set(mid, {
          ...getMonsterInfo(ctx, mid),
          unitHp,
          hpMultiplier,
          level,
          hardLevelGroup,
          eliteGroup: eliteGroupRaw,
          hpEliteGroup,
          count: 1,
        })
      }

      sideHp += waveHp
      const monsters = [...monsterMap.values()].sort((a, b) => (b.unitHp || 0) - (a.unitHp || 0))
      waves.push({ stageId, waveIndex: i + 1, eliteGroup: eliteGroupRaw, hpEliteGroup, waveHp, monsters })
    }
  }

  return { sideHp, waves }
}

export function mergeMonsterCounts(monsters = []) {
  const m = new Map()
  for (const it of monsters) {
    const key = it.id
    const count = toNum(it?.count) || 1
    const prev = m.get(key)
    if (!prev) {
      m.set(key, { ...it, count })
    } else {
      prev.count += count
    }
  }
  return [...m.values()].sort((a, b) => b.unitHp - a.unitHp)
}
