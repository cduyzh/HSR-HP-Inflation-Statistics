import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

// 统一数据源：页面所有 JSON / 图片资源都直接请求该站点，不再经本站代理或落盘发布。
const DATA_SITE = String(process.env.HSR_DATA_SITE_URL || 'https://static.nanoka.cc').replace(/\/$/, '')
const REQUIRED_VERSION_FILES = [
  'character.json',
  'lightcone.json',
  'monster.json',
  'monstervalue.json',
  'HardLevelGroup.json',
  'EliteGroup.json',
  'InfiniteEliteGroup.json',
  'maze.json',
  'maze_extra.json',
  'maze_boss.json',
  'maze_peak.json',
]

// 数据源不再发布 cache-plan.json：当前赛季由期数索引推导（去重后的最大 id）。
const MODE_LIST_FILES = {
  moc: { file: 'maze.json', idMin: 1000 },
  fiction: { file: 'maze_extra.json', idMin: 1000 },
  doom: { file: 'maze_boss.json', idMin: 1000 },
  peak: { file: 'maze_peak.json', idMin: 0 },
}

function parseArgs(argv) {
  return {
    downloadDir: argv.includes('--download')
      ? path.resolve(argv[argv.indexOf('--download') + 1] || '.hsr-cache/shared-data')
      : null,
  }
}

async function fetchResource(relativePath) {
  const response = await fetch(`${DATA_SITE}${relativePath.startsWith('/') ? relativePath : `/${relativePath}`}`)
  if (!response.ok) throw new Error(`${relativePath} 请求失败：HTTP ${response.status}`)
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('json')) throw new Error(`${relativePath} 返回了非 JSON 内容`)
  return { text: await response.text(), contentType }
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

// 与前端 normalizeSeasonList + 赛季去重保持一致的口径，取最大 id 作为当前赛季。
function deriveCurrentSeasonId(listJson, { idMin }) {
  const items = Object.entries(listJson || {})
    .map(([key, it]) => ({
      id: Number(it?.id ?? it?.Id ?? it?.ID ?? key),
      zh: stripRichText(it.zh ?? it.name ?? String(it.id ?? '')),
      en: stripRichText(it.en ?? ''),
    }))
    .filter(it => Number.isFinite(it.id))
    .filter(it => it.id >= idMin)
    .sort((a, b) => a.id - b.id)

  const deduped = []
  for (const s of items) {
    const last = deduped[deduped.length - 1]
    const lastName = (last?.zh || last?.en || '').trim()
    const name = (s.zh || s.en || '').trim()
    if (last && lastName && name && lastName === name && Math.abs(s.id - last.id) <= 2) continue
    deduped.push(s)
  }

  return deduped.length ? deduped[deduped.length - 1].id : null
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const manifestResource = await fetchResource('manifest.json')
  const manifest = JSON.parse(manifestResource.text)
  const version = String(manifest?.hsr?.latest || '')
  const releaseId = String(manifest?.hsr?.releaseId || version)
  if (!version) throw new Error('共享 manifest.hsr.latest 不存在')

  const resources = new Map([['manifest.json', manifestResource.text]])
  for (const fileName of REQUIRED_VERSION_FILES) {
    const relativePath = `hsr/${version}/${fileName}`
    resources.set(relativePath, (await fetchResource(relativePath)).text)
  }

  const locale = 'zh'
  const currentSeasonIds = {}
  for (const [mode, { file, idMin }] of Object.entries(MODE_LIST_FILES)) {
    const listJson = JSON.parse(resources.get(`hsr/${version}/${file}`))
    const seasonId = deriveCurrentSeasonId(listJson, { idMin })
    if (seasonId === null) throw new Error(`无法从 ${file} 推导 ${mode} 当前赛季`)
    currentSeasonIds[mode] = seasonId
    const relativePath = `hsr/${version}/${locale}/${MODE_DETAIL_DIRS[mode]}/${seasonId}.json`
    resources.set(relativePath, (await fetchResource(relativePath)).text)
  }

  if (options.downloadDir) {
    for (const [relativePath, text] of resources) {
      const target = path.join(options.downloadDir, relativePath)
      await fs.mkdir(path.dirname(target), { recursive: true })
      await fs.writeFile(target, text.endsWith('\n') ? text : `${text}\n`)
    }
  }

  console.log(`数据站：${DATA_SITE}`)
  console.log(`release：${releaseId}`)
  console.log(`HSR 版本：${version}`)
  console.log(`当前赛季：${JSON.stringify(currentSeasonIds)}`)
  console.log(options.downloadDir ? `离线副本：${options.downloadDir}` : '协议校验完成，未复制到 public。')
}

const MODE_DETAIL_DIRS = { moc: 'maze', fiction: 'story', doom: 'boss', peak: 'peak' }

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
