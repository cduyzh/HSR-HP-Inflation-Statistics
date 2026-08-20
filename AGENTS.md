# 项目总结（agents.md）

## 项目目标

本项目用于统计并可视化《崩坏：星穹铁道》终局内容（忘却之庭 / 虚构叙事 / 末日幻影 / 异相仲裁）不同期数的怪物血量膨胀趋势，并提供“单期详情”查看敌人节点、波次、怪物图片、弱点与血量构成。

## 技术栈

- 前端：Vue 3（`<script setup>`）+ Vue Router 4
- 构建：Vite
- 图表：ECharts
- 包管理：pnpm
- Node：>= 24

## 数据来源与版本策略

- 统一数据源：`https://hsr-data-hub.netlify.app`
- 上游原始数据由 `hsr-data-hub` 抓取和发布；当前项目只消费 `/local-cache/*` 与 `/assets/hsr/*` 同源代理。
- 版本策略：读取 `manifest.hsr.latest` 与 `manifest.hsr.releaseId`；localStorage 缓存必须按 release 隔离。
- 本项目目的：统计最新数据，不做“版本差异比较”

## 模式与统计口径

### 忘却之庭（moc）

- 统计口径：仅统计最后一个关卡（最高难度层）
- 星启模式：从 `1033` 起存在。数据结构表现为“新增一个节点（节点3）”，应计入总量。
- 多阶段 HP：部分 boss 的真实总血量不只看单段 `HPBase`，还要乘上 `monstervalue.json` 里的 `PhaseList.phase_max_hp_ratio` 总和；例如 `1033` 的两个 boss 都是 `HP × 2`。

### 虚构叙事（fiction）

- 统计口径：仅统计最后阶段（阶段 4）
- 星启模式：从 `2024` 起存在。数据结构可能表现为阶段 4 后追加一个无名 `level`（仅有 `event_id_list / infinite_list / npc_monster_id_list`），应提升为“节点3”并计入总量。
- 无限波：星启虚构叙事的真实敌人列表以 `infinite_list*.monster_group_id_list` 为主；它会补充 `monster_list` 没有的敌人（例如 `8003060` 虚构集合体）。统计时应以无限波为主，并保底合并普通波里缺失的敌人，避免两类结构互相覆盖。

### 末日幻影（doom）

- 统计口径：仅统计最后阶段（阶段 4）
- 星启模式：从 `3018` 起存在。数据结构可能提供第 3 路（`event_id_list3`）；展示上命名为“星启模式”。
- 环境/赛季效果：存在与节点绑定的效果列表（`buff_list1/2/3`），在详情页按节点分栏展示。

### 异相仲裁（peak）

- 异相仲裁没有“阶段”概念，本项目按关卡拆分（包括 `pre_level`，以及 `boss_level=将杀王棋`、`boss_config.hard_name=将杀王棋·绝境`）。
- 不区分星启模式。
- 趋势口径：整期仲裁项总 HP 汇总。

## 名词定义（统一口径）

- 节点：代表几路（节点1/2/3）。星启模式本质是新增一路（新增一个节点）。
- 波次：每个节点内部的波次（波次 1/2/3...）。

## 核心实现概览

### 数据与缓存

文件：`src/services/hsrStatic.js`

- 默认读取同源 `/local-cache`并写入按 release 隔离的内存缓存；数据中心未发布完整文件时，Netlify 必须允许 `dist/local-cache` 静态副本优先，不得用上游 404 强制覆盖。
- 趋势和单期详情优先读取 `/hsr/<ver>/computed/endgame/*` 预计算文件；仅接受 `schemaVersion: 1` 且 `ver` 匹配的结果，否则回退到实时复算。
- 本地 JSON 仅作离线样本，不是生产真值。

### HP 计算与怪物信息

文件：`src/services/hpCalc.js`

- 读取数据表：`monster.json / monstervalue.json / HardLevelGroup.json / EliteGroup.json / InfiniteEliteGroup.json`
- HP 公式：`HPBase * HPModifyRatio * HardLevelRatio * EliteRatio`
- 多阶段血量：若 `monstervalue.json` 存在 `PhaseList`，总 HP 还要乘上所有 `phase_max_hp_ratio` 的和
- 怪物图片：使用从统一数据源导入的 `/assets/hsr/monsters/Monster_{id}.webp`，实例怪物 9 位 id 自动回退到基础 id；页面不直接请求第三方图片地址。
- 怪物数量：同一波次内相同怪物会聚合计数（显示 x2 / x3），总 HP = 单体 HP * 多阶段倍率 * count
- 虚构叙事无限波：`monster_group_id_list` 是统计主列表，普通 `monster_list` 只作为缺失怪物的兜底补充。

### 终局聚合与趋势

文件：`src/services/endgame.js`

- 忘却/虚构/末日：只取最终关卡（最终阶段）的总 HP
- 星启节点合并：当数据结构提供新增节点时，合并为节点3参与统计
- 赛季去重：当“名称相同且 id 差值 <= 2”时，保留更小 id，避免重复统计
- 预计算缺失时，趋势详情使用 6 路受控并发拉取与复算；返回顺序必须与赛季列表一致。

### UI 结构

- `src/views/HpTrendsPage.vue`：趋势页（看板 + 折线图 + 期数列表）
- `src/views/SeasonDetailPage.vue`：赛季详情页（效果 + 节点/波次怪物卡片）
- `src/components/MonsterList.vue`：节点/波次怪物卡片渲染（图片/弱点/HP/xN）

