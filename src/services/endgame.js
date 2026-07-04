import { MODES, applyParams, fetchJson, formatEffects, formatStoryEffects, normalizeSeasonList, stripRichText } from './hsrStatic.js'
import { calcEventSide, getHpContext, mergeMonsterCounts } from './hpCalc.js'

function toNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function isStarSeason(modeKey, seasonId) {
  const id = toNum(seasonId)
  if (modeKey === 'moc') return id >= 1033
  if (modeKey === 'fiction') return id >= 2024
  if (modeKey === 'doom') return id >= 3018
  return false
}

function dedupeCloseSeasonsByName(seasons = []) {
  const sorted = seasons.slice().sort((a, b) => toNum(a?.id) - toNum(b?.id))
  const out = []

  for (const s of sorted) {
    const last = out[out.length - 1]
    if (
      last &&
      stripRichText(last.zh || last.en || '').trim() &&
      stripRichText(s.zh || s.en || '').trim() &&
      stripRichText(last.zh || last.en || '').trim() === stripRichText(s.zh || s.en || '').trim() &&
      Math.abs(toNum(s.id) - toNum(last.id)) <= 2
    ) {
      continue
    }
    out.push(s)
  }

  return out
}

export async function getSeasons(modeKey, ver, { starFilter = 'all', signal, force = false } = {}) {
  const mode = MODES[modeKey]
  if (!mode) throw new Error(`未知模式：${modeKey}`)

  const listJson = await fetchJson(mode.listPath(ver), { signal, force })
  const seasons = dedupeCloseSeasonsByName(normalizeSeasonList(listJson, { idMin: mode.idMin })).map(it => ({
    ...it,
    isStar: isStarSeason(modeKey, it.id),
  }))

  if (modeKey === 'peak') return seasons
  if (starFilter === 'star') return seasons.filter(it => it.isStar)
  if (starFilter === 'nostar') return seasons.filter(it => !it.isStar)
  return seasons
}

function pickMocStages(detail) {
  if (!Array.isArray(detail) || detail.length === 0) return []
  let index = detail.length - 1
  while (index >= 0) {
    const it = detail[index]
    const name = stripRichText(it?.name || it?.group_name || it?.zh || it?.en || '')
    if (name.trim()) break
    index -= 1
  }

  if (index < 0) index = detail.length - 1
  const it = detail[index]
  const extra = detail[index + 1]

  const raw = { ...(it || {}) }
  const extraName = stripRichText(extra?.name || extra?.group_name || extra?.zh || extra?.en || '')
  if (extra && !extraName.trim() && Array.isArray(extra?.event_id_list) && extra.event_id_list.length) {
    raw.event_id_list3 = extra.event_id_list
    raw.infinite_list3 = extra.infinite_list || {}
  }

  const stageName = stripRichText(it?.name || it?.group_name || it?.zh || it?.en || '')
  return [{
    key: String(it?.id ?? index),
    stageNo: index + 1,
    name: stageName ? stageName : `第 ${index + 1} 层`,
    raw,
  }]
}

function pickStoryStages(detail) {
  const levels = Array.isArray(detail?.level) ? detail.level : []
  const index = levels[3] ? 3 : levels.length - 1
  const it = levels[index]
  if (!it) return []
  const extra = levels[index + 1]
  const raw = { ...(it || {}) }
  const extraName = stripRichText(extra?.name || extra?.group_name || extra?.zh || extra?.en || '')
  if (extra && !extraName.trim() && Array.isArray(extra?.event_id_list) && extra.event_id_list.length) {
    raw.event_id_list3 = extra.event_id_list
    raw.infinite_list3 = extra.infinite_list || {}
  }
  return [{
    key: String(it.id ?? index),
    stageNo: index + 1,
    name: `阶段 ${index + 1}`,
    raw,
  }]
}

