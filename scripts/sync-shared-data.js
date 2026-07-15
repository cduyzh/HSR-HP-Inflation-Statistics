import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url))
const DEFAULT_SOURCE_ROOT = '/Users/hobby/Documents/hsr-endgame-竞速'
const REQUIRED_VERSION_FILES = [
  'cache-plan.json',
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
  const options = {
    sourceRoot: process.env.HSR_SHARED_DATA_ROOT || DEFAULT_SOURCE_ROOT,
    dryRun: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--source') options.sourceRoot = argv[i + 1] || options.sourceRoot
    if (arg === '--dry-run') options.dryRun = true
  }

  return options
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

async function assertFile(filePath, label) {
  const stat = await fs.stat(filePath).catch(() => null)
  if (!stat?.isFile()) throw new Error(`${label}不存在：${filePath}`)
}

async function assertDirectory(dirPath, label) {
  const stat = await fs.stat(dirPath).catch(() => null)
  if (!stat?.isDirectory()) throw new Error(`${label}不存在：${dirPath}`)
}

async function validateSource(sourceRoot) {
  const cacheRoot = path.join(sourceRoot, 'public', 'local-cache')
  const monsterAssetsRoot = path.join(sourceRoot, 'public', 'assets', 'hsr', 'monsters')
  const manifestPath = path.join(cacheRoot, 'manifest.json')

  await assertFile(manifestPath, '共享 manifest')
  await assertDirectory(monsterAssetsRoot, '共享怪物图片目录')

  const manifest = await readJson(manifestPath)
  const version = String(manifest?.hsr?.latest || '')
  if (!version) throw new Error('共享 manifest.hsr.latest 不存在')

  const versionRoot = path.join(cacheRoot, 'hsr', version)
  for (const fileName of REQUIRED_VERSION_FILES) {
    await assertFile(path.join(versionRoot, fileName), `共享版本文件 ${fileName}`)
  }

  const cachePlan = await readJson(path.join(versionRoot, 'cache-plan.json'))
  if (String(cachePlan?.version || '') !== version) {
    throw new Error(`cache-plan.version 与 manifest.hsr.latest 不一致：${cachePlan?.version} !== ${version}`)
  }

  const locale = String(cachePlan?.locale || 'zh')
  const modeDetails = {
    moc: 'maze',
    fiction: 'story',
    doom: 'boss',
    peak: 'peak',
  }
  for (const [mode, detailDir] of Object.entries(modeDetails)) {
    const seasonId = cachePlan?.currentSeasonIds?.[mode]
    if (seasonId === undefined || seasonId === null) throw new Error(`cache-plan.currentSeasonIds.${mode} 不存在`)
    await assertFile(
      path.join(versionRoot, locale, detailDir, `${seasonId}.json`),
      `${mode} 当前赛季详情`,
    )
  }

  const assetFiles = (await fs.readdir(monsterAssetsRoot)).filter(file => /^Monster_\d+\.webp$/i.test(file))
  if (!assetFiles.length) throw new Error(`共享怪物图片目录为空：${monsterAssetsRoot}`)

  return {
    cacheRoot,
    monsterAssetsRoot,
    version,
    locale,
    cachePlan,
    monsterAssetCount: assetFiles.length,
  }
}

async function replaceDirectory(sourceDir, targetDir) {
  const parentDir = path.dirname(targetDir)
  const tempDir = path.join(parentDir, `.${path.basename(targetDir)}.import-${process.pid}`)

  await fs.mkdir(parentDir, { recursive: true })
  await fs.rm(tempDir, { recursive: true, force: true })
  await fs.cp(sourceDir, tempDir, { recursive: true, force: true })
  await fs.rm(targetDir, { recursive: true, force: true })
  await fs.rename(tempDir, targetDir)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const sourceRoot = path.resolve(options.sourceRoot)
  if (sourceRoot === PROJECT_ROOT) throw new Error('共享数据源不能指向当前项目自身')

  const source = await validateSource(sourceRoot)
  const targetCacheRoot = path.join(PROJECT_ROOT, 'public', 'local-cache')
  const targetMonsterAssetsRoot = path.join(PROJECT_ROOT, 'public', 'assets', 'hsr', 'monsters')

  console.log(`共享数据源：${sourceRoot}`)
  console.log(`HSR 版本：${source.version}`)
  console.log(`当前赛季：${JSON.stringify(source.cachePlan.currentSeasonIds)}`)
  console.log(`怪物图片：${source.monsterAssetCount} 张`)

  if (options.dryRun) {
    console.log('校验完成，未写入当前项目。')
    return
  }

  await replaceDirectory(source.cacheRoot, targetCacheRoot)
  await replaceDirectory(source.monsterAssetsRoot, targetMonsterAssetsRoot)

  console.log(`已同步赛季与怪物数据：${targetCacheRoot}`)
  console.log(`已同步怪物图片：${targetMonsterAssetsRoot}`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
