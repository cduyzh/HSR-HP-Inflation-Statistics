# 项目总结（agents.md）

## 项目目标

本项目用于统计并可视化《崩坏：星穹铁道》终局内容（忘却之庭 / 虚构叙事 / 末日幻影 / 异相仲裁）不同期数的怪物血量膨胀趋势，并提供“单期详情”查看敌人节点、波次、怪物图片、弱点与血量构成。

## 深入文档

本文件是项目总览；细节按主题拆分在 `docs/agents/`（索引见 `docs/agents/README.md`）：

- `docs/agents/data-source.md`：数据源协议、缓存分层、版本策略、图片与富文本处理
- `docs/agents/statistics.md`：四模式统计口径、HP 公式、星启节点、无限波、赛季去重
- `docs/agents/ui-interaction.md`：路由、页面/组件职责、滚动与布局约束
- `docs/agents/workflow.md`：开发/测试/部署命令、排障手册、常见变更检查清单

改动代码时若涉及口径、协议或交互约束，请同步更新对应文档与本文件。

## 技术栈

- 前端：Vue 3（`<script setup>`）+ Vue Router 4
- 构建：Vite
- 图表：ECharts
- 包管理：pnpm
- Node：>= 24

## 数据来源与版本策略

- 统一数据源：`https://static.nanoka.cc`
- 页面所有 JSON 与怪物图片均由前端**直连数据源绝对地址**读取（数据源已开放 `Access-Control-Allow-Origin: *`）；本站不代理、不落盘、不随构建发布任何数据文件，以降低 Netlify 带宽与存储占用。轮播 banner 与 favicon 是本项目自有小体积资源，仍随构建发布。
- 版本策略：读取 `manifest.hsr.latest`；数据源不发布 `releaseId`，localStorage 缓存隔离回退为版本号。
- 数据源不发布 `cache-plan.json`：各模式当前赛季由期数索引去重后的最大 id 推导（`getCurrentSeasonIds()`）。
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
- 污染等级：`2026` 起事件对象带 `invasion`（`level / desc`），详情页在对应节点头部展示“污染 N 级”徽标与描述；仅提取展示字段，不影响 HP 口径。

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

- `DATA_SITE = 'https://static.nanoka.cc'`：所有 JSON 由 `fetchJson()` 直连该站点读取，并写入按版本号隔离的内存 + localStorage 缓存；请求失败时回退到上一次成功的本地缓存。
- 趋势和单期详情优先读取 `/hsr/<ver>/computed/endgame/*` 预计算文件（仅接受 `schemaVersion: 1` 且 `ver` 匹配）；当前数据源未发布该目录，全程回退到实时复算。
- 仓库不再保留本地 JSON 离线副本；`pnpm sync:data -- --download` 只用于排障。

### HP 计算与怪物信息

文件：`src/services/hpCalc.js`

- 读取数据表：`monster.json / monstervalue.json / HardLevelGroup.json / EliteGroup.json / InfiniteEliteGroup.json`
- HP 公式：`HPBase * HPModifyRatio * HardLevelRatio * EliteRatio`
- 多阶段血量：若 `monstervalue.json` 存在 `PhaseList`，总 HP 还要乘上所有 `phase_max_hp_ratio` 的和
- 怪物图片：直连数据源 `https://static.nanoka.cc/assets/hsr/monstermiddleicon/Monster_{id}.webp`，实例怪物 9 位 id 自动回退到基础 id；页面不请求其他第三方图片地址。
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

## 数据源远程协议（不落盘）

数据源：`https://static.nanoka.cc`（已开放跨域）。所有数据与图片直连读取，仓库不再保留本地副本，也不随构建发布。

### 路径协议

前端访问的都是数据源绝对地址（无 `/local-cache` 前缀）。

```text
https://static.nanoka.cc/
├── manifest.json
├── assets/hsr/monstermiddleicon/Monster_<id>.webp
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
    ├── computed/（数据源未发布，命中 404 后回退复算）
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

- `manifest.json`：版本索引；HSR 默认版本读取 `manifest.hsr.latest`；无 `releaseId`。
- `maze.json / maze_extra.json / maze_boss.json / maze_peak.json`：四种终局模式的期数索引；当前赛季取去重后的最大 id。
- `<locale>/maze|story|boss|peak/<id>.json`：单期详情，是上游原始详情结构镜像。
- `monster.json / monstervalue.json / HardLevelGroup.json / EliteGroup.json / InfiniteEliteGroup.json`：复算怪物 HP 所需的基础表。
- `assets/hsr/monstermiddleicon/Monster_<id>.webp`：怪物中图，页面图片直连地址。
- `computed/endgame/*`：可选预计算派生件；命中时优先消费（`schemaVersion: 1` 且 `ver` 匹配），缺失时回退实时复算。

模式映射：

- `moc`：索引 `maze.json`，详情 `<locale>/maze/<id>.json`
- `fiction`：索引 `maze_extra.json`，详情 `<locale>/story/<id>.json`
- `doom`：索引 `maze_boss.json`，详情 `<locale>/boss/<id>.json`
- `peak`：索引 `maze_peak.json`，详情 `<locale>/peak/<id>.json`

维护约束：

- 不要把本项目聚合后的 UI 数据写回数据源；详情 JSON 保持上游原始结构，聚合逻辑留在 `src/services/endgame.js`。
- 赛季索引、详情、怪物基础表与怪物图片都以数据源为唯一来源；当前项目不要单独向上游补数据。
- 不要把数据源 JSON 重新下载到 `public/` 发布；这会抵消直连改造带来的带宽收益。
- 数据源新增语言或赛季时，当前项目只运行 `pnpm sync:data` 校验协议。
- 下游项目若只需要最近赛季，按期数索引取去重后的最大 id；遍历全量赛季直接读期数索引。
- HP 复算必须同时考虑 `PhaseList.phase_max_hp_ratio` 多阶段倍率；不要只使用 `HPBase` 单段血量。

更新命令：

```bash
# 校验数据源协议，不写本地
pnpm sync:data:check

# 同样执行协议校验（不再复制到 public）
pnpm sync:data
```

可覆盖数据源地址或下载离线副本（仅排障）：

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