function pickBossStages(detail) {
  const levels = Array.isArray(detail?.level) ? detail.level : []
  const index = levels[3] ? 3 : levels.length - 1
  const it = levels[index]
  if (!it) return []
  const extra = levels[index + 1]
  const raw = { ...(it || {}) }
  const extraName = stripRichText(extra?.name || extra?.group_name || extra?.zh || extra?.en || '')
  if (extra && !extraName.trim() && Array.isArray(extra?.event_id_list) && extra.event_id_list.length) {
    raw.event_id_list3 = extra.event_id_list
    raw.infinite_list3 = extra.infinite_list || {}
    raw.damage_type3 = Array.isArray(extra?.damage_type) ? extra.damage_type : []
    raw.boss_monster_id3 = extra?.boss_monster_id ?? null
    raw.boss_monster_config3 = extra?.boss_monster_config || null
  }
  return [{
    key: String(it.id ?? index),
    stageNo: index + 1,
    name: `阶段 ${index + 1}`,
    raw,
  }]
}

function pickPeakStages(detail) {
  const out = []
  const list = Array.isArray(detail?.pre_level) ? detail.pre_level : []
  for (let i = 0; i < list.length; i += 1) {
    const it = list[i]
    out.push({
      key: String(it.id ?? i),
      stageNo: i + 1,
      name: stripRichText(it.name ? String(it.name) : `关卡 ${i + 1}`),
      raw: it,
    })
  }

  if (detail?.boss_level) {
    out.push({
      key: String(detail.boss_level?.id ?? 'boss'),
      stageNo: out.length + 1,
      name: stripRichText(detail.boss_level?.name || '将杀王棋'),
      raw: detail.boss_level,
    })
  }

  if (detail?.boss_config?.event_id_list) {
    out.push({
      key: 'boss_hard',
      stageNo: out.length + 1,
      name: stripRichText(detail.boss_config?.hard_name || '将杀王棋·绝境'),
      raw: detail.boss_config,
    })
  }

  return out
}

function pickStages(modeKey, detail) {
  if (modeKey === 'moc') return pickMocStages(detail)
  if (modeKey === 'fiction') return pickStoryStages(detail)
  if (modeKey === 'doom') return pickBossStages(detail)
  if (modeKey === 'peak') return pickPeakStages(detail)
  return []
}

function buildEffects(modeKey, detail) {
  if (modeKey === 'moc') {
    const first = Array.isArray(detail) ? detail[0] : null
    if (!first) return []
    const name = first.group_name || first.name || '本期效果'
    const desc = applyParams(first.desc || '', first.param || [])
    return [{ name, desc }].filter(it => it.name || it.desc)
  }

  if (modeKey === 'fiction') return formatStoryEffects(detail)
  if (modeKey === 'doom') {
    const main = detail?.buff ? [{ name: detail.buff?.name, desc: applyParams(detail.buff?.desc, detail.buff?.param) }] : []
    return [...main].filter(it => it.name || it.desc)
  }

  if (modeKey === 'peak') {
    return []
  }

  return []
}

function buildStageEffects(raw = {}) {
  return formatEffects(raw?.tag_list)
}

function flatMonstersFromWaves(waves = []) {
  const out = []
  for (const w of waves) {
    for (const m of w.monsters || []) out.push(m)
  }
  return out
}

function addStageGroup(groups, key, name, events, infiniteList) {
  if (!Array.isArray(events) || events.length === 0) return
  groups.push({
    key,
    name,
    events,
    infiniteList: infiniteList && typeof infiniteList === 'object' ? infiniteList : {},
  })
}

function buildStageGroups(modeKey, raw = {}) {
  const groups = []
  addStageGroup(groups, 'side1', '节点 1', raw.event_id_list1, raw.infinite_list1)
  addStageGroup(groups, 'side2', '节点 2', raw.event_id_list2, raw.infinite_list2)
  addStageGroup(groups, 'side3', modeKey === 'doom' ? '星启模式' : '节点 3', raw.event_id_list3, raw.infinite_list3)

  const extraEvents = Array.isArray(raw.event_id_list) ? raw.event_id_list : []
  if (extraEvents.length) {
    const stageIds = [...new Set(extraEvents.map(it => toNum(it?.stage_id)).filter(Boolean))]
    if (stageIds.length >= 2) {
      for (let i = 0; i < stageIds.length; i += 1) {
        const sid = stageIds[i]
        const events = extraEvents.filter(it => toNum(it?.stage_id) === sid)
        const key = groups.length === 0 ? `node${i + 1}` : `extra${i + 1}`
        const name = groups.length === 0 ? `节点 ${i + 1}` : `追加轮次 ${i + 1}`
        addStageGroup(groups, key, name, events, raw.infinite_list)
      }
    } else {
      const fallbackKey = groups.length === 0 ? 'node1' : 'extra'
      const fallbackName = groups.length === 0 ? '节点 1' : '追加轮次'
      addStageGroup(groups, fallbackKey, fallbackName, extraEvents, raw.infinite_list)
    }
  }
  return groups
}

