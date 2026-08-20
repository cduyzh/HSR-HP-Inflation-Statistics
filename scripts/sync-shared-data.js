import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const DATA_SITE = String(process.env.HSR_DATA_SITE_URL || 'https://hsr-data-hub.netlify.app').replace(/\/$/, '')
const REQUIRED_VERSION_FILES = [
  'cache-plan.json',
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

function parseArgs(argv) {
  return {
    downloadDir: argv.includes('--download')
      ? path.resolve(argv[argv.indexOf('--download') + 1] || '.hsr-cache/shared-data')
      : null,
  }
}

async function fetchResource(relativePath) {
  const response = await fetch(`${DATA_SITE}/local-cache/${relativePath.replace(/^\/+/, '')}`)
  if (!response.ok) throw new Error(`${relativePath} 请求失败：HTTP ${response.status}`)
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('json')) throw new Error(`${relativePath} 返回了非 JSON 内容`)
  return { text: await response.text(), contentType }
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

  const plan = JSON.parse(resources.get(`hsr/${version}/cache-plan.json`))
  const modeDetails = { moc: 'maze', fiction: 'story', doom: 'boss', peak: 'peak' }
  for (const [mode, detailDir] of Object.entries(modeDetails)) {
    const seasonId = plan?.currentSeasonIds?.[mode]
    if (seasonId === undefined || seasonId === null) throw new Error(`cache-plan.currentSeasonIds.${mode} 不存在`)
    const relativePath = `hsr/${version}/${plan.locale || 'zh'}/${detailDir}/${seasonId}.json`
    resources.set(relativePath, (await fetchResource(relativePath)).text)
  }

  if (options.downloadDir) {
    for (const [relativePath, text] of resources) {
      const target = path.join(options.downloadDir, 'local-cache', relativePath)
      await fs.mkdir(path.dirname(target), { recursive: true })
      await fs.writeFile(target, text.endsWith('\n') ? text : `${text}\n`)
    }
  }

  console.log(`数据站：${DATA_SITE}`)
  console.log(`release：${releaseId}`)
  console.log(`HSR 版本：${version}`)
  console.log(`当前赛季：${JSON.stringify(plan.currentSeasonIds)}`)
  console.log(options.downloadDir ? `离线副本：${options.downloadDir}` : '协议校验完成，未复制到 public。')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