### 当前交互约束

- 顶部大区不再使用“随滚动自动收起”的交互；当前采用固定模式切换栏 + 普通文档流 banner 的结构，避免 PC 阅读区被大面积遮挡。
- 路由切换默认保持浏览器当前滚动位置：模式切换、进入详情、详情返回都不应把页面主动滚到顶部。
- `src/router/index.js` 的滚动策略当前按“返回 `false`，不接管滚动”维护；若后续调整，需要先验证趋势页与详情页的滚动连续性。
- 详情页加载态需要保留足够页面高度，避免页面瞬时变短导致浏览器把当前滚动值夹断。

### 组件布局约定

- `src/components/SegmentTabs.vue` 当前支持两种布局口径：
  - `layout="fill"`：用于短标签筛选项，按钮等宽铺满容器。
  - 默认 `rail`：用于长标签或关卡切换，优先保证单个按钮可读性。
- `rail` 模式在移动端保留横向滚动能力；在 PC 端优先换行，避免长中文标签彼此遮挡或压进相邻信息卡。
- 异相仲裁（`peak`）详情页的“关卡”切换按钮按长标签处理，桌面端应允许自动换行，不应为了单行展示牺牲可读性。

## 本地 JSON 预置（落盘）

目录：`public/local-cache/`

目的：保留协议说明与可选离线样本。生产数据来自 `hsr-data-hub`，路径结构保持兼容。

### 数据目录协议

部署后访问前缀为 `/local-cache/`，源码目录为 `public/local-cache/`。

```text
public/local-cache/
├── manifest.json
└── hsr/<ver>/
    ├── monster.json
    ├── monstervalue.json
    ├── HardLevelGroup.json
    ├── EliteGroup.json
    ├── InfiniteEliteGroup.json
    ├── maze.json
    ├── maze_extra.json
    ├── maze_boss.json
    ├── maze_peak.json
    ├── cache-plan.json
    ├── moc-phase-hp-audit.json
    ├── computed/
    │   └── endgame/
    │       ├── trends.json
    │       └── <locale>/<mode>/<id>.json
    └── <locale>/
        ├── maze/<id>.json
        ├── story/<id>.json
        ├── boss/<id>.json
        └── peak/<id>.json
```

核心入口：

- `manifest.json`：上游版本索引；HSR 默认版本读取 `manifest.hsr.latest`。
- `cache-plan.json`：本仓库落盘清单；记录 `version`、`locale`、`currentSeasonIds`、`cachedSeasonIds`、`listFiles`。
- `maze.json / maze_extra.json / maze_boss.json / maze_peak.json`：四种终局模式的期数索引。
- `<locale>/maze|story|boss|peak/<id>.json`：单期详情，是上游原始详情结构镜像。
- `monster.json / monstervalue.json / HardLevelGroup.json / EliteGroup.json / InfiniteEliteGroup.json`：复算怪物 HP 所需的基础表。
- `moc-phase-hp-audit.json`：忘却之庭多阶段 HP 命中审计，方便外部项目校验 `PhaseList` 对总血量的影响。
- `computed/endgame/trends.json`：按模式存放轻量趋势结果；根对象必须带 `schemaVersion / ver / releaseId / generatedAt`。
- `computed/endgame/<locale>/<mode>/<id>.json`：单期预计算结果，结构与 `getSeasonComputed()` 返回值一致，并附带 release 元数据。

模式映射：

- `moc`：索引 `maze.json`，详情 `<locale>/maze/<id>.json`
- `fiction`：索引 `maze_extra.json`，详情 `<locale>/story/<id>.json`
- `doom`：索引 `maze_boss.json`，详情 `<locale>/boss/<id>.json`
- `peak`：索引 `maze_peak.json`，详情 `<locale>/peak/<id>.json`

维护约束：

- 不要随意重命名这些 JSON 文件或详情目录；其他项目可按上述路径直接调取。
- 不要把本项目聚合后的 UI 数据写回详情 JSON；详情 JSON 应保持上游原始结构，聚合逻辑留在 `src/services/endgame.js`。
- 聚合结果只能作为独立 `computed/endgame/` 派生件发布，与原始 JSON 同 release 生成、校验和切换。
- 赛季索引、详情、怪物基础表与怪物图片都以 `hsr-data-hub` release 为唯一来源；当前项目不要单独向上游补数据。
- 新增语言、赛季或怪物图片时，在数据中心更新；当前项目只运行 `pnpm sync:data` 校验协议。
- 下游项目若只需要最近赛季，应读取 `cache-plan.json` 的 `currentSeasonIds`；若要遍历本地已有数据，应读取 `cachedSeasonIds`。
- HP 复算必须同时考虑 `PhaseList.phase_max_hp_ratio` 多阶段倍率；不要只使用 `HPBase` 单段血量。

更新命令：

```bash
# 校验数据站协议，不写 public
pnpm sync:data:check

# 同样执行协议校验
pnpm sync:data
```

可覆盖数据站地址或下载离线副本：

```bash
HSR_DATA_SITE_URL=https://example-data-site.netlify.app pnpm sync:data
pnpm sync:data -- --download .hsr-cache/shared-data
```

如需单独重跑审计：

```bash
pnpm audit:moc-phase-hp
```

## 开发命令

```bash
pnpm dev
pnpm build
pnpm preview
```