function buildSeasonLabel(modeKey, seasonId, detail, effects) {
  if (modeKey === 'peak') return stripRichText(detail?.name || effects?.[0]?.name || `异相仲裁 #${seasonId}`)

  const seasonName = stripRichText(detail?.name || detail?.group_name || detail?.zh || detail?.en || '')
  if (seasonName) return seasonName

  return stripRichText(effects?.[0]?.name || `${MODES[modeKey]?.label || modeKey} #${seasonId}`)
}

function computeStage(modeKey, ctx, stage) {
  const raw = stage.raw || {}
  const groups = buildStageGroups(modeKey, raw).map(group => ({
    ...group,
    ...calcEventSide(ctx, group.events, { infiniteList: group.infiniteList }),
  }))

  const side1 = groups.find(it => it.key === 'side1') || { sideHp: 0, waves: [] }
  const side2 = groups.find(it => it.key === 'side2') || { sideHp: 0, waves: [] }
  const extras = groups.filter(it => it.key !== 'side1' && it.key !== 'side2' && it.key !== 'side3')
  const allMonsters = groups.flatMap(it => flatMonstersFromWaves(it.waves))

  return {
    key: stage.key,
    stageNo: stage.stageNo,
    name: stage.name,
    groups,
    effects: buildStageEffects(raw),
    side1,
    side2,
    extraHp: extras.reduce((sum, it) => sum + (it.sideHp || 0), 0),
    totalHp: groups.reduce((sum, it) => sum + (it.sideHp || 0), 0),
    monsters1: mergeMonsterCounts(flatMonstersFromWaves(side1.waves)),
    monsters2: mergeMonsterCounts(flatMonstersFromWaves(side2.waves)),
    monsters: mergeMonsterCounts(allMonsters),
  }
}

export async function getSeasonComputed(modeKey, ver, seasonId, { locale = 'zh', signal, force = false } = {}) {
  const mode = MODES[modeKey]
  if (!mode) throw new Error(`未知模式：${modeKey}`)

  const ctx = await getHpContext(ver, { signal, force })
  const detail = await fetchJson(mode.detailPath(ver, seasonId, locale), { signal, force })
  const stages = pickStages(modeKey, detail)
  const effects = buildEffects(modeKey, detail)
  const computedStages = stages.map(stage => computeStage(modeKey, ctx, stage))

  const nodeEffects =
    modeKey === 'doom'
      ? {
          side1: formatEffects(detail?.buff_list1),
          side2: formatEffects(detail?.buff_list2),
          side3: formatEffects(detail?.buff_list3),
        }
      : null

  return {
    modeKey,
    ver,
    id: toNum(seasonId),
    label: buildSeasonLabel(modeKey, seasonId, detail, effects),
    isStar: isStarSeason(modeKey, seasonId),
    effects,
    nodeEffects,
    stages: computedStages,
  }
}

function seasonTotalForTrend(modeKey, stages = []) {
  if (modeKey === 'peak') return stages.reduce((sum, stage) => sum + (stage.totalHp || 0), 0)
  return stages[stages.length - 1]?.totalHp || 0
}

export async function getTrend(modeKey, ver, seasons, { signal, onProgress, force = false } = {}) {
  const list = Array.isArray(seasons) ? seasons : []
  const ctx = await getHpContext(ver, { signal, force })
  const mode = MODES[modeKey]

  const items = []
  for (let i = 0; i < list.length; i += 1) {
    const season = list[i]
    const id = toNum(season?.id ?? season)
    const detail = await fetchJson(mode.detailPath(ver, id, 'zh'), { signal, force })
    const stages = pickStages(modeKey, detail)
    const computedStages = stages.map(stage => computeStage(modeKey, ctx, stage))

    items.push({
      id,
      label: stripRichText(season?.zh || season?.en || String(id)),
      total: seasonTotalForTrend(modeKey, computedStages),
      isStar: isStarSeason(modeKey, id),
    })
    onProgress?.({ done: i + 1, total: list.length, id })
  }

  return items
}
