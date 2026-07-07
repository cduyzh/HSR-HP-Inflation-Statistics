import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { writeMocPhaseHpAudit } from './audit-moc-phase-hp.js'

const BASE = 'https://static.nanoka.cc'
const OUT_DIR = path.resolve('public/local-cache')
const execFileAsync = promisify(execFile)

const MODE_CONFIG = {
  moc: {
    listFile: 'maze.json',
    detailDir: 'maze',
  },
  fiction: {
    listFile: 'maze_extra.json',
    detailDir: 'story',
  },
  doom: {
    listFile: 'maze_boss.json',
    detailDir: 'boss',
  },
  peak: {
    listFile: 'maze_peak.json',
    detailDir: 'peak',
  },
}

const BASE_TABLES = [
  'monster.json',
  'monstervalue.json',
  'HardLevelGroup.json',
  'EliteGroup.json',
  'InfiniteEliteGroup.json',
]

async function fetchText(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`请求失败：${res.status} ${res.statusText} ${url}`)
    return await res.text()
  } catch (error) {
    const { stdout } = await execFileAsync('curl', ['-L', '--fail', '--silent', '--show-error', url], {
      maxBuffer: 16 * 1024 * 1024,
    })
    if (stdout) return stdout
    throw error
  }
}

async function writeFile(relPath, text) {
  const filePath = path.join(OUT_DIR, relPath.replace(/^\/+/, ''))
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, text)
}

function toIds(input) {
  return String(input || '')
    .split(',')
    .map(v => Number(v.trim()))
    .filter(v => Number.isFinite(v))
}

function parseArgs(argv) {
  const out = {
    ver: '',
    locale: 'zh',
    includeLatest: true,
    moc: null,
    fiction: null,
    doom: null,
    peak: null,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--ver') out.ver = argv[i + 1] || ''
    if (arg === '--locale') out.locale = argv[i + 1] || 'zh'
    if (arg === '--include-latest') out.includeLatest = true
    if (arg === '--exclude-latest') out.includeLatest = false
    if (arg === '--moc') out.moc = toIds(argv[i + 1])
    if (arg === '--fiction') out.fiction = toIds(argv[i + 1])
    if (arg === '--doom') out.doom = toIds(argv[i + 1])
    if (arg === '--peak') out.peak = toIds(argv[i + 1])
  }

  return out
}

function normalizeIdsFromList(listJson) {
  return Object.entries(listJson || {})
    .map(([key, item]) => Number(item?.id ?? item?.Id ?? item?.ID ?? key))
    .filter(v => Number.isFinite(v))
    .sort((a, b) => a - b)
}

function uniqueSorted(ids = []) {
  return [...new Set(ids)].sort((a, b) => a - b)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const manifestText = await fetchText(`${BASE}/manifest.json`)
  await writeFile('manifest.json', manifestText)

  const manifest = JSON.parse(manifestText)
  const ver = args.ver || manifest?.hsr?.latest
  if (!ver) throw new Error('manifest.hsr.latest 不存在')

  for (const file of BASE_TABLES) {
    const relPath = `hsr/${ver}/${file}`
    const text = await fetchText(`${BASE}/${relPath}`)
    await writeFile(relPath, text)
  }

  const lists = {}
  const cachePlan = {
    version: ver,
    locale: args.locale,
    includeLatest: args.includeLatest,
    generatedAt: new Date().toISOString(),
    currentSeasonIds: {},
    cachedSeasonIds: {},
    listFiles: {},
  }

  for (const [modeKey, config] of Object.entries(MODE_CONFIG)) {
    const relListPath = `hsr/${ver}/${config.listFile}`
    const listText = await fetchText(`${BASE}/${relListPath}`)
    await writeFile(relListPath, listText)

    const listJson = JSON.parse(listText)
    const listIds = normalizeIdsFromList(listJson)
    const latestId = listIds[listIds.length - 1] || null
    const manualIds = args[modeKey]
    const selectedIds = uniqueSorted(
      Array.isArray(manualIds)
        ? manualIds
        : listIds.filter(id => (args.includeLatest ? true : id !== latestId)),
    )

    lists[modeKey] = { config, selectedIds, latestId }
    cachePlan.currentSeasonIds[modeKey] = latestId
    cachePlan.cachedSeasonIds[modeKey] = selectedIds
    cachePlan.listFiles[modeKey] = config.listFile
  }

  for (const [modeKey, info] of Object.entries(lists)) {
    const { detailDir } = info.config
    for (const id of info.selectedIds) {
      const relDetailPath = `hsr/${ver}/${args.locale}/${detailDir}/${id}.json`
      const detailText = await fetchText(`${BASE}/${relDetailPath}`)
      await writeFile(relDetailPath, detailText)
    }
  }

  await writeFile(`hsr/${ver}/cache-plan.json`, JSON.stringify(cachePlan, null, 2))
  const { audit, outputPath } = writeMocPhaseHpAudit(ver)

  console.log(`已写入：${OUT_DIR}`)
  console.log(`版本：${ver}`)
  console.log(`当前赛季：${JSON.stringify(cachePlan.currentSeasonIds)}`)
  console.log(`缓存赛季数：${JSON.stringify(Object.fromEntries(Object.entries(cachePlan.cachedSeasonIds).map(([key, value]) => [key, value.length])))}`)
  console.log(`忘却之庭多阶段 HP 审计：${outputPath}（${audit.totalHits} 条）`)
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
