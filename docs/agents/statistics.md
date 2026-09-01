# 统计口径与 HP 计算

核心文件：`src/services/hpCalc.js`（HP 公式与怪物信息）、`src/services/endgame.js`（关卡挑选与聚合）。

## 名词

- **节点**：代表几路（节点 1/2/3）。星启模式本质是新增一路（节点 3）。
- **波次**：节点内部的波次（波次 1/2/3...）。

## HP 公式

`calcMonsterHp()`（`src/services/hpCalc.js:98`）：

```text
单体 HP = round(HPBase × HPModifyRatio × HardLevelRatio × EliteRatio)
```

- `HPBase`：`monstervalue.json[id].HPBase`。
- `HPModifyRatio`：`monstervalue.json[id].child[]` 中 `Id === 实例id` 的条目；缺省 1。
- `HardLevelRatio`：`HardLevelGroup.json` 按 `HardLevelGroup:Level` 联合键查；缺省 1。
- `EliteRatio`：`EliteGroup.json` 与 `InfiniteEliteGroup.json` 合并后按 `EliteGroup` 查；缺省 1。

多阶段倍率（**必须计入**）：

```text
总 HP = 单体 HP × phaseMultiplier × count
phaseMultiplier = Σ PhaseList[].phase_max_hp_ratio（为 0 时按 1）
```

`calcMonsterHpMultiplier()`（`hpCalc.js:119`）。忘却之庭 `1033` 的两个 boss 即 `HP × 2`；可用 `pnpm audit:moc-phase-hp` 审计。

速度展示：`SpeedBase × SpeedModifyRatio + SpeedModifyValue`（`calcMonsterSpeed`，`hpCalc.js:110`）。

## 赛季列表与去重

- `normalizeSeasonList()`（`hsrStatic.js:144`）：按 `idMin` 过滤、按 id 升序，名称走 `stripRichText`。
- **赛季去重**（`dedupeCloseSeasonsByName`，`endgame.js:77`）：名称（清洗后）相同且 id 差 ≤ 2 时，保留更小 id。趋势与当前赛季推导共用同一去重。
- 当前赛季 = 去重后列表的最大 id（`getCurrentSeasonIds()`）。

## 星启模式

`isStarSeason()`（`endgame.js:69`）：

| 模式 | 星启起始 id | 表现 |
| --- | --- | --- |
| `moc` | ≥ 1033 | 新增节点 3 |
| `fiction` | ≥ 2024 | 阶段 4 后追加无名 level → 提升为节点 3 |
| `doom` | ≥ 3018 | 第 3 路 `event_id_list3`，展示名“星启模式” |
| `peak` | 不区分 | — |

## 关卡挑选（pickStages）

每个模式只统计“最终关卡/阶段”，但 peak 例外：

- **moc**（`pickMocStages`，`endgame.js:132`）：详情是数组，取**最后一个有名字的条目**；若其后紧跟无名条目且带 `event_id_list`，合并为 `event_id_list3 / infinite_list3`（星启节点）。
- **fiction / doom**（`pickStoryStages` / `pickBossStages`）：取 `level[3]`（阶段 4），不足 4 个时取最后一个；其后无名 level 同样合并为节点 3。fiction 额外保留 `maze_group_id3 / npc_monster_id_list3`，doom 额外保留 `damage_type3 / boss_monster_id3 / boss_monster_config3`。
- **peak**（`pickPeakStages`，`endgame.js:207`）：没有阶段概念，拆成多关卡——`pre_level[]` 逐项 + `boss_level`（将杀王棋）+ `boss_config`（将杀王棋·绝境，键 `boss_hard`）。

## 节点分组（buildStageGroups）

`endgame.js:293`：优先按 `event_id_list1/2/3 + infinite_list1/2/3` 组成 `side1 / side2 / side3`（doom 的 side3 展示名是“星启模式”）。若只有扁平 `event_id_list`：

- 含 ≥ 2 个不同 `stage_id` → 按 stage_id 拆成多个节点（或“追加轮次”）；
- 否则整体作为节点 1（或“追加轮次”）。

## 波次与怪物聚合（calcEventSide）

`hpCalc.js:178`，对每个节点的 events：

- 波次数 = `max(monster_list 长度, 无限波索引)`；无限波键为 `stageId × 10 + 波次号`。
- **同波次相同怪物聚合计数**（显示 x2 / x3），卡片按 `unitHp` 降序（`hpCalc.js:225`、`mergeMonsterCounts`）。
- 节点总 HP = 所有波次 `unitHp × phaseMultiplier` 之和。

### 虚构叙事无限波（重点）

`computeStage` 对 `fiction` 传 `preferInfiniteMonsterList: true`（`endgame.js:330`）：

- 敌人列表以 `infinite_list*.monster_group_id_list` 为主，再补入普通 `monster_list` 中无限波没有的怪物（`listWaveMonsters`，`hpCalc.js:133`）。不要只取其一——会漏掉 `8003060` 虚构集合体这类补充怪，或覆盖原始波次怪物。
- 精英组优先级：`event.elite_group` → `infiniteWave.elite_group`；且启用 `+296` 映射（`resolveInfiniteEliteGroup`，`hpCalc.js:126`）：若 `eliteGroup + 296` 在表中存在则用映射后的倍率。

### 污染等级（invasion）

虚构叙事 `2026` 起，节点事件对象带 `invasion` 字段（`{ level, desc, maze_buff_id, ... }`）。`computeStage` 通过 `pickInvasion`（`endgame.js`）取分组内第一个带 `invasion` 的事件，仅保留 `level` 与清洗后的 `desc` 挂到 `group.invasion`；无则为 `null`。`MonsterList` 在节点头部渲染“污染 N 级”徽标与描述。只提取展示所需字段，`maze_buff_param / monster_param / monster_list` 不进入 UI 数据。

## 趋势数值

`seasonTotalForTrend()`（`endgame.js:395`）：

- `peak`：整期所有关卡 `totalHp` 求和。
- 其他模式：只取最后一个（最终）阶段的 `totalHp`。

`getTrend()`（`endgame.js:400`）：优先预计算 `trends.json`（需覆盖全部赛季才采用）；回退时 6 路受控并发逐期复算，**返回顺序必须与输入赛季列表一致**。

## 效果来源（详情页展示）

`buildEffects()`（`endgame.js:249`）：

| 模式 | 整期效果 | 节点效果 |
| --- | --- | --- |
| `moc` | 数组首项 `group_name` + `desc/param` | 关卡 `tag_list` |
| `fiction` | `option` + `sub_option` | 关卡 `tag_list` |
| `doom` | `buff` | `buff_list1/2/3` 按节点分栏（`nodeEffects`） |
| `peak` | `boss_config.buff_list` | 关卡 `tag_list` |

## 修改口径时的硬性要求

- 改公式、星启阈值、无限波规则或预计算结构时：同步更新本文档、根 `AGENTS.md`、README 口径章节；必要时提升 `PRECOMPUTED_SCHEMA_VERSION`。
- 新增/改动口径后跑：`pnpm test:unit`、`pnpm audit:moc-phase-hp`，并抽查趋势页最大值与详情页节点 HP 之和一致。
