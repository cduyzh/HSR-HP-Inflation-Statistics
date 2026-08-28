import fs from 'fs'
import path from 'path'
import { calcEventSide } from '../src/services/hpCalc.js'

// 与前端保持一致的统一数据源；审计产物仅写入 .hsr-cache/，不参与发布。
const DATA_SITE = String(process.env.HSR_DATA_SITE_URL || 'https://static.nanoka.cc').replace(/\/$/, '')
const OUTPUT_ROOT = path.join('.hsr-cache', 'audit')

function parseArgs(argv = []) {
  const options = {
    version: '',
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--ver' && argv[i + 1]) {
      options.version = String(argv[i + 1]).trim()
      i += 1
    }
  }

  return options
}

function stripRichText(input) {
  return String(input ?? '')
    .replaceAll('\\n', '\n')
    .replace(/<unbreak>|<\/unbreak>/g, '')
    .replace(/<color=[^>]+>|<\/color>/g, '')
    .replace(/<u>|<\/u>/g, '')
    .replace(/<br\s*\/?>/g, '\n')
    .trim()
}

function pickMocSeason(detail) {
  if (!Array.isArray(detail) || detail.length === 0) return null

  let index = detail.length - 1
  while (index >= 0) {
    const season = detail[index]
    const name = stripRichText(season?.name || season?.group_name || season?.zh || season?.en || '')
    if (name) break
    index -= 1
  }

  if (index < 0) index = detail.length - 1
  return detail[index] || null
}

function buildHardMap(rows = []) {
  return new Map(rows.map(row => [`${Number(row.HardLevelGroup)}:${Number(row.Level)}`, Number(row.HPRatio) || 1]))
}

function buildEliteMap(rows = []) {
  return new Map(rows.map(row => [Number(row.EliteGroup), Number(row.HPRatio) || 1]))
}

async function fetchJson(relativePath) {
  const response = await fetch(`${DATA_SITE}${relativePath.startsWith('/') ? relativePath : `/${relativePath}`}`)
  if (!response.ok) throw new Error(`${relativePath} 请求失败：HTTP ${response.status}`)
  return response.json()
}

async function getLatestVersion() {
  const manifest = await fetchJson('manifest.json')
  const version = String(manifest?.hsr?.latest || '')
  if (!version) throw new Error('manifest.hsr.latest 不存在')
  return version
}

async function getVersionContext(version) {
  const base = `hsr/${version}`
  const [monster, monstervalue, hardRows, eliteRows, infiniteEliteRows] = await Promise.all([
    fetchJson(`${base}/monster.json`),
    fetchJson(`${base}/monstervalue.json`),
    fetchJson(`${base}/HardLevelGroup.json`),
    fetchJson(`${base}/EliteGroup.json`),
    fetchJson(`${base}/InfiniteEliteGroup.json`),
  ])

  return {
    monster,
    monstervalue,
    hardMap: buildHardMap(hardRows),
    eliteMap: new Map([...buildEliteMap(eliteRows), ...buildEliteMap(infiniteEliteRows)]),
  }
}

export async function buildAudit(version) {
  const ctx = await getVersionContext(version)
  const mazeList = await fetchJson(`hsr/${version}/maze.json`)
  const seasonIds = Object.values(mazeList || {})
    .map(it => Number(it?.id))
    .filter(id => Number.isFinite(id) && id >= 1000)
    .sort((a, b) => a - b)
  const hits = []

  for (const seasonId of seasonIds) {
    let seasonList
    try {
      seasonList = await fetchJson(`hsr/${version}/zh/maze/${seasonId}.json`)
    } catch {
      continue
    }

    const season = pickMocSeason(seasonList)
    if (!season) continue

    for (const sideKey of ['event_id_list1', 'event_id_list2', 'event_id_list3']) {
      const events = season[sideKey] || []
      if (!events.length) continue

      const { waves } = calcEventSide(ctx, events)
      for (const wave of waves) {
        for (const monster of wave.monsters) {
          const hpMultiplier = Number(monster.hpMultiplier) || 1
          if (hpMultiplier <= 1) continue

          hits.push({
            seasonFile: seasonId,
            seasonId: Number(season.id) || 0,
            seasonName: season.name || '',
            side: sideKey,
            stageId: Number(wave.stageId) || 0,
            wave: Number(wave.waveIndex) || 0,
            monsterId: Number(monster.id) || 0,
            monsterName: monster.name || '',
            unitHp: Number(monster.unitHp) || 0,
            hpMultiplier,
            totalHp: Math.round((Number(monster.unitHp) || 0) * hpMultiplier * (Number(monster.count) || 1)),
          })
        }
      }
    }
  }

  return {
    version,
    mode: 'moc',
    generatedAt: new Date().toISOString(),
    totalHits: hits.length,
    seasonFiles: [...new Set(hits.map(hit => hit.seasonFile))],
    hits,
  }
}

export async function writeMocPhaseHpAudit(version) {
  const audit = await buildAudit(version)
  const outputPath = path.join(OUTPUT_ROOT, `moc-phase-hp-audit-${version}.json`)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8')
  return { audit, outputPath }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const version = options.version || (await getLatestVersion())
  const { audit, outputPath } = await writeMocPhaseHpAudit(version)
  console.log(`wrote ${outputPath}`)
  console.log(`totalHits=${audit.totalHits}`)
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main().catch(error => {
    console.error(error)
    process.exitCode = 1
  })
}
