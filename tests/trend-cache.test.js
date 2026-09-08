import assert from 'node:assert/strict'
import test from 'node:test'
import { getTrend } from '../src/services/endgame.js'

const BASE = 'https://static.nanoka.cc'

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

function installStorage() {
  const store = new Map()
  globalThis.window = {
    localStorage: {
      getItem: key => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: key => store.delete(key),
      key: index => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size
      },
    },
  }
  return store
}

// 每期详情 = 1 个节点 1 波 1 只怪：100 * HPModifyRatio(1) * HPRatio(2) * Elite(3) = 600
function mocDetail(id) {
  return [{
    id: id * 10,
    name: `赛季 ${id}`,
    event_id_list1: [{
      level: 1,
      hard_level_group: 1,
      elite_group: 1,
      stage_id: id,
      monster_list: [{ 1: 1001 }],
    }],
  }]
}

function installFetch(log, ver) {
  const resources = new Map([
    [`${BASE}/hsr/${ver}/monster.json`, { 1001: { zh: '测试怪物', weak: [] } }],
    [`${BASE}/hsr/${ver}/monstervalue.json`, { 1001: { HPBase: 100, SpeedBase: 100, child: [] } }],
    [`${BASE}/hsr/${ver}/HardLevelGroup.json`, [{ HardLevelGroup: 1, Level: 1, HPRatio: 2 }]],
    [`${BASE}/hsr/${ver}/EliteGroup.json`, [{ EliteGroup: 1, HPRatio: 3 }]],
    [`${BASE}/hsr/${ver}/InfiniteEliteGroup.json`, []],
  ])

  globalThis.fetch = async url => {
    log.push(url)
    if (url === `${BASE}/hsr/${ver}/computed/endgame/trends.json`) return jsonResponse({}, false)
    if (resources.has(url)) return jsonResponse(resources.get(url))
    const detail = url.match(new RegExp(`^${BASE}/hsr/${ver}/zh/maze/(\\d+)\\.json$`))
    if (detail) return jsonResponse(mocDetail(Number(detail[1])))
    throw new Error(`未期望的请求：${url}`)
  }
}

function trendPath(ver, id) {
  return `${BASE}/hsr/${ver}/zh/maze/${id}.json`
}

test('趋势派生结果命中本地缓存时不再请求数据源', async () => {
  installStorage()
  const first = []
  installFetch(first, 'cached')
  const seasons = [{ id: 1, zh: '第一期' }, { id: 2, zh: '第二期' }]

  const initial = await getTrend('moc', 'cached', seasons)
  assert.deepEqual(initial.map(it => it.total), [600, 600])
  assert.equal(first.filter(url => url.includes('/zh/maze/')).length, 2)

  const second = []
  installFetch(second, 'cached')
  const replay = await getTrend('moc', 'cached', seasons)

  assert.deepEqual(replay, initial)
  assert.deepEqual(second, [])
})

test('部分命中时只复算缺失期数并保持请求顺序', async () => {
  installStorage()
  const warm = []
  installFetch(warm, 'partial')
  await getTrend('moc', 'partial', [{ id: 1 }, { id: 2 }])

  const log = []
  installFetch(log, 'partial')
  const result = await getTrend('moc', 'partial', [{ id: 3 }, { id: 1 }, { id: 2 }])

  assert.deepEqual(result.map(it => it.id), [3, 1, 2])
  assert.deepEqual(log.filter(url => url.includes('/zh/maze/')), [trendPath('partial', 3)])

  const progress = []
  await getTrend('moc', 'partial', [{ id: 3 }, { id: 4 }], { onProgress: p => progress.push(p) })
  assert.deepEqual(progress, [{ done: 1, total: 1, id: 4 }])
})

test('数据版本变化后趋势缓存失效并清理旧版本键', async () => {
  const store = installStorage()
  const oldLog = []
  installFetch(oldLog, 'v1')
  await getTrend('moc', 'v1', [{ id: 1 }])

  const trendKeys = () => Array.from(store.keys()).filter(k => k.startsWith('hsr-endgame:trend:'))
  assert.equal(trendKeys().length, 1)

  const v2Log = []
  installFetch(v2Log, 'v2')
  await getTrend('moc', 'v2', [{ id: 1 }])

  assert.deepEqual(v2Log.filter(url => url.includes('/zh/maze/')), [trendPath('v2', 1)])
  assert.deepEqual(trendKeys(), trendKeys().filter(k => k.includes(':v2:')))
})
