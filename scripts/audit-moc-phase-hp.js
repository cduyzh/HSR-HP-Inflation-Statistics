import fs from 'fs'
import path from 'path'
import { calcEventSide } from '../src/services/hpCalc.js'

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

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function getLatestLocalVersion() {
  const manifest = loadJson(path.join('public', 'local-cache', 'manifest.json'))
  const version = String(manifest?.hsr?.latest || '')
  if (!version) throw new Error('public/local-cache/manifest.json 缺少 manifest.hsr.latest')
  return version
}

function getVersionContext(version) {
  const cacheRoot = path.join('public', 'local-cache', 'hsr', version)
  const monster = loadJson(path.join(cacheRoot, 'monster.json'))
  const monstervalue = loadJson(path.join(cacheRoot, 'monstervalue.json'))
  const hardRows = loadJson(path.join(cacheRoot, 'HardLevelGroup.json'))
  const eliteRows = loadJson(path.join(cacheRoot, 'EliteGroup.json'))
  const infiniteEliteRows = loadJson(path.join(cacheRoot, 'InfiniteEliteGroup.json'))

  return {
    monster,
    monstervalue,
    hardMap: buildHardMap(hardRows),
    eliteMap: new Map([...buildEliteMap(eliteRows), ...buildEliteMap(infiniteEliteRows)]),
  }
}

export function buildAudit(version) {
  const ctx = getVersionContext(version)
  const mazeDir = path.join('public', 'local-cache', 'hsr', version, 'zh', 'maze')
  const files = fs.readdirSync(mazeDir).filter(file => file.endsWith('.json')).sort((a, b) => Number(a) - Number(b))
  const hits = []

  for (const file of files) {
    const seasonList = loadJson(path.join(mazeDir, file))
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
            seasonFile: Number(file.replace('.json', '')),
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

export function writeMocPhaseHpAudit(version) {
  const audit = buildAudit(version)
  const outputPath = path.join('public', 'local-cache', 'hsr', version, 'moc-phase-hp-audit.json')
  fs.writeFileSync(outputPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8')
  return { audit, outputPath }
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  const version = options.version || getLatestLocalVersion()
  const { audit, outputPath } = writeMocPhaseHpAudit(version)
  console.log(`wrote ${outputPath}`)
  console.log(`totalHits=${audit.totalHits}`)
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main()
}
