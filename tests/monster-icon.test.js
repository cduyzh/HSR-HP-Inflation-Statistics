import assert from 'node:assert/strict'
import test from 'node:test'
import { getMonsterInfo } from '../src/services/hpCalc.js'

function makeCtx(monster) {
  const monstervalue = {}
  for (const id of Object.keys(monster)) {
    monstervalue[id] = { HPBase: 100, SpeedBase: 100, child: [] }
  }
  return { monster, monstervalue, hardMap: new Map(), eliteMap: new Map() }
}

test('怪物中图解析：数字 / Unknown / 回退', () => {
  const ctx = makeCtx({
    8003060: { zh: '虚构集合体', icon: 'SpriteOutput/BattleEventIcon/Monster_Unknown.png', weak: [] },
    5013090: { zh: '破晓战队', icon: 'SpriteOutput/BattleEventIcon/Monster_Unknown.png', weak: [] },
    1004010: { zh: '虫群', icon: 'SpriteOutput/MonsterIcon/Monster_1004010.png', weak: [] },
    4012010: { zh: '无图标字段怪物', weak: [] },
  })

  assert.equal(
    getMonsterInfo(ctx, 8003060).icon,
    'https://static.nanoka.cc/assets/hsr/monstermiddleicon/Monster_Unknown.webp',
  )
  assert.equal(
    getMonsterInfo(ctx, 5013090).icon,
    'https://static.nanoka.cc/assets/hsr/monstermiddleicon/Monster_Unknown.webp',
  )
  assert.equal(
    getMonsterInfo(ctx, 1004010).icon,
    'https://static.nanoka.cc/assets/hsr/monstermiddleicon/Monster_1004010.webp',
  )
  // 无 icon 字段时按 id 推导基础中图
  assert.equal(
    getMonsterInfo(ctx, 4012010).icon,
    'https://static.nanoka.cc/assets/hsr/monstermiddleicon/Monster_4012010.webp',
  )
})
