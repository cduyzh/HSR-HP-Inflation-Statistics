import assert from 'node:assert/strict'
import test from 'node:test'
import { getSeasonComputed } from '../src/services/endgame.js'

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

test('虚构叙事最终阶段节点提取污染等级', async () => {
  const base = 'https://static.nanoka.cc'
  const ver = 'inv-test'
  const resources = new Map([
    [`${base}/hsr/${ver}/monster.json`, { 1001: { zh: '测试怪物', weak: [] } }],
    [`${base}/hsr/${ver}/monstervalue.json`, { 1001: { HPBase: 100, SpeedBase: 100, child: [] } }],
    [`${base}/hsr/${ver}/HardLevelGroup.json`, [{ HardLevelGroup: 1, Level: 1, HPRatio: 1 }]],
    [`${base}/hsr/${ver}/EliteGroup.json`, [{ EliteGroup: 1, HPRatio: 1 }]],
    [`${base}/hsr/${ver}/InfiniteEliteGroup.json`, []],
    [`${base}/hsr/${ver}/zh/story/2027.json`, {
      name: '取象为文',
      level: [
        { id: 1, name: '一' },
        { id: 2, name: '二' },
        { id: 3, name: '三' },
        {
          id: 4,
          name: '四',
          event_id_list1: [{
            level: 1,
            hard_level_group: 1,
            elite_group: 1,
            stage_id: 30325041,
            monster_list: [{ monster0: 1001 }],
          }],
          event_id_list2: [{
            level: 1,
            hard_level_group: 1,
            elite_group: 1,
            stage_id: 30325042,
            monster_list: [{ monster0: 1001 }],
            invasion: {
              level: 3,
              desc: '被污染的怪物获得了「贪饕」的力量，受到致命攻击后<color=#ff0000ff>不会被消灭</color>。\\n对其造成伤害可不断压制其生命上限。',
              maze_buff_id: 3034003,
              maze_buff_param: [0.65],
              monster_param: [0.6],
              monster_list: [{ unk_0: 300302007 }],
            },
          }],
        },
      ],
    }],
  ])

  globalThis.window = {
    localStorage: {
      getItem() {
        return null
      },
      setItem() {},
    },
  }
  globalThis.fetch = async path => {
    if (String(path).includes('/computed/')) return jsonResponse({}, false)
    const data = resources.get(String(path))
    if (data === undefined) throw new Error(`未期望的请求：${path}`)
    return jsonResponse(data)
  }

  const result = await getSeasonComputed('fiction', ver, 2027)
  const groups = result.stages[0].groups

  const side1 = groups.find(it => it.key === 'side1')
  const side2 = groups.find(it => it.key === 'side2')

  assert.equal(side1.invasion, null)
  assert.equal(side2.invasion.level, 3)
  assert.equal(
    side2.invasion.desc,
    '被污染的怪物获得了「贪饕」的力量，受到致命攻击后不会被消灭。\n对其造成伤害可不断压制其生命上限。',
  )
})
