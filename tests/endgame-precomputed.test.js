import assert from 'node:assert/strict'
import test from 'node:test'
import { getSeasonComputed, getTrend } from '../src/services/endgame.js'

function jsonResponse(data, ok = true) {
  return {
    ok,
    headers: {
      get(name) {
        return name.toLowerCase() === 'content-type' ? 'application/json' : null
      },
    },
    async json() {
      return data
    },
  }
}

function installBrowser(fetchImpl) {
  globalThis.window = {
    localStorage: {
      getItem() {
        return null
      },
      setItem() {},
    },
  }
  globalThis.fetch = fetchImpl
}

test('getTrend 优先使用云端预计算结果并保持赛季顺序', async () => {
  const requested = []
  installBrowser(async path => {
    requested.push(path)
    return jsonResponse({
      schemaVersion: 1,
      ver: 'cloud-trend',
      releaseId: 'cloud-trend-release',
      generatedAt: '2026-07-22T00:00:00.000Z',
      modes: {
        moc: [
          { id: 1, label: '第一期', total: 100, isStar: false },
          { id: 2, label: '第二期', total: 200, isStar: false },
        ],
      },
    })
  })

  const result = await getTrend('moc', 'cloud-trend', [{ id: 2 }, { id: 1 }])

  assert.deepEqual(result.map(item => item.id), [2, 1])
  assert.deepEqual(requested, ['https://static.nanoka.cc/hsr/cloud-trend/computed/endgame/trends.json'])
})

test('getSeasonComputed 优先使用按赛季拆分的预计算结果', async () => {
  const requested = []
  const artifact = {
    schemaVersion: 1,
    ver: 'cloud-season',
    releaseId: 'cloud-season-release',
    generatedAt: '2026-07-22T00:00:00.000Z',
    modeKey: 'fiction',
    id: 2025,
    label: '测试赛季',
    isStar: true,
    effects: [],
    nodeEffects: null,
    stages: [],
  }
  installBrowser(async path => {
    requested.push(path)
    return jsonResponse(artifact)
  })

  const result = await getSeasonComputed('fiction', 'cloud-season', 2025)

  assert.equal(result, artifact)
  assert.deepEqual(requested, ['https://static.nanoka.cc/hsr/cloud-season/computed/endgame/zh/fiction/2025.json'])
})

test('预计算缺失时使用受控并发复算并保持输入顺序', async () => {
  let activeDetailRequests = 0
  let maxActiveDetailRequests = 0
  const base = 'https://static.nanoka.cc'
  const detailPrefix = `${base}/hsr/fallback/zh/maze/`

  const resources = new Map([
    [`${base}/hsr/fallback/monster.json`, { 1001: { zh: '测试怪物', weak: [] } }],
    [`${base}/hsr/fallback/monstervalue.json`, { 1001: { HPBase: 100, SpeedBase: 100, child: [] } }],
    [`${base}/hsr/fallback/HardLevelGroup.json`, [{ HardLevelGroup: 1, Level: 1, HPRatio: 2 }]],
    [`${base}/hsr/fallback/EliteGroup.json`, [{ EliteGroup: 1, HPRatio: 3 }]],
    [`${base}/hsr/fallback/InfiniteEliteGroup.json`, []],
  ])

  installBrowser(async path => {
    if (path === `${base}/hsr/fallback/computed/endgame/trends.json`) return jsonResponse({}, false)
    if (resources.has(path)) return jsonResponse(resources.get(path))
    if (!path.startsWith(detailPrefix)) throw new Error(`未期望的请求：${path}`)

    const id = Number(path.slice(detailPrefix.length).replace('.json', ''))
    activeDetailRequests += 1
    maxActiveDetailRequests = Math.max(maxActiveDetailRequests, activeDetailRequests)
    await new Promise(resolve => setTimeout(resolve, 10))
    activeDetailRequests -= 1

    return jsonResponse([{
      id: id * 10,
      name: `赛季 ${id}`,
      event_id_list1: [{
        level: 1,
        hard_level_group: 1,
        elite_group: 1,
        stage_id: id,
        monster_list: [{ 1: 1001 }],
      }],
    }])
  })

  const seasons = [
    { id: 3, zh: '第三期' },
    { id: 1, zh: '第一期' },
    { id: 2, zh: '第二期' },
  ]
  const result = await getTrend('moc', 'fallback', seasons)

  assert.deepEqual(result.map(item => item.id), [3, 1, 2])
  assert.deepEqual(result.map(item => item.total), [600, 600, 600])
  assert.ok(maxActiveDetailRequests > 1)
  assert.ok(maxActiveDetailRequests <= 6)
})
